import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function generateSummary(title: string, content: string): Promise<string> {
  const prompt = `Summarize this news article in 2-3 sentences. Be concise and factual.
Title: ${title}
Content: ${content.slice(0, 3000)}
Summary:`
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function extractEntities(text: string): Promise<{
  persons: string[]
  organizations: string[]
  locations: string[]
}> {
  const prompt = `Extract named entities from this text. Return only valid JSON.
Text: ${text.slice(0, 2000)}
Format: {"persons":[],"organizations":[],"locations":[]}`
  const result = await model.generateContent(prompt)
  try {
    return JSON.parse(result.response.text().trim())
  } catch {
    return { persons: [], organizations: [], locations: [] }
  }
}

export async function generateKeywords(text: string): Promise<string[]> {
  const prompt = `Extract 5-8 relevant keywords from this news text. Return JSON array only.
Text: ${text.slice(0, 2000)}
Format: ["keyword1","keyword2",...]`
  const result = await model.generateContent(prompt)
  try {
    return JSON.parse(result.response.text().trim())
  } catch {
    return []
  }
}
