'use client'

import { useState } from 'react'

interface Todo {
  id: string
  title: string
  completed: boolean
  children: Todo[]
}

interface Goal {
  id: string
  title: string
  completed: boolean
  todos: Todo[]
}

interface GoalDetailModalProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onTodoAdd: (goalId: string, title: string, parentId?: string) => void
  onTodoToggle: (todoId: string) => void
  onTodoRemove: (todoId: string) => void
}

export default function GoalDetailModal({
  goal,
  isOpen,
  onClose,
  onTodoAdd,
  onTodoToggle,
  onTodoRemove
}: GoalDetailModalProps) {
  const [newTodoText, setNewTodoText] = useState('')
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  if (!isOpen || !goal) return null

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    const text = newTodoText.trim()
    if (!text) return

    onTodoAdd(goal.id, text)
    setNewTodoText('')
    
    // Show success animation
    setShowSuccessAnimation(true)
    setTimeout(() => setShowSuccessAnimation(false), 1000)
  }

  const renderTodo = (todo: Todo, depth: number = 0) => (
    <div key={todo.id} className="space-y-2">
      <div className={`bg-gray-50 rounded-lg p-3 ${depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''}`}>
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onTodoToggle(todo.id)}
            className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400 focus:ring-2"
          />
          <span className={`flex-1 ${
            todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
          }`}>
            {todo.title}
          </span>
          <button
            onClick={() => onTodoRemove(todo.id)}
            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
      {todo.children.map((child) => renderTodo(child, depth + 1))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-bounce-in">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200/70 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 truncate">{goal.title}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Manage to-dos for this goal
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-2xl font-bold w-8 h-8 flex items-center justify-center ml-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {/* Add Todo Form */}
          <div className="mb-6">
            <form onSubmit={handleAddTodo} className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Add a new to-do
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="What needs to be done?"
                  className="input-base flex-1"
                />
                <button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  className="btn-primary"
                >
                  Add
                </button>
              </div>
            </form>
            
            {/* Success Animation */}
            {showSuccessAnimation && (
              <div className="mt-2 text-green-600 text-sm animate-pulse">
                ✅ To-do added successfully!
              </div>
            )}
          </div>

          {/* Todos List */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">To-dos</h3>
            {goal.todos.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-zinc-500">
                  No to-dos yet! Add your first to-do above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {goal.todos.map((todo) => renderTodo(todo))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-zinc-200/70 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="text-sm text-zinc-600 dark:text-zinc-300 text-center sm:text-left">
              {goal.todos.filter(t => t.completed).length} of {goal.todos.length} to-dos completed
            </div>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
