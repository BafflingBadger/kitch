// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import OpenAI from "https://esm.sh/openai@4"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { clampConfidence, CONFIDENCE_RULE } from "../_shared/recipe-macros.ts"

/**
 * Quick Add: turn a plain-text description of what someone ate into a list of
 * foods with estimated macros.
 *
 * Premium only: `macro_estimates_consume()` refuses anyone without Premium,
 * and this returns 403 `premium_required`. Returns `{ items, remaining }`;
 * `remaining` is always null now (Premium is unlimited) and is kept for older
 * clients. Saving the items is a separate step (`meal_food_entries_add`), so
 * the user can review the numbers first.
 */

interface EstimateMacrosPayload {
  description?: unknown
}

interface MacroItem {
  name: string
  serving: string | null
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  /** Whole number out of 10. */
  confidence: number | null
}

const MAX_DESCRIPTION = 1000
const MAX_ITEMS = 20

console.info("estimate-macros function started")

Deno.serve(async (req: Request) => {
  try {
    const supabase = await authenticate(req)
    if (!supabase) return json({ error: "Not authenticated" }, 401)

    const { description }: EstimateMacrosPayload = await req.json().catch(() => ({}))
    const text = typeof description === "string" ? description.trim() : ""
    if (!text || text.length > MAX_DESCRIPTION) {
      return json({ error: `Describe what you ate in 1 to ${MAX_DESCRIPTION} characters.` }, 400)
    }

    // Check entitlement BEFORE the OpenAI call, so a blocked request costs
    // nothing. Unlike the import quota this fails closed.
    const { data: quota, error: quotaError } = await supabase.rpc("macro_estimates_consume")
    if (quotaError) {
      console.error(`Could not consume macro estimate: ${quotaError.message}`)
      return json({ error: "Could not check your daily limit. Try again." }, 500)
    }
    const usage = Array.isArray(quota) ? quota[0] : quota
    if (!usage?.allowed) {
      return json(
        {
          error: "Quick Add is a Kitch Premium feature.",
          code: "premium_required",
        },
        403
      )
    }

    const items = await estimateMacros(text)
    return json({ items, remaining: usage.remaining ?? null }, 200)
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

/* ------------------------------------------------------------------ */
/* OpenAI                                                              */
/* ------------------------------------------------------------------ */

async function estimateMacros(description: string): Promise<MacroItem[]> {
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") })

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "developer",
        content: `You are a nutrition assistant. The user describes food they ate.
Split it into distinct food items and estimate each item's macros for the amount described.
- If no amount is given, assume one typical serving.
- "name" is a short food name without the amount (e.g. "Scrambled eggs").
- "serving" is the amount eaten (e.g. "2 large", "1 cup", "1 slice"), or null if unknown.
- Calories are whole numbers; protein, fat and carbs are grams rounded to one decimal.
- Return at most ${MAX_ITEMS} items. If the text describes no food, return an empty list.
${CONFIDENCE_RULE}
Return the response strictly in the provided JSON Schema format.`,
      },
      { role: "user", content: description },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "macro_estimate",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  serving: { type: ["string", "null"] },
                  calories: { type: "number" },
                  protein_g: { type: "number" },
                  fat_g: { type: "number" },
                  carbs_g: { type: "number" },
                  confidence: { type: "integer" },
                },
                required: ["name", "serving", "calories", "protein_g", "fat_g", "carbs_g", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
  })

  console.info(`OpenAI usage: ${JSON.stringify(response.usage ?? null)}`)

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error(`OpenAI returned unexpected response: ${JSON.stringify(response)}`)

  const parsed = JSON.parse(content)
  const rawItems: unknown[] = Array.isArray(parsed?.items) ? parsed.items : []

  return rawItems.slice(0, MAX_ITEMS).flatMap((raw) => {
    const item = raw as Record<string, unknown>
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 200) : ""
    if (!name) return []
    const serving = typeof item.serving === "string" && item.serving.trim()
      ? item.serving.trim().slice(0, 100)
      : null
    return [{
      name,
      serving,
      calories: Math.round(clamp(item.calories, 10000)),
      protein_g: roundTenth(clamp(item.protein_g, 1000)),
      fat_g: roundTenth(clamp(item.fat_g, 1000)),
      carbs_g: roundTenth(clamp(item.carbs_g, 1000)),
      confidence: clampConfidence(item.confidence),
    }]
  })
}

/** Keep model output inside the table's check constraints. */
function clamp(value: unknown, max: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return Math.min(Math.max(n, 0), max)
}

function roundTenth(n: number) {
  return Math.round(n * 10) / 10
}
