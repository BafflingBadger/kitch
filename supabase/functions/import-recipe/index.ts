// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { makeOpenAIRequest } from "./openai-helper.ts"
import { parse as parseHTML } from "npm:node-html-parser"
import { decodeBase64 } from "jsr:@std/encoding/base64"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ImportRecipePayload {
  urlText?: string
  images?: string[]
}

type RecipeSource =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "pinterest"
  | "web"
  | "image"

console.info("import-recipe function started")

/* ------------------------------------------------------------------ */
/* Entry Point (Supabase default style)                                */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  try {
    // Authenticate user
    const {supabase, user} = await validateUser(req)
    if (!user) return new Response("Unauthorized", { status: 401 })

    // Parse body
    const { urlText, images }: ImportRecipePayload = await req.json()

    // Validate request
    const validationError = validateRequest(urlText, images)
    if (validationError) return validationError

    const source = getRecipeSource(urlText)

    // Get scraped data (BrightData)
    let scrapedData: any = null
    if (source != "image") {
      const snapshotID = await getSnapshotID(urlText, source)
      scrapedData = await scrapeRecipeSource(snapshotID)
    }

    // Build recipe (OpenAI)
    const {recipe, openAIRequest, openAIResponse, sourceImagePaths} = await buildRecipe(scrapedData, source, urlText, images, user)

    // Write recipe to database
    await writeRecipeToDatabase(
      supabase,
      recipe,
      openAIRequest,
      openAIResponse,
      sourceImagePaths
    )

    return new Response(
      JSON.stringify(recipe),
      {
        headers: {
          "Content-Type": "application/json",
          "Connection": "keep-alive",
        },
      }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
})

/* ------------------------------------------------------------------ */
/* BrightData                                                          */
/* ------------------------------------------------------------------ */

async function getSnapshotID(
  urlText: string,
  source: RecipeSource
): Promise<string> {

  const datasetID = getDatasetID(source)

  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger` +
      `?dataset_id=${datasetID}` +
      `&include_errors=true` +
      (source === "web" ? "&custom_output_fields=page_html" : ""),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("BRIGHTDATA_API_KEY")}`,
      },
      body: JSON.stringify([{ url: urlText }]),
    }
  )

  if (!response.ok) {
    throw new Error(`BrightData error: ${response.status}`)
  }

  const json = await response.json()
  return json.snapshot_id
}

async function scrapeRecipeSource(snapshotID: string): Promise<any> {
  const url = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotID}?format=json`
  let seconds = 0

  while (true) {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("BRIGHTDATA_API_KEY")}`,
      }
    })

    if (response.status === 202) {
      if (seconds >= 60) {
        throw new Error("Failed to get scraped recipe data. BrightData took too long.")
      }
      await sleep(3000)
      seconds += 3
      continue
    }

    const raw = await response.text()

    if (!response.ok) {
      throw new Error(`BrightData error (${response.status}): ${raw}`)
    }

    const json = JSON.parse(raw)

    if (Array.isArray(json) && json[0]?.error) {
      throw new Error(json[0].error)
    }

    return json[0]
  }
}

/* ------------------------------------------------------------------ */
/* Recipe / Storage / DB                                               */
/* ------------------------------------------------------------------ */

async function buildRecipe(scrapedData: any, source: RecipeSource, urlText: string, images: string[], user: any) {
  if (source === "web") {
    const html = scrapedData.page_html
    if (!html || typeof html !== "string") {
      throw new Error("Page HTML not found in BrightData response.")
    }

    // Extract Schema.org Recipe JSON from HTML
    const recipeJSON = getRecipeJSON(html)

    // Build prompt for OpenAI to parse ingredients
    const prompt = `Website URL: ${urlText}\nIngredients: ${recipeJSON.recipeIngredient?.join(", ") ?? "null"}`

    // Call OpenAIHelper
    const { formattedData, requestBody, response } = await makeOpenAIRequest("ingredients", prompt)

    const websiteName = formattedData.websiteName

    // Build ingredients array
    const ingredients = (recipeJSON.recipeIngredient ?? []).map((desc: string, idx: number) => {
      const detail = formattedData.ingredients[idx] || {}
      return {
        order: idx,
        is_heading: false,
        summary: desc,
        measurement: detail.measurement ?? null,
        keyword: detail.keyword ?? null,
      }
    })

    // Build directions array
    const directions = (recipeJSON.recipeInstructions ?? []).map((step: any, idx: number) => ({
      order: idx,
      is_heading: false,
      summary: step.text ?? "",
    }))

    // Upload largest image to Supabase Storage
    const imageFilePath = await uploadWebRecipeImage(recipeJSON)

    // Build recipe object
    const recipe = {
      user_id: user.id,
      name: recipeJSON.name ?? "New Recipe",
      thumbnail: imageFilePath,
      ingredients,
      directions,
      source_url: urlText,
      source_text: websiteName,
      cookbooks: [],
      rating: 0,
      notes: null,
      created_at: new Date().toISOString(),
    }

    return {
      recipe,
      openAIRequest: requestBody,
      openAIResponse: response,
    }

  } else if (source === "image") {
    const {formattedData, requestBody, response} = await makeOpenAIRequest("recipeFromImage", "", images)

    // Retain the uploaded originals so this extraction can be re-checked or
    // re-parsed later. Deliberately not used as the thumbnail.
    const sourceImagePaths = await uploadSourceImages(images)

    const recipe = {
      user_id: user.id,
      name: formattedData.recipe_name ?? "New Recipe",
      thumbnail: null,
      ingredients: formattedData.ingredients ?? [],
      directions: formattedData.directions ?? [],
      source_url: "",
      source_text: getSourceText(source),
      cookbooks: [],
      rating: 0,
      notes: null,
      created_at: new Date().toISOString(),
    }

    return {
      recipe,
      openAIRequest: requestBody,
      openAIResponse: response,
      sourceImagePaths,
    }
  } else {
    const rawText =
      source === "facebook" || source === "pinterest"
        ? scrapedData.content
        : scrapedData.description

    const {formattedData, requestBody, response} = await makeOpenAIRequest("recipeFromText", rawText)

    let imagePath: string | null = null
    if (scrapedData) {
      imagePath = await uploadImage(scrapedData, source)
    }

    const recipe = {
      user_id: user.id,
      name: formattedData.recipe_name ?? "New Recipe",
      thumbnail: imagePath,
      ingredients: formattedData.ingredients ?? [],
      directions: formattedData.directions ?? [],
      source_url: urlText,
      source_text: getSourceText(source),
      cookbooks: [],
      rating: 0,
      notes: null,
      created_at: new Date().toISOString(),
    }

    return {
      recipe,
      openAIRequest: requestBody,
      openAIResponse: response,
    }
  }
}

// `recipes.request` is a debug log of the OpenAI call, but an image import sends
// whole base64 JPEGs, so logging the request verbatim persisted megabytes of
// image data per row (21MB across four rows before this existed) in a column
// nothing reads back. Replace the image payloads in the LOGGED copy only -- what
// is sent to OpenAI is built separately and is untouched.
//
// Rebuilds the wrapper objects by spreading rather than deep-cloning, so the
// base64 strings are dropped by reference instead of being copied first.
function stripImagesFromRequestLog(requestBody: any) {
  if (!requestBody || !Array.isArray(requestBody.messages)) return requestBody

  return {
    ...requestBody,
    messages: requestBody.messages.map((message: any) =>
      Array.isArray(message.content)
        ? {
            ...message,
            content: message.content.map((part: any) =>
              part?.type === "image_url"
                ? { ...part, image_url: { ...part.image_url, url: "[image omitted]" } }
                : part
            ),
          }
        : message
    ),
  }
}

async function writeRecipeToDatabase(supabase: ReturnType<typeof createClient>, recipe: any, requestBody: string | null, response: string | null, sourceImagePaths: string[] = []) {
  // Write recipe (RPC)
  const recipePayload = {
    _id: recipe.id ?? "0",
    _user_id: recipe.user_id,
    _name: recipe.name,
    _thumbnail: recipe.thumbnail ?? null,
    _source_url: recipe.source_url,
    _request: stripImagesFromRequestLog(requestBody) ?? null,
    _response: response ?? null,
    _cookbook_ids: "",
    _rating: 0,
    _notes: null,
    _source_text: recipe.source_text,
  }

  const { data: recipeID, error: recipeError } = await supabase
    .rpc("Recipe_Write", recipePayload)
    .single()

  if (recipeError) {
    throw new Error(`Failed to write recipe: ${recipeError.message}`)
  }

  recipe.id = recipeID

  // Write ingredients
  if (recipe.ingredients?.length) {
    const ingredientsPayload = recipe.ingredients.map(
      (ingredient: any, index: number) => ({
        recipe_id: recipeID,
        order: index,
        is_heading: ingredient.is_heading,
        desc: ingredient.summary,
        keyword: ingredient.keyword ?? null,
        measurement: ingredient.measurement ?? null
      })
    )

    const { error } = await supabase
      .from("ingredients")
      .upsert(ingredientsPayload)

    if (error) {
      throw new Error(`Failed to write ingredients: ${error.message}`)
    }

    recipe.ingredients = ingredientsPayload
  }

  // Write directions
  if (recipe.directions?.length) {
    const directionsPayload = recipe.directions.map(
      (direction: any, index: number) => ({
        recipe_id: recipeID,
        order: index,
        is_heading: direction.is_heading,
        desc: direction.summary
      })
    )

    const { error } = await supabase
      .from("directions")
      .upsert(directionsPayload)

    if (error) {
      throw new Error(`Failed to write directions: ${error.message}`)
    }

    recipe.directions = directionsPayload
  }

  // Link retained source images to the recipe. Best-effort: a failure here
  // costs provenance, not the import, so it must not discard a parsed recipe.
  if (sourceImagePaths?.length) {
    const { error } = await supabase
      .from("recipe_source_images")
      .insert(
        sourceImagePaths.map((storage_path: string) => ({
          recipe_id: recipeID,
          storage_path,
        }))
      )

    if (error) {
      console.error(`Failed to link source images: ${error.message}`)
    }
  }
}

// Persists the base64 images sent with an image import, returning their storage
// paths. Best-effort per image: the recipe itself parsed fine, so a storage
// failure (e.g. a page over the bucket's 5MB limit) must not fail the import.
async function uploadSourceImages(images: string[]): Promise<string[]> {
  if (!images?.length) return []

  const supabase = getSupabaseAdmin()
  const paths: string[] = []

  for (const image of images) {
    try {
      const bytes = decodeBase64(image)
      const filePath = `source/${crypto.randomUUID()}.jpeg`

      const { error } = await supabase.storage
        .from("recipes")
        .upload(filePath, bytes, { contentType: "image/jpeg" })

      if (error) {
        console.error(`Failed to upload source image: ${error.message}`)
        continue
      }

      paths.push(filePath)
    } catch (err) {
      console.error(`Failed to encode source image: ${err.message}`)
    }
  }

  return paths
}

async function uploadImage(scrapedData: any, source: RecipeSource) {
  const imageURL =
    source === "instagram" ? scrapedData.thumbnail :
    source === "facebook" ? scrapedData.attachments?.[0]?.thumbnail_url :
    source === "tiktok" ? scrapedData.preview_image :
    source === "pinterest" ? scrapedData.image_url :
    scrapedData.image

  if (!imageURL) {
    throw new Error("No image URL found")
  }

  const imageRes = await fetch(imageURL)
  const imageData = await imageRes.arrayBuffer()

  const filePath = `public/${crypto.randomUUID()}.jpeg`

  const supabase = getSupabaseAdmin()
  await supabase.storage
    .from("recipes")
    .upload(filePath, imageData, { contentType: "image/jpeg" })

  return filePath
}

async function uploadWebRecipeImage(recipeJSON: any) {
  if (!recipeJSON.image || !Array.isArray(recipeJSON.image)) return ""

  let largestImageURL = ""

  for (const url of recipeJSON.image) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      // In Deno we cannot read image dimensions easily; skip size comparison for now
      // Optionally integrate image-size library if needed
      largestImageURL = url
      break // pick first available image as fallback
    } catch {
      continue
    }
  }

  if (!largestImageURL) return ""

  const res = await fetch(largestImageURL)
  const data = new Uint8Array(await res.arrayBuffer())
  const filePath = `public/${crypto.randomUUID()}.jpeg`

  const supabase = getSupabaseAdmin()
  await supabase.storage.from("recipes").upload(filePath, data, { contentType: "image/jpeg" })

  return filePath
}

// Extracts Schema.org Recipe JSON from HTML scripts.
function getRecipeJSON(html: string) {
  const doc = parseHTML(html)
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')

  let recipeString = ""
  for (const script of scripts) {
    const text = script.text
    if (text.includes('"@type"') && text.includes("Recipe")) {
      recipeString = text
      break
    }
  }

  if (!recipeString) {
    throw new Error("Schema.org Recipe JSON not found in HTML.")
  }

  const trimmedJSON = trimEdges(recipeString)
  const json = JSON.parse(trimmedJSON)

  // Handle @graph node if present
  if (json["@graph"]) {
    const graph = json["@graph"]
    for (const node of graph) {
      if (node["@type"] === "Recipe") {
        return node
      }
    }
  }

  return json
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getRecipeSource(text: string): RecipeSource {
  if (text?.includes("instagram")) return "instagram"
  if (text?.includes("facebook")) return "facebook"
  if (text?.includes("tiktok")) return "tiktok"
  if (text?.includes("pinterest")) return "pinterest"
  if (!text) return "image"
  return "web"
}

function getDatasetID(source: RecipeSource): string {
  switch (source) {
    case "instagram": return "gd_lk5ns7kz21pck8jpis"
    case "facebook": return "gd_lyclm1571iy3mv57zw"
    case "tiktok": return "gd_lu702nij2f790tmv9h"
    case "pinterest": return "gd_lk5ns7kz21pck8jpis"
    case "web": return "gd_m6gjtfmeh43we6cqc"
    default: return ""
  }
}

function getSourceText(source: RecipeSource): string {
  switch (source) {
    case "instagram": return "Instagram"
    case "facebook": return "Facebook"
    case "tiktok": return "TikTok"
    case "pinterest": return "Pinterest"
    default: return ""
  }
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function validateRequest(urlText: any, images: any): Response | null {
  const hasURL =
    typeof urlText === "string" && urlText.trim().length > 0

  const hasImages =
    Array.isArray(images) &&
    images.length > 0 &&
    images.every(
      (img) => typeof img === "string" && img.trim().length > 0
    )

  // Must provide at least one
  if (!hasURL && !hasImages) {
    return new Response(
      JSON.stringify({ error: "Either urlText or images must be provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // If urlText exists, validate URL format
  if (hasURL) {
    try {
      new URL(urlText as string)
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
  }

  // All good
  return null
}

function trimEdges(input: string) {
  const start = input.indexOf("{")
  if (start === -1) throw new Error("Recipe JSON not formatted correctly.")

  let braceCount = 0
  for (let i = start; i < input.length; i++) {
    const char = input[i]
    if (char === "{") braceCount++
    else if (char === "}") braceCount--
    if (braceCount === 0) return input.slice(start, i + 1)
  }

  throw new Error("Recipe JSON from webpage is not formatted correctly.")
}

async function validateUser(req: Request) {
  const authHeader = req.headers.get("Authorization")

  if (!authHeader) {
    return null
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    return null
  }

  return {supabase, user}
}