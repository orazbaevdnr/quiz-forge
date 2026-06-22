import { NextRequest, NextResponse } from 'next/server'
import { complete, aiConfigured } from '@/lib/ai'
import { rateLimit, getIp } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getIp(req))) {
      return NextResponse.json({ error: 'Слишком много запросов. Подождите минуту.' }, { status: 429 })
    }
    const { text, count = 10, difficulty = 'medium' } = await req.json()
    if (!text?.trim() || text.trim().length < 50) {
      return NextResponse.json({ error: 'Слишком мало текста (минимум 50 символов)' }, { status: 400 })
    }
    if (!aiConfigured()) {
      return NextResponse.json({ error: 'Сервис не настроен (нет AI-ключа)' }, { status: 503 })
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

    const raw = await complete({ system, user: content, json: true, temperature: 0.7 })
    const data = JSON.parse(raw || '{"questions":[]}')
    return NextResponse.json(data)
  } catch (err) {
    console.error('quiz error:', err)
    return NextResponse.json({ error: 'Ошибка генерации. Попробуйте ещё раз.' }, { status: 500 })
  }
}
