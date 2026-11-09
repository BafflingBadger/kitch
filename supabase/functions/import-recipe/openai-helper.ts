import OpenAI from "https://esm.sh/openai"
import { keywordSchema } from "./ingredient-keywords.ts"
import { RECIPE_MACROS_RULES, RECIPE_MACROS_SCHEMA } from "../_shared/recipe-macros.ts"

// Request types
type OpenAIRequestType = "recipeFromText" | "ingredients" | "recipeFromImage"

export async function makeOpenAIRequest(
  requestType: OpenAIRequestType,
  input: string = "",
  images: string[] = [], // base64 image strings
  keywords: string[] = [] // from the ingredient_keywords table
): Promise<{ formattedData: any; requestBody: any; response: string }> {
  const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  })

  let requestBody: any

  switch (requestType) {
    case "recipeFromText":
      requestBody = getRequestBodyRecipeFromText(input, keywords)
      break
    case "ingredients":
      requestBody = getIngredientDetailsRequest(input, keywords)
      break
    case "recipeFromImage":
      requestBody = getRequestBodyRecipeFromImage(images, keywords)
      break
  }

  // Call OpenAI Chat API
  const response = await openai.chat.completions.create(requestBody)

  // Logged so real per-import costs can be measured.
  console.info(`OpenAI ${requestType} usage: ${JSON.stringify(response.usage ?? null)}`)

  const content = response.choices[0].message?.content
  if (!content) throw new Error(`OpenAI returned unexpected response: ${JSON.stringify(response)}`)

  const formattedData = JSON.parse(content) // parse JSON from OpenAI

  return { formattedData, requestBody, response: content }
}

/* --------------------------- Request Bodies -------------------------- */

function getRequestBodyRecipeFromText(data: string, keywords: string[]) {
  return {
    model: "gpt-4o",
    messages: [
      {
        role: "developer",
        content: `You will receive an HTML page containing a recipe. Extract the following details:  
          - Recipe Name
          - Ingredients (including subheaders, quantities, and units)
          - Directions (including subheaders)
          - Number of Servings

        Return the response strictly in the provided JSON Schema format. If a field is missing, return null. Do not include extra fields or modify text.

        ${RECIPE_MACROS_RULES}`,
      },
      {
        role: "user",
        content: data,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recipe_schema",
        schema: {
          type: "object",
          properties: {
            recipe_name: {
              type: ["string", "null"],
              description: "Suggest a recipe name."
            },
            ingredients: {
              type: ["array", "null"],
              description: "List of ingredients or subheaders.",
              items: {
                type: "object",
                properties: {
                  is_heading: {
                    type: "boolean",
                    description: "Determines whether this is an ingredient or a sub-header for ingredients."
                  },
                  summary: {
                    type: "string",
                    description: "Text of the sub-header or ingredient, for example '3/4 tablespoons of sugar'. Use the exact wording found in the HTML. Do not prefix the text with anything, including dashes or numbers."
                  },
                  measurement: {
                    type: ["string", "null"],
                    description: "The measurement of the ingredient, for example '3/4 tablespoons'. The text must be contained somewhere inside the 'summary' sibling JSON property. If no quantity is found, return null."
                  },
                  keyword: keywordSchema(keywords, "A predefined keyword representing the ingredient, or null if none.")
                },
                required: ["is_heading", "summary"],
                additionalProperties: false
              }
            },
            directions: {
              type: ["array", "null"],
              description: "List of directions or subheaders.",
              items: {
                type: "object",
                properties: {
                  is_heading: {
                    type: "boolean",
                    description: "Determines whether this is a direction or a sub-header of directions."
                  },
                  summary: {
                    type: "string",
                    description: "Text of the sub-header or direction. Use the exact wording found in the HTML. Do not prefix the text with anything, including dashes or numbers."
                  }
                },
                required: ["is_heading", "summary"],
                additionalProperties: false
              }
            },
            num_servings: {
              type: ["number", "null"],
              description: "The number of servings the recipe makes. This is optional."
            },
            macros: RECIPE_MACROS_SCHEMA
          },
          required: ["recipe_name", "ingredients", "directions", "macros"],
          additionalProperties: false
        }
      }
    }
  }
}

function getIngredientDetailsRequest(data: string, keywords: string[]) {
  return {
    model: "gpt-4o",
    messages: [
      {
        role: "developer",
        content: `I will send you a string array of ingredients. Some of the ingredients will have quantities/measurements included. Your job is to extract:
          - measurement text, if it exists
          - ingredient keyword
        Also return the formatted website name.

        ${RECIPE_MACROS_RULES}

        Return strictly in the provided JSON Schema format.`,
      },
      { role: "user", content: data },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ingredient_details_schema",
        schema: {
          type: "object",
          properties: {
            websiteName: { 
              type: "string",
              description: "The formatted name of the website. For example, 'emiliarecipes.com' -> 'Emilia Recipes'."
            },
            ingredients: {
              type: "array",
              description: "List of ingredients and their details.",
              items: {
                type: "object",
                properties: {
                  ingredient_text: { 
                    type: "string",
                    description: "The full, unprocessed text of the ingredient."
                  },
                  measurement: { 
                    type: ["string", "null"],
                    description: "The measurement text of the ingredient, for example '3/4 tablespoons'. The measurement text must be contained somewhere inside the ingredient text. If no quantity or measurement is found, return null."
                  },
                  keyword: keywordSchema(keywords, "Select a single keyword from the predefined list that best describes the ingredient. If no keyword in the list is suitable for the ingredient, return null."),
                },
                required: ["ingredient_text"],
              },
            },
            macros: RECIPE_MACROS_SCHEMA,
          },
          required: ["websiteName", "ingredients", "macros"],
        },
      },
    },
  }
}

function getRequestBodyRecipeFromImage(images: string[], keywords: string[]) {
  // images are already base64 data URIs
  const imageObjects = images.map((img) => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${img}` },
  }))

  return {
    model: "gpt-4o",
    messages: [
      {
        role: "developer",
        content: `You will receive one or more images containing the text of a recipe. If multiple images, connect the recipe together. Extract:
          - Recipe Name
          - Ingredients (with subheaders, quantities, units)
          - Directions (with subheaders)
          - Number of Servings

        ${RECIPE_MACROS_RULES}

        Return strictly in the provided JSON Schema format.`,
      },
      { role: "user", content: imageObjects },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recipe_schema",
        schema: {
          type: "object",
          properties: {
            recipe_name: {
              type: ["string", "null"],
              description: "Suggest a recipe name."
            },
            ingredients: {
              type: ["array", "null"],
              description: "List of ingredients or subheaders.",
              items: {
                type: "object",
                properties: {
                  is_heading: {
                    type: "boolean",
                    description: "Determines whether this is an ingredient or a sub-header for ingredients."
                  },
                  summary: {
                    type: "string",
                    description: "Text of the sub-header or ingredient, for example '3/4 tablespoons of sugar'. Use the exact wording found in the HTML. Do not prefix the text with anything, including dashes or numbers."
                  },
                  measurement: {
                    type: ["string", "null"],
                    description: "The measurement of the ingredient, for example '3/4 tablespoons'. The text must be contained somewhere inside the 'summary' sibling JSON property. If no quantity is found, return null."
                  },
                  keyword: keywordSchema(keywords, "A predefined keyword representing the ingredient, or null if none.")
                },
                required: ["is_heading", "summary"],
                additionalProperties: false
              }
            },
            directions: {
              type: ["array", "null"],
              description: "List of directions or subheaders.",
              items: {
                type: "object",
                properties: {
                  is_heading: {
                    type: "boolean",
                    description: "Determines whether this is a direction or a sub-header of directions."
                  },
                  summary: {
                    type: "string",
                    description: "Text of the sub-header or direction. Use the exact wording found in the HTML. Do not prefix the text with anything, including dashes or numbers."
                  }
                },
                required: ["is_heading", "summary"],
                additionalProperties: false
              }
            },
            num_servings: {
              type: ["number", "null"],
              description: "The number of servings the recipe makes. This is optional."
            },
            macros: RECIPE_MACROS_SCHEMA
          },
          required: ["recipe_name", "ingredients", "directions", "macros"],
          additionalProperties: false
        }
      }
    }
  }
}