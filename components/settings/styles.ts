// Shared class recipes for the settings page.
//
// `autofill-cream` is the important part: Chrome repaints autofilled inputs
// with its own near-black background, which reads as a broken field against the
// cream palette. The class (defined in app/globals.css) overrides it with an
// inset shadow, the same fix the auth screens use.

export const settingsInputClassName =
  "autofill-cream h-11 rounded-full border-kitch-charcoal/15 bg-kitch-cream px-4 text-kitch-charcoal placeholder:text-kitch-grey";
