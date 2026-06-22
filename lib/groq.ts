import Groq from 'groq-sdk'

export const MODEL = 'llama-3.3-70b-versatile'

let _client: Groq | null = null

export function getGroq(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
  }
  return _client
}
