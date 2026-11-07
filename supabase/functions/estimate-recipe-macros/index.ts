// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import OpenAI from "https://esm.sh/openai@4"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import {
  clampRecipeMacros,
  clampServings,
  RECIPE_MACROS_RULES,
  RECIPE_MACROS_SCHEMA,
  type RecipeMacros,
  ZERO_MACROS,
} from "../_shared/recipe-macros.ts"

/**
 * "Auto Estimate" on the recipe editor (Premium only): estimate per-serving
 * macros from a recipe's name and ingredient lines.
 *
 * Takes the editor's current, unsaved values -- `{ name, ingredients,
 * servings? }` -- and returns `{ macros }` WITHOUT saving anything; the client
 * saves them with the rest of the recipe. When `servings` is given it is kept
 * and the per-serving numbers are computed for it.
 *
 * Free users get 403 `premium_required`. Premium has a 200-a-day fair-use
 * ceiling (429 `recipe_macro_limit_reached`), both enforced by
 * `recipe_macro_estimates_consume()` before the OpenAI call.
 */

interface Payload {
  name?: unknown
  ingredients?: unknown
  servings?: unknown
}

// Same caps as the web's `LIMITS` (recipeName, recipeRows, recipeLine).
const MAX_NAME = 200
const MAX_LINES = 300
const MAX_LINE = 2000

/** The web's blank-recipe placeholder: not a dish name worth estimating from. */
const PLACEHOLDER_NAMES = new Set(["", "new recipe", "untitled recipe"])

console.info("estimate-recipe-macros function started")

Deno.serve(async (req: Request) => {
  try {
    const supabase = await authenticate(req)
    if (!supabase) return json({ error: "Not authenticated" }, 401)

    const body: Payload = await req.json().catch(() => ({}))

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (name.length > MAX_NAME) return json({ error: "That recipe name is too long." }, 400)

    if (body.ingredients != null && !Array.isArray(body.ingredients)) {
      return json({ error: "Ingredients must be a list." }, 400)
    }
    const rawLines: unknown[] = (body.ingredients as unknown[] | undefined) ?? []
    if (rawLines.length > MAX_LINES) return json({ error: "Too many ingredients." }, 400)
    const ingredients: string[] = []
    for (const line of rawLines) {
      if (typeof line !== "string" || line.length > MAX_LINE) {
        return json({ error: "Each ingredient must be text under 2,000 characters." }, 400)
      }
      if (line.trim()) ingredients.push(line.trim())
    }

    const fixedServings = body.servings == null ? null : clampServings(body.servings)

    // Nothing to estimate from: zeros, without spending anything.
    if (ingredients.length === 0 && PLACEHOLDER_NAMES.has(name.toLowerCase())) {
      return json({ macros: { ...ZERO_MACROS, servings: fixedServings ?? 1 } }, 200)
    }

    const { data: quota, error: quotaError } = await supabase.rpc("recipe_macro_estimates_consume")
    if (quotaError) {
      console.error(`Could not consume recipe macro estimate: ${quotaError.message}`)
      return json({ error: "Could not check your subscription. Try again." }, 500)
    }
    const usage = Array.isArray(quota) ? quota[0] : quota
    if (!usage?.allowed) {
      if (usage?.reason === "premium_required") {
        return json(
          { error: "Auto Estimate is a Kitch Premium feature.", code: "premium_required" },
          403
        )
      }
      return json(
        {
          error: "You've used today's Auto Estimates. Try again tomorrow.",
          code: "recipe_macro_limit_reached",
        },
        429
      )
    }

    const macros = await estimate(name, ingredients, fixedServings)
    return json({ macros }, 200)
  } catch (error) {
    console.error(error)
    return json({ error: "Could not estimate macros. Try again." }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return null

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return null

  return supabase
}

async function estimate(
  name: string,
  ingredients: string[],
  fixedServings: number | null
): Promise<RecipeMacros> {
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") })

  const userContent = [
    `Recipe name: ${name || "null"}`,
    `Servings: ${fixedServings ?? "unknown"}`,
    "Ingredients:",
    ingredients.length ? ingredients.map((line) => `- ${line}`).join("\n") : "(none)",
  ].join("\n")

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "developer",
        content: `You are a nutrition assistant. You receive a recipe's name, its number of servings (if known) and its ingredient lines.
${RECIPE_MACROS_RULES}
- If a number of servings is given, return exactly that number and compute per-serving values for it.
Return the response strictly in the provided JSON Schema format.`,
      },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recipe_macros",
        strict: true,
        schema: {
          type: "object",
          properties: { macros: RECIPE_MACROS_SCHEMA },
          required: ["macros"],
          additionalProperties: false,
        },
      },
    },
  })

  console.info(`OpenAI usage: ${JSON.stringify(response.usage ?? null)}`)

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error(`OpenAI returned unexpected response: ${JSON.stringify(response)}`)

  const macros = clampRecipeMacros(JSON.parse(content)?.macros)
  return fixedServings == null ? macros : { ...macros, servings: fixedServings }
}
