'use client'

import { useState } from 'react'

interface GoalInputProps {
  onGoalAdded: (title: string) => void
}

export default function GoalInput({ onGoalAdded }: GoalInputProps) {
  const [goalText, setGoalText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = goalText.trim()
    if (!text) return

    onGoalAdded(text)
    setGoalText('')
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          What would you like to accomplish?
        </h2>
        <p className="text-zinc-500">
          Break down your biggest goals into manageable steps
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <input
            type="text"
            id="goalText"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            className="input-base w-full"
            placeholder="Add a goal (e.g., Build a vegetable garden)"
            autoComplete="off"
          />
          <p className="text-sm text-zinc-500 text-center">
            Every goal can have its own to-do list. Add a goal, then plan it out.
          </p>
        </div>
        
        <button
          type="submit"
          disabled={!goalText.trim()}
          className="btn-primary w-full"
        >
          Add Goal
        </button>
      </form>
    </div>
  )
}
