import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@4.14.4"

interface reqPayload {
  transactionID: string;
  newUserID: string;
  forceTransfer: boolean;
}

const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID")!
const APPLE_ISSUER_ID = Deno.env.get("APPLE_ISSUER_ID")!
const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  try {
    const { transactionID, newUserID, forceTransfer }: reqPayload = await req.json();

    if (!transactionID || !newUserID) {
      return new Response(JSON.stringify({ error: "Missing required arguments" }), { status: 400 })
    }

    // The subscription may only be moved onto the caller's own account.
    // `verify_jwt` proves the caller is *someone*; without this, any signed-in
    // user holding a transaction id could send `forceTransfer: true` and move
    // that subscription onto an account of their choosing.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
    const { data: callerData, error: callerError } = await supabase.auth.getUser(token)
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }
    if (callerData.user.id.toLowerCase() !== newUserID.toLowerCase()) {
      console.error(`Rejected transfer to ${newUserID} requested by ${callerData.user.id}`)
      return new Response(
        JSON.stringify({ error: "forbidden", message: "You can only transfer a subscription to your own account." }),
        { headers: { "Content-Type": "application/json" }, status: 403 }
      )
    }

    // 1️⃣ Generate Apple Server JWT Token
    const formattedKey = APPLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    const privateKey = await importPKCS8(formattedKey, "ES256")
    const jwt = await new SignJWT({ bid: "Maxwell-Rex.Recipe-App" })
      .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
      .setIssuer(APPLE_ISSUER_ID)
      .setIssuedAt()
      .setExpirationTime("5m")
      .setAudience("appstoreconnect-v1")
      .sign(privateKey)

    // 2️⃣ Fetch transaction details from Apple (handling Sandbox fallback seamlessly)
    const prodUrl = `https://api.storekit.apple.com/inApps/v1/transactions/${transactionID}`;
    const sandboxUrl = `https://api.storekit-sandbox.apple.com/inApps/v1/transactions/${transactionID}`;
    
    let appleResponse = await fetch(prodUrl, { headers: { Authorization: `Bearer ${jwt}` } });
    if (!appleResponse.ok) {
      appleResponse = await fetch(sandboxUrl, { headers: { Authorization: `Bearer ${jwt}` } });
    }

    if (!appleResponse.ok) {
      const text = await appleResponse.text()
      console.error(`Apple rejected transaction validation lookup. Status: ${appleResponse.status}. Details: ${text}`)
      return new Response(JSON.stringify({ error: `Apple API Rejected Request. Status: ${appleResponse.status}. Details: ${text}` }), { status: 400 })
    }

    const appleData = await appleResponse.json()
    const payload = JSON.parse(atob(appleData.signedTransactionInfo.split(".")[1]))

    const { originalTransactionId, productId, expiresDate, revocationDate } = payload

    // Check if this specific subscription is already owned by someone else
    // Occurs when someone tries to purchase on an iPhone that was used previously to purchase for another Kitch account
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("original_transaction_id", originalTransactionId)
      .maybeSingle()

    if (existingSubscription && existingSubscription.user_id !== newUserID && !forceTransfer) {
      let linkedEmail = "another account";
      
      // Use Service Role privileges to look up the original user's email address
      const { data: userData } = await supabase.auth.admin.getUserById(existingSubscription.user_id)
      
      if (userData?.user?.email) {
        // Helper function to obscure the email (e.g., johndoe@gmail.com -> j******e@gmail.com)
        function maskEmail(email: string): string {
          const [local, domain] = email.split("@");
          if (!local || !domain) return "an***@***.com";
          if (local.length <= 2) return `${local[0]}*@${domain}`;
          return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
        }

        linkedEmail = maskEmail(userData.user.email)
      }

      console.log(`New user ID: ${newUserID}. Existing user ID: ${existingSubscription.user_id}`)
      
      return new Response(
        JSON.stringify({
          error: "subscription_already_linked",
          message: "This subscription is already linked to another profile.",
          linked_email: linkedEmail
        }),
        { 
          headers: { "Content-Type": "application/json" }, 
          status: 400 
        }
      )
    }

    // 3️⃣ Determine active status
    const expiration = expiresDate ? Number(expiresDate) : null
    let status = "inactive"
    if (revocationDate) {
      status = "revoked"
    } else if (expiration && expiration > Date.now()) {
      status = "active"
    } else {
      status = "expired"
    }

    // Clear out any old rows pointing to this original transaction ID across all users
    const { error: deleteError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("original_transaction_id", originalTransactionId)

    if (deleteError) {
      throw new Error(`Failed to remove old subscription link: ${deleteError.message}`)
    }

    // 4️⃣ Execute the Transfer via database upsert
    // Because original_transaction_id is a UNIQUE column, this query overwrites the 
    // old user_id record completely, severing the link to the original account profile.
    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: newUserID.toLowerCase(),
        original_transaction_id: originalTransactionId,
        product_id: productId,
        status,
        expiration_date: expiration ? new Date(expiration).toISOString() : null,
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      throw new Error(`Failed to assign subscription to new profile: ${insertError.message}`)
    }

    // 5️⃣ Bring the family along. Seats and pending invites point at the owner's
    // user id, so on a Family plan they would otherwise stay behind on the old
    // account and every member would lose Premium. The function is a no-op
    // unless this was a Family subscription.
    const previousUserID = existingSubscription?.user_id
    if (previousUserID && previousUserID !== newUserID.toLowerCase()) {
      const { data: seatsMoved, error: familyError } = await supabase.rpc("family_transfer_owner", {
        p_from: previousUserID,
        p_to: newUserID.toLowerCase(),
      })

      // Not fatal: the subscription itself has already moved, and failing the
      // request now would tell the app the transfer didn't happen. Logged with
      // both ids so it can be rerun by hand.
      if (familyError) {
        console.error(
          `Family transfer failed from ${previousUserID} to ${newUserID}: ${familyError.message}`
        )
      } else if (seatsMoved) {
        console.log(`Moved ${seatsMoved} family seat(s) from ${previousUserID} to ${newUserID}`)
      }
    }

    return new Response(JSON.stringify({ success: true, transferredTo: newUserID }), { status: 200 })

  } catch (error) {
    console.error(error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
});