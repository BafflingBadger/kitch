/**
 * Picks an ingredient's image keyword without AI. A port of the iOS app's
 * `IngredientKeywords.swift`, so web and iOS pick the same keyword for the same
 * line: keep the two in step when either changes.
 *
 * The keywords, their images and their aliases come from the
 * `ingredient_keywords` table (see `getIngredientKeywords()` in ./server.ts).
 * Matching:
 * 1. Rules: the longest keyword or alias found in the line, so "chicken broth"
 *    beats "chicken".
 * 2. Generic: "canned", "packet" or "bottled" items.
 * Otherwise null, which iOS shows as the "unknown" image.
 *
 * The web shows no ingredient images; it matches on save so the keywords it
 * writes are the ones iOS would pick. Pure and dependency-free.
 */

export interface IngredientKeywordRow {
  keyword: string;
  image_name: string;
  aliases: string[];
}

type Phrase = { tokens: string[]; keyword: string };

export interface IngredientVocabulary {
  /** keyword -> image name (the iOS asset) */
  images: Map<string, string>;
  /** Longest first. */
  phrases: Phrase[];
}

// Words that say how much or how it's prepared, never what it is
const IGNORED_WORDS = new Set([
  // units
  "cup", "c", "tablespoon", "tbsp", "tbs", "tbl", "tb", "teaspoon", "tsp", "t", "ounce", "oz",
  "pound", "lb", "lbs", "gram", "g", "kilogram", "kg", "milliliter", "millilitre", "ml", "liter",
  "litre", "l", "pint", "pt", "quart", "qt", "gallon", "gal", "pinch", "dash", "handful", "bunch",
  "sprig", "stalk", "stick", "head", "slice", "piece", "fillet", "filet", "strip",
  "inch", "cm", "large", "medium", "small", "extra", "jumbo", "heaping", "level", "scant", "few",
  "some", "about", "approximately", "plus", "more", "half", "quarter", "whole", "x",
  // preparation and state
  "chopped", "finely", "roughly", "coarsely", "thinly", "thickly", "diced", "minced", "sliced",
  "grated", "shredded", "crushed", "ground", "peeled", "seeded", "cored", "trimmed", "halved",
  "quartered", "cubed", "cut", "pieces", "julienned", "mashed", "melted", "softened",
  "room", "temperature", "cold", "warm", "chilled", "frozen", "thawed", "fresh",
  "freshly", "dried", "dry", "toasted", "roasted", "cooked", "uncooked", "raw", "rinsed",
  "drained", "washed", "packed", "lightly", "loosely", "firmly", "beaten", "whisked",
  "divided", "optional", "taste", "needed", "serve", "serving", "garnish", "for", "to", "of",
  "the", "a", "an", "and", "or", "as", "at", "in", "on", "with", "into", "your", "favorite",
  "good", "quality", "best", "boneless", "skinless", "bone", "skin", "organic", "unsalted",
  "low", "sodium", "reduced", "fat", "free", "light", "lean",
]);

const GENERIC: { words: string[]; keyword: string }[] = [
  { words: ["can", "canned", "tin", "tinned"], keyword: "canned item" },
  { words: ["packet", "package", "pkg", "envelope", "sachet", "box"], keyword: "packet item" },
  { words: ["bottle", "bottled", "jar", "jarred"], keyword: "bottled item" },
];

// Good enough singulars: both sides of every comparison go through the same rule
function singular(word: string): string {
  if ([...word].length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries
  if (word === "leaves") return "leaf";
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes
  if (word.endsWith("ches") || word.endsWith("shes") || word.endsWith("sses")) {
    return word.slice(0, -2); // peaches, radishes
  }
  if (word.endsWith("ss") || word.endsWith("us") || word.endsWith("is")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * Lowercased, de-accented words of the ingredient's name, singular, with the
 * measurement, anything in brackets, numbers, units and preparation words removed.
 */
export function tokenize(desc: string, measurement?: string | null): string[] {
  let text = desc.toLowerCase();

  const m = measurement?.toLowerCase();
  if (m) {
    const at = text.indexOf(m);
    if (at !== -1) text = text.slice(0, at) + text.slice(at + m.length);
  }

  text = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  text = text.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");

  return text
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean)
    .map(singular)
    .filter((word) => !IGNORED_WORDS.has(word));
}

export function buildVocabulary(rows: IngredientKeywordRow[]): IngredientVocabulary {
  const images = new Map<string, string>();
  const byPhrase = new Map<string, Phrase>();

  for (const row of rows) {
    images.set(row.keyword, row.image_name);
    const tokens = tokenize(row.keyword);
    if (tokens.length) byPhrase.set(tokens.join(" "), { tokens, keyword: row.keyword });
  }
  // An alias never replaces a keyword that is spelled the same
  for (const row of rows) {
    for (const alias of row.aliases) {
      const tokens = tokenize(alias);
      const key = tokens.join(" ");
      if (tokens.length && !byPhrase.has(key)) byPhrase.set(key, { tokens, keyword: row.keyword });
    }
  }

  const phrases = [...byPhrase.values()].sort((a, b) =>
    a.tokens.length !== b.tokens.length
      ? b.tokens.length - a.tokens.length
      : b.tokens.join("").length - a.tokens.join("").length,
  );

  return { images, phrases };
}

function firstIndex(phrase: string[], tokens: string[]): number {
  for (let start = 0; start + phrase.length <= tokens.length; start++) {
    if (phrase.every((word, i) => tokens[start + i] === word)) return start;
  }
  return -1;
}

// The longest phrase found; between equal lengths, the one that comes first in
// the line, so "butter or margarine" is butter
function ruleMatch(vocab: IngredientVocabulary, tokens: string[]): string | null {
  let best: { length: number; position: number; keyword: string } | null = null;
  for (const phrase of vocab.phrases) {
    if (best && phrase.tokens.length < best.length) break;
    const position = firstIndex(phrase.tokens, tokens);
    if (position === -1) continue;
    if (!best || position < best.position) {
      best = { length: phrase.tokens.length, position, keyword: phrase.keyword };
    }
  }
  return best?.keyword ?? null;
}

// Only when the list has these keywords
function genericMatch(vocab: IngredientVocabulary, tokens: string[]): string | null {
  const words = new Set(tokens);
  return (
    GENERIC.find((g) => g.words.some((w) => words.has(w)) && vocab.images.has(g.keyword))
      ?.keyword ?? null
  );
}

/** The keyword for a line such as "2 cups finely chopped red onions", or null. */
export function matchKeyword(
  vocab: IngredientVocabulary,
  desc: string,
  measurement?: string | null,
): string | null {
  const tokens = tokenize(desc, measurement);
  if (!tokens.length) return null;
  return ruleMatch(vocab, tokens) ?? genericMatch(vocab, tokens);
}

/**
 * Whether a saved keyword is a real one. The AI used to save the string "null",
 * and older imports used keywords that are no longer in the list.
 */
export function isKnownKeyword(
  vocab: IngredientVocabulary,
  keyword: string | null | undefined,
): keyword is string {
  if (!keyword || keyword === "null") return false;
  return vocab.images.size === 0 || vocab.images.has(keyword); // list failed to load: trust it
}

/**
 * The keyword to store after the line's text changed from `oldDesc` to
 * `newDesc`. A keyword the user picked survives the edit; one that was only
 * the automatic match follows the new text.
 */
export function keywordAfterEdit(
  vocab: IngredientVocabulary,
  current: string | null,
  oldDesc: string,
  newDesc: string,
  measurement?: string | null,
): string | null {
  if (isKnownKeyword(vocab, current) && current !== matchKeyword(vocab, oldDesc, measurement)) {
    return current;
  }
  return matchKeyword(vocab, newDesc, measurement);
}
