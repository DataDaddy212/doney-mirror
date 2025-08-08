'use client'

import { useState } from 'react'

interface PostGoalPromptProps {
  goalTitle: string
  isVisible: boolean
  onClose: () => void
  onTodoAdd: (todoText: string) => void
}

export default function PostGoalPrompt({ 
  goalTitle, 
  isVisible, 
  onClose, 
  onTodoAdd 
}: PostGoalPromptProps) {
  const [todoText, setTodoText] = useState('')

  if (!isVisible) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = todoText.trim()
    if (!text) return

    onTodoAdd(text)
    setTodoText('')
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full mx-2 animate-bounce-in">
        {/* Header */}
        <div className="p-6 text-center border-b border-zinc-200/70 dark:border-zinc-700">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Let&rsquo;s plan this goal
          </h2>
          <p className="text-zinc-600 dark:text-zinc-300 mb-4">
            You created <span className="font-semibold text-primary-600 dark:text-primary-400">&ldquo;{goalTitle}&rdquo;</span>
          </p>
          <p className="text-sm text-zinc-500">
            Add your first to-do, or break it into steps
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              placeholder="Add your first to-do..."
              className="input-base w-full"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!todoText.trim()}
                className="btn-primary flex-1"
              >
                Add To-Do
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="btn-secondary"
              >
                Later
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-zinc-500 text-center">
            You can always add more to-dos later by clicking on your goal
          </p>
        </div>
      </div>
    </div>
  )
}
