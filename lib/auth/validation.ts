/**
 * Client-side validation for the auth forms.
 *
 * The forms set `noValidate` so the browser's own constraint bubbles never
 * appear -- every message the user sees is rendered by us, in the card, in the
 * app's own styling. Constraint attributes (`required`, `type="email"`) stay on
 * the inputs for assistive tech, but no longer drive any visible UI.
 */

export const MIN_PASSWORD_LENGTH = 6;

/** Deliberately permissive: the real check is whether the mail is deliverable. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your email address.";
  if (!isValidEmail(trimmed)) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(
  value: string,
  { emptyMessage = "Please enter your password." } = {},
): string | null {
  if (!value) return emptyMessage;
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
