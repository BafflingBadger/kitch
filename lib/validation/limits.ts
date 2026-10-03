/**
 * Upper bounds for user-entered text and lists, checked in the server actions.
 *
 * Server actions are public endpoints -- the UI's own limits don't bind a caller
 * who posts to them directly -- so these are the real caps. They are generous on
 * purpose: they exist to stop junk rows and runaway payloads, not to constrain
 * anyone typing a real recipe.
 */
export const LIMITS = {
  recipeName: 200,
  recipeNotes: 10_000,
  /** One ingredient or direction line. */
  recipeLine: 2_000,
  /** Ingredient or direction rows in one recipe. */
  recipeRows: 300,
  cookbookTitle: 100,
  displayName: 60,
  groceryItem: 200,
  groceryBatch: 200,
  /** Ids in one request (recipes in a cookbook, cookbooks for a recipe). */
  idList: 2_000,
  importImages: 20,
  importUrl: 2_000,
  /** RFC 5321's limit on a forward path. */
  email: 254,
} as const;

/** Whether `value` is an array of positive integer ids no longer than the cap. */
export function isIdList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= LIMITS.idList &&
    value.every((id) => Number.isInteger(id) && id > 0)
  );
}
