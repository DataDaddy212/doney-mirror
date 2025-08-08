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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-bounce-in">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{goal.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage to-dos for this goal
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center ml-4 hover:bg-gray-100 rounded-full transition-all duration-200"
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
              <label className="block text-sm font-medium text-gray-700">
                Add a new to-do
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="What needs to be done?"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent touch-manipulation"
                />
                <button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 touch-manipulation"
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
            <h3 className="text-lg font-semibold text-gray-800 mb-3">To-dos</h3>
            {goal.todos.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-gray-500">
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
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              {goal.todos.filter(t => t.completed).length} of {goal.todos.length} to-dos completed
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
