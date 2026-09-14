// Shared class recipes for the auth screens. Kept in one place so the login,
// sign-up, forgot-password and update-password cards stay identical.
//
// Note these use `rounded-xl` rather than the `rounded-full` pills the rest of
// the app favours -- that comes from the login design.

export const authInputClassName =
  "autofill-cream h-12 rounded-xl border-kitch-charcoal/10 bg-kitch-cream px-4 text-base text-kitch-charcoal shadow-none placeholder:text-kitch-grey/70 focus-visible:border-kitch-red/40 focus-visible:ring-2 focus-visible:ring-kitch-red/20 md:text-sm";

export const authPrimaryButtonClassName =
  "h-12 w-full rounded-xl bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60";

export const authSecondaryButtonClassName =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-kitch-charcoal/10 bg-white text-sm font-medium text-kitch-charcoal transition-colors hover:bg-kitch-cream disabled:opacity-60";

export const authLinkClassName =
  "font-semibold text-kitch-red transition-colors hover:text-kitch-red/80 hover:underline";
