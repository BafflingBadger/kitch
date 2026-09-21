"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsLabel, SettingsSection } from "@/components/settings/settings-section";
import { settingsInputClassName } from "@/components/settings/styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount } from "@/app/(dashboard)/settings/actions";

/** Sentinel `deleteAccount` returns when the database refuses a stale session. */
const REAUTH_REQUIRED = "reauthentication_required";

/** What the dialog is currently asking for. */
type Stage = "confirm" | "code" | "signin";

export function DangerZoneSection({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("confirm");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, startWorking] = useTransition();

  useEffect(() => {
    if (open) return;
    setStage("confirm");
    setConfirmation("");
    setCode("");
    setError(null);
  }, [open]);

  /**
   * Emails a one-time code. Redeeming it mints a new session, which is what
   * refreshes the `amr` timestamp `assert_recent_auth()` reads -- so it clears
   * the same gate a fresh sign-in would, without signing the user out.
   */
  const sendCode = async () => {
    setCodeSending(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setCodeSending(false);

    if (otpError) {
      // Falling back rather than stranding them: signing in again clears the
      // same gate, just less pleasantly.
      setStage("signin");
      setError(null);
      return;
    }

    setStage("code");
    setError(null);
  };

  /**
   * First step: always ask for an emailed code, rather than attempting the
   * delete and only asking when the database refuses. The server-side gate in
   * `assert_recent_auth()` is unchanged and remains the real boundary -- this
   * just makes the ritual the same every time instead of depending on how
   * recently the user happened to sign in.
   */
  const runDelete = () => {
    setError(null);
    startWorking(async () => {
      await sendCode();
    });
  };

  /** Redeems the code, then immediately retries the delete it was blocking. */
  const handleConfirmCode = () => {
    setError(null);
    startWorking(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });

      if (verifyError) {
        setError(
          (verifyError as { code?: string }).code === "otp_expired"
            ? "That code has expired. Send a new one to try again."
            : "That code isn't right. Check it, or send a new one.",
        );
        return;
      }

      const result = await deleteAccount();
      if (result.ok) {
      // Full reload, not router.push: a client transition leaves the /settings
      // segment in Next's router cache, so this dialog -- still open, with a
      // code typed into it -- came back when the next person signed in. Same
      // workaround the sidebar uses for the same cache behaviour.
        window.location.href = "/auth/login";
        return;
      }

      setError(
        result.error === REAUTH_REQUIRED
          ? "That didn't clear the security check. Try signing in again."
          : result.error,
      );
    });
  };

  const handleSignInAgain = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload for the same reason as above -- the dialog must not survive
    // into whoever signs in next.
    window.location.href = "/auth/login?next=/settings";
  };

  return (
    <SettingsSection
      id="danger"
      icon={AlertTriangle}
      title="Danger Zone"
      description="These actions are permanent. Proceed with caution."
      tone="danger"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-kitch-red/20 bg-kitch-red/5 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-kitch-red">Delete account</p>
          <p className="text-sm text-kitch-red/80">
            Permanently delete your account and all your recipes, cookbooks, and
            data.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-kitch-red px-5 text-sm font-semibold text-white shadow-sm hover:bg-kitch-red/90"
        >
          Delete account
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">Delete your account?</DialogTitle>
            <DialogDescription>
              This removes your profile, recipes, cookbooks, meal plan, and
              grocery list. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {stage === "confirm" ? (
            <div className="flex flex-col gap-2">
              <SettingsLabel htmlFor="delete-confirmation">
                Type {username} to confirm
              </SettingsLabel>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={username}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={settingsInputClassName}
              />
            </div>
          ) : null}

          {stage === "code" ? (
            <div className="flex flex-col gap-2">
              <SettingsLabel htmlFor="delete-code">Confirmation Code</SettingsLabel>
              <p className="text-sm text-kitch-grey">
                For your security, we emailed a 6-digit code to {email}. Enter it
                to confirm this deletion.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="delete-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  className={`${settingsInputClassName} w-40`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    void sendCode();
                  }}
                  disabled={codeSending || isWorking}
                  className="text-sm font-semibold text-kitch-red transition-colors hover:text-kitch-red/80 disabled:opacity-60"
                >
                  {codeSending ? "Sending…" : "Send a new code"}
                </button>
              </div>
            </div>
          ) : null}

          {stage === "signin" ? (
            <p className="text-sm text-kitch-charcoal">
              For your security, sign in again before deleting your account.
            </p>
          ) : null}

          {error ? <p className="text-sm text-kitch-red">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-kitch-charcoal/10 bg-white text-kitch-charcoal shadow-none hover:bg-kitch-cream-dark hover:text-kitch-charcoal"
            >
              Cancel
            </Button>

            {stage === "signin" ? (
              <Button
                type="button"
                onClick={handleSignInAgain}
                className="bg-kitch-charcoal text-white shadow-sm hover:bg-kitch-charcoal/90"
              >
                Sign in again
              </Button>
            ) : (
              <Button
                type="button"
                onClick={stage === "code" ? handleConfirmCode : runDelete}
                // Typing the username only guards against misclicks -- it is on
                // screen, so it proves nothing. The real gate is the freshness
                // check inside assert_recent_auth().
                disabled={
                  isWorking ||
                  codeSending ||
                  (stage === "confirm" &&
                    confirmation.trim().toLowerCase() !== username) ||
                  (stage === "code" && !code.trim())
                }
                className="bg-kitch-red text-white shadow-sm hover:bg-kitch-red/90 disabled:opacity-40"
              >
                {isWorking ? "Deleting…" : "Delete account"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
