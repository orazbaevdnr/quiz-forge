import Groq from 'groq-sdk'

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GEMINI_MODEL = 'gemini-2.0-flash'

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
  return _groq
}

interface Opts {
  system: string
  user: string
  json?: boolean
  temperature?: number
}

async function geminiComplete({ system, user, json, temperature }: Opts): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('no gemini key')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature: temperature ?? 0.8,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini empty response')
  return text as string
}

async function groqComplete({ system, user, json, temperature }: Opts): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    temperature: temperature ?? 0.8,
    ...(json ? { response_format: { type: 'json_object' as const } } : {}),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return completion.choices[0]?.message?.content || ''
}

// Gemini — основной движок, Groq — запасной.
export async function complete(opts: Opts): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiComplete(opts)
    } catch {
      // падаем на Groq
    }
  }
  return await groqComplete(opts)
}

export function aiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY)
}
