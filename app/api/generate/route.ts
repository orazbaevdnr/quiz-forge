import { NextRequest, NextResponse } from 'next/server'
import { getGroq, MODEL } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { text, count = 10, difficulty = 'medium' } = await req.json()
    if (!text?.trim() || text.trim().length < 50) {
      return NextResponse.json({ error: 'Слишком мало текста (минимум 50 символов)' }, { status: 400 })
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Сервис не настроен (нет GROQ_API_KEY)' }, { status: 503 })
    }

    const content = text.slice(0, 12000)
    const diffMap: Record<string, string> = {
      easy: 'простые', medium: 'средней сложности', hard: 'сложные',
    }

    const system = `Ты — методист, создающий тесты по учебным материалам.
Сгенерируй ${count} вопросов с множественным выбором (${diffMap[difficulty] || 'средней сложности'}) по предоставленному тексту.
Отвечай СТРОГО в формате JSON без markdown:
{
  "questions": [
    {
      "q": "текст вопроса",
      "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
      "correct": 0,
      "explanation": "краткое объяснение правильного ответа"
    }
  ]
}
"correct" — индекс правильного варианта (0-3). Вопросы должны проверять понимание, а не дословное запоминание. Пиши на языке исходного текста.`

    const completion = await getGroq().chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    })

    const data = JSON.parse(completion.choices[0]?.message?.content || '{"questions":[]}')
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ошибка генерации' }, { status: 500 })
  }
}
