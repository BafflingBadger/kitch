/**
 * Username rules for the settings form.
 *
 * These mirror what `User_AfterInsert` does when it derives a username at
 * signup -- NFKD normalize, lowercase, strip anything non-alphanumeric, cap the
 * length -- so a hand-picked username can never take a shape the generated ones
 * cannot, and both sides agree on what `users_username_lower_key` will collide.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

/** Coerces free text into the only shape the column accepts. */
export function normalizeUsername(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, MAX_USERNAME_LENGTH);
}

/**
 * Returns an error message, or null when the value is usable. Same shape as
 * `validateEmail` / `validatePassword` in `lib/auth/validation.ts`.
 *
 * Takes the raw input rather than the normalized one so it can tell someone
 * their spaces and punctuation were dropped, instead of silently accepting
 * something different from what they typed.
 */
export function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please choose a username.";

  const normalized = normalizeUsername(trimmed);

  if (normalized.length < MIN_USERNAME_LENGTH) {
    return `Usernames must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `Usernames can be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (normalized !== trimmed.toLowerCase()) {
    return "Usernames can only contain letters and numbers.";
  }

  return null;
}
