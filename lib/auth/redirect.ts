export const DEFAULT_AUTH_REDIRECT = "/cookbooks";

/**
 * Normalises a `next` query param into a path we are willing to redirect to.
 * Anything that could leave the site -- absolute URLs, and the
 * protocol-relative `//host` / `/\host` forms -- falls back to the default.
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_AUTH_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_AUTH_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AUTH_REDIRECT;
  }
  return value;
}

/**
 * Reads the `next` query param at call time, on the client.
 *
 * Deliberately not read from a server component's `searchParams`: doing that
 * forces a Suspense boundary around the form, and a boundary whose fallback is
 * the form itself mounts two stateful copies of it.
 */
export function readNextFromLocation(): string {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT;
  return safeRedirectPath(
    new URLSearchParams(window.location.search).get("next"),
  );
}
