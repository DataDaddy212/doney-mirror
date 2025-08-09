'use client'

import { useState, useEffect, useRef } from 'react'

interface PostGoalPromptProps {
  goalTitle: string
  goalId: string
  isVisible: boolean
  onClose: (action: 'done' | 'skip') => void
  onTodoAdd: (todoText: string) => void
}

export default function PostGoalPrompt({ 
  goalTitle, 
  goalId,
  isVisible, 
  onClose, 
  onTodoAdd 
}: PostGoalPromptProps) {
  const [todoText, setTodoText] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [addedTodos, setAddedTodos] = useState<string[]>([])
  const [bulkAddCount, setBulkAddCount] = useState(0)
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when popup opens
  useEffect(() => {
    if (isVisible) {
      setTodoText('')
      setShowSuccess(false)
      setAddedTodos([])
      setBulkAddCount(0)
      setError('')
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isVisible])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = todoText.trim()
    if (!text) return

    try {
      // Check if text contains multiple lines
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter((line, index, arr) => arr.indexOf(line) === index) // De-dupe within session
      
      if (lines.length === 0) return

      if (lines.length > 1) {
        // Bulk add multiple to-dos
        for (const line of lines) {
          await onTodoAdd(line)
        }
        setAddedTodos(prev => [...prev, ...lines])
        setBulkAddCount(lines.length)
        setShowSuccess(true)
      } else {
        // Single to-do
        await onTodoAdd(text)
        setAddedTodos(prev => [...prev, text])
        setBulkAddCount(1)
        setShowSuccess(true)
      }
      
      setTodoText('')
      setError('')
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
        setBulkAddCount(0)
      }, 3000)
      
      // Keep focus on input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (err) {
      // Show error but keep the text so user can retry
      setError('Failed to save. Please try again.')
      // Keep focus on input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleDone = () => {
    onClose('done')
  }

  const handleSkip = () => {
    onClose('skip')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSkip()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('\n')) {
      // If pasted text contains newlines, update the input with the pasted text
      // The form submission will handle the bulk add
      setTodoText(pastedText)
      e.preventDefault() // Prevent default paste behavior
    }
  }

  const isInputValid = todoText.trim().length > 0
  const hasAddedTodos = addedTodos.length > 0

  if (!isVisible) return null

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
            Add your first to-dos. You can always change them later.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium">
                  {bulkAddCount > 1 
                    ? `Added ${bulkAddCount} to-dos.` 
                    : 'Sub-goal added — getting stuff done is fun! Add another?'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Added Todos List */}
          {addedTodos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2">Added to-dos:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {addedTodos.map((todo, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <span className="text-green-500">✓</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{todo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              ref={inputRef}
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Add a to-do (e.g., Measure garden area)"
              className="input-base w-full min-h-[80px] resize-none"
              autoFocus
              rows={3}
            />
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isInputValid}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            {hasAddedTodos && (
              <button
                type="button"
                onClick={handleDone}
                className="btn-secondary flex-1"
              >
                Done
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="btn-secondary flex-1"
            >
              Skip for now
            </button>
          </div>
          <p className="text-xs text-zinc-500 text-center mt-3">
            You can always add more to-dos later by clicking on your goal
          </p>
        </div>
      </div>
    </div>
  )
}
