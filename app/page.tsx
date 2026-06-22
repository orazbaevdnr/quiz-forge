'use client'
import { useState, useEffect, useRef } from 'react'
import { remaining, canUse, recordUse, FREE_LIMIT } from '@/lib/freemium'
import { extractPdfText } from '@/lib/pdf'

const UPGRADE_URL = process.env.NEXT_PUBLIC_STRIPE_URL || '#'

interface Q { q: string; options: string[]; correct: number; explanation: string }

export default function Home() {
  const [text, setText] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState<Q[]>([])
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState<number | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLeft(remaining()) }, [])

  async function onFile(f: File) {
    if (f.type !== 'application/pdf') { setError('Только PDF файлы'); return }
    setParsing(true); setError('')
    try {
      const t = await extractPdfText(f)
      setText(t)
    } catch { setError('Не удалось прочитать PDF') }
    setParsing(false)
  }

  async function run() {
    if (text.trim().length < 50) { setError('Добавьте больше текста'); return }
    if (!canUse()) { setError('limit'); return }
    setLoading(true); setError(''); setQuestions([]); setShowAnswers(false)
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, count, difficulty }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Ошибка'); setLoading(false); return }
    recordUse(); setLeft(remaining()); setQuestions(data.questions || []); setLoading(false)
  }

  function exportText() {
    let out = ''
    questions.forEach((q, i) => {
      out += `${i + 1}. ${q.q}\n`
      q.options.forEach((o, j) => { out += `   ${String.fromCharCode(65 + j)}) ${o}\n` })
      out += `   Ответ: ${String.fromCharCode(65 + q.correct)} — ${q.explanation}\n\n`
    })
    const blob = new Blob([out], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'test.txt'; a.click()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2"><span className="text-2xl">📝</span><span className="font-bold text-xl">QuizForge</span></div>
        {left !== null && <span className="text-zinc-400 text-sm">Осталось: <span className="text-sky-400 font-semibold">{left}</span>/{FREE_LIMIT}</span>}
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-12 pb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Тесты из любого<br /><span className="text-sky-400">PDF за секунды</span></h1>
        <p className="text-zinc-400 text-lg">Загрузите документ — получите готовый тест с вопросами и ответами.</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20 space-y-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-600 hover:border-sky-500 rounded-xl p-8 text-center cursor-pointer transition">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <div className="text-4xl mb-2">📄</div>
            <p className="text-zinc-300 font-medium">{parsing ? 'Читаю PDF...' : 'Загрузите PDF'}</p>
            <p className="text-zinc-500 text-sm mt-1">или вставьте текст ниже</p>
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
            placeholder="Текст учебного материала..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-sky-500 resize-none" />

          <div className="flex gap-3">
            <select value={count} onChange={e => setCount(+e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-sky-500">
              {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} вопросов</option>)}
            </select>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-sky-500">
              <option value="easy">Лёгкие</option>
              <option value="medium">Средние</option>
              <option value="hard">Сложные</option>
            </select>
          </div>

          <button onClick={run} disabled={loading || text.trim().length < 50}
            className="w-full bg-sky-600 hover:bg-sky-700 font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⟳</span> Создаю тест...</> : 'Создать тест →'}
          </button>

          {error === 'limit' ? (
            <div className="bg-zinc-800 rounded-xl p-5 text-center">
              <p className="font-semibold mb-2">Лимит исчерпан</p>
              <p className="text-zinc-400 text-sm mb-4">Безлимит — $15/мес</p>
              <a href={UPGRADE_URL} className="inline-block bg-sky-600 hover:bg-sky-700 font-semibold px-6 py-3 rounded-xl">Перейти на Pro →</a>
            </div>
          ) : error ? <p className="text-red-400 text-sm">{error}</p> : null}
        </div>

        {questions.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{questions.length} вопросов</span>
              <div className="flex gap-3">
                <button onClick={() => setShowAnswers(!showAnswers)} className="text-sky-400 text-sm hover:text-sky-300">{showAnswers ? 'Скрыть ответы' : 'Показать ответы'}</button>
                <button onClick={exportText} className="text-sky-400 text-sm hover:text-sky-300">Скачать</button>
              </div>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="border-t border-zinc-800 pt-4">
                <p className="font-medium mb-3">{i + 1}. {q.q}</p>
                <div className="space-y-2">
                  {q.options.map((o, j) => (
                    <div key={j} className={`text-sm px-3 py-2 rounded-lg ${showAnswers && j === q.correct ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>
                      {String.fromCharCode(65 + j)}) {o}
                    </div>
                  ))}
                </div>
                {showAnswers && <p className="text-zinc-400 text-sm mt-2">💡 {q.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
