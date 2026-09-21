"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { SettingsLabel, SettingsSection } from "@/components/settings/settings-section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import { settingsInputClassName } from "@/components/settings/styles";

const outlineButtonClassName =
  "rounded-full border border-kitch-charcoal/15 bg-white px-4 text-sm font-medium text-kitch-charcoal shadow-sm hover:bg-kitch-cream-dark hover:text-kitch-charcoal";

/** GoTrue error codes arrive on `code`; older responses only carry a message. */
function errorCode(error: unknown): string | null {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" ? code : null;
}

/**
 * Supabase's raw messages here are aimed at developers ("A nonce is required"),
 * so the ones a user can actually act on get rewritten.
 */
function describePasswordError(error: { message: string }) {
  switch (errorCode(error)) {
    case "otp_expired":
      return "That code has expired. Send a new one to try again.";
    case "same_password":
      return "Your new password must be different from your current one.";
    case "over_email_send_rate_limit":
      return "Too many codes requested. Wait a minute and try again.";
    default:
      // weak_password and friends already explain themselves usefully.
      return error.message;
  }
}

export function AccountSecuritySection({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean;
}) {
  const router = useRouter();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  // Set once GoTrue asks for a nonce, which it only does for sessions older
  // than 24 hours. Most people never see this step.
  const [needsNonce, setNeedsNonce] = useState(false);
  const [nonce, setNonce] = useState("");
  const [nonceNotice, setNonceNotice] = useState<string | null>(null);
  const [nonceSending, setNonceSending] = useState(false);
  // Shown when the code can't be emailed -- signing in again clears the same
  // window, so the user is never left without a way through.
  const [signInFallback, setSignInFallback] = useState(false);
  // `hasPassword` is derived from the account's identities on the server, and
  // setting a password does not necessarily add one -- so remember that we just
  // set it rather than waiting for a refresh that may never reflect it.
  const [passwordJustSet, setPasswordJustSet] = useState(false);

  const accountHasPassword = hasPassword || passwordJustSet;

  const [loggingOut, setLoggingOut] = useState(false);

  const handleChangeEmail = async () => {
    const validationError = validateEmail(newEmail);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setEmailError(null);
    setEmailSending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      // GoTrue verifies the link itself and then redirects here, so this points
      // straight at the page rather than at /auth/confirm.
      { emailRedirectTo: `${window.location.origin}/settings` },
    );

    setEmailSending(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    setEmailSentTo(newEmail.trim());
    setNewEmail("");
    setEmailDialogOpen(false);
  };

  /**
   * Emails a one-time code. Redeeming it mints a new session, refreshing the
   * `amr` timestamp -- the same mechanism the delete flow uses, so both
   * destructive actions ask for the same thing in the same way.
   */
  const sendCode = async () => {
    setNonceSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setNonceSending(false);

    if (error) {
      setSignInFallback(true);
      setNeedsNonce(false);
      setPasswordError(null);
      return false;
    }

    setSignInFallback(false);
    setNeedsNonce(true);
    setNonce("");
    setNonceNotice(`We emailed a 6-digit code to ${email}. Enter it to confirm.`);
    return true;
  };

  const handleUpdatePassword = async () => {
    const validationError = validatePassword(password, {
      emptyMessage: "Please enter a new password.",
    });
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Those passwords don't match.");
      return;
    }

    setPasswordError(null);
    setSignInFallback(false);
    setPasswordSaving(true);
    const supabase = createClient();

    // Always confirm by emailed code, rather than skipping it for a recently
    // authenticated session. Predictable beats optimal here: one ritual every
    // time is easier to trust than a prompt that appears only sometimes.
    //
    // Client-side by necessity -- updateUser talks straight to GoTrue, so
    // unlike account deletion there is no server-side chokepoint to enforce
    // this at. "Require reauthentication when changing password" is the
    // backstop that does hold against a caller who skips this UI.
    if (!needsNonce) {
      await sendCode();
      setPasswordSaving(false);
      return;
    }

    // Redeem the code first; that refreshes the session the update runs under.
    if (needsNonce) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: nonce.trim(),
        type: "email",
      });
      if (verifyError) {
        setPasswordSaving(false);
        setPasswordError(
          errorCode(verifyError) === "otp_expired"
            ? "That code has expired. Send a new one to try again."
            : "That code isn't right. Check it, or send a new one.",
        );
        return;
      }
    }

    // The same call both changes an existing password and sets a first one on an
    // account that signed up with Google or Apple, so there is nothing to branch
    // on here -- only the wording above differs.
    const { error } = await supabase.auth.updateUser({ password });

    if (!error) {
      setPasswordSaving(false);
      setPassword("");
      setConfirmPassword("");
      setNonce("");
      setNeedsNonce(false);
      setNonceNotice(null);
      setPasswordSaved(true);
      setPasswordJustSet(true);
      router.refresh();
      return;
    }

    // Belt and braces: if GoTrue still wants reauthentication despite the check
    // above, route it through the same code flow rather than a dead end.
    const code = errorCode(error);
    if (code === "reauthentication_needed" || code === "reauth_nonce_missing") {
      setPasswordError(null);
      await sendCode();
      setPasswordSaving(false);
      return;
    }

    setPasswordSaving(false);
    setPasswordError(describePasswordError(error));
  };

  const handleSignInAgain = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login?next=/settings";
  };

  const handleLogOutEverywhere = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    // Full reload rather than a client transition, so no settings state --
    // half-typed passwords included -- survives into the next session.
    window.location.href = "/auth/login";
  };

  return (
    <SettingsSection
      id="account"
      icon={ShieldCheck}
      title="Account & Security"
      description="Manage your login credentials and account access."
    >
      <div className="flex flex-col gap-3">
        <SettingsLabel>Email Address</SettingsLabel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-kitch-charcoal">{email}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmailError(null);
              setEmailDialogOpen(true);
            }}
            disabled={!accountHasPassword}
            className={outlineButtonClassName}
          >
            Change email
          </Button>
        </div>
        {accountHasPassword ? null : (
          <p className="text-sm text-kitch-grey">
            Set a password below before changing your email. Changing your email
            will disconnect your Google and Apple account.
          </p>
        )}
        {emailSentTo ? (
          <p className="text-sm text-kitch-grey">
            Check the inbox for {email} — we sent a confirmation there. The
            change to {emailSentTo} takes effect once you confirm it.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-kitch-charcoal/10 pt-6">
        <SettingsLabel htmlFor="new-password">
          {accountHasPassword ? "Change Password" : "Set a Password"}
        </SettingsLabel>

        <div className="grid gap-3 sm:grid-cols-2">
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordSaved(false);
            }}
            className="h-11 rounded-full"
          />
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setPasswordSaved(false);
            }}
            className="h-11 rounded-full"
          />
        </div>

        {signInFallback ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream/60 p-4">
            <p className="text-sm text-kitch-charcoal">
              We couldn&apos;t email a confirmation code. Sign in again to
              confirm this change.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleSignInAgain}
              className={outlineButtonClassName}
            >
              Sign in again
            </Button>
          </div>
        ) : null}

        {needsNonce ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream/60 p-4">
            <SettingsLabel htmlFor="reauth-nonce">Confirmation Code</SettingsLabel>
            {nonceNotice ? (
              <p className="text-sm text-kitch-grey">{nonceNotice}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="reauth-nonce"
                value={nonce}
                onChange={(event) => setNonce(event.target.value)}
                placeholder="Enter code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                className={`${settingsInputClassName} w-40`}
              />
              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  void sendCode();
                }}
                disabled={nonceSending}
                className="text-sm font-semibold text-kitch-red transition-colors hover:text-kitch-red/80 disabled:opacity-60"
              >
                {nonceSending ? "Sending…" : "Send a new code"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          {passwordError ? (
            <p className="mr-auto text-sm text-kitch-red">{passwordError}</p>
          ) : null}
          {passwordSaved && !passwordError ? (
            <p className="text-sm text-kitch-grey">Password updated</p>
          ) : null}
          <Button
            type="button"
            onClick={handleUpdatePassword}
            disabled={
              passwordSaving ||
              !password ||
              !confirmPassword ||
              (needsNonce && !nonce.trim())
            }
            className="rounded-full bg-kitch-charcoal px-5 text-sm font-semibold text-white shadow-sm hover:bg-kitch-charcoal/90 disabled:opacity-40"
          >
            {passwordSaving ? "Saving…" : "Update Password"}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-kitch-charcoal/10 pt-6">
        <div>
          <p className="text-sm font-semibold text-kitch-charcoal">
            Log out of all devices
          </p>
          <p className="text-sm text-kitch-grey">
            Ends every active session, including this one.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogOutEverywhere}
          disabled={loggingOut}
          className={outlineButtonClassName}
        >
          {loggingOut ? "Logging out…" : "Log out everywhere"}
        </Button>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">Change email</DialogTitle>
            <DialogDescription>
              We&apos;ll send a confirmation link to {email}. The change takes
              effect once you confirm it there.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-kitch-charcoal/10 bg-kitch-cream/60 p-4 text-sm text-kitch-charcoal">
            Once confirmed, any Google or Apple accounts connected to your old
            address are disconnected, and you&apos;ll sign in with your email and
            password. You can reconnect them afterwards by signing in with an
            account that uses your new address.
          </div>

          <div className="flex flex-col gap-2">
            <SettingsLabel htmlFor="new-email">New Email Address</SettingsLabel>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="you@example.com"
              className={settingsInputClassName}
            />
            {emailError ? (
              <p className="text-sm text-kitch-red">{emailError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              className="border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleChangeEmail}
              disabled={emailSending || !newEmail.trim()}
              className="bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-white shadow-sm hover:opacity-90"
            >
              {emailSending ? "Sending…" : "Send confirmation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
