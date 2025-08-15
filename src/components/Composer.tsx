'use client'

import { useState, useRef, useEffect } from 'react'

interface ComposerProps {
  parentId: string
  onAddItem: (title: string, parentId: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  // Draft management
  draftValue?: string
  onDraftChange?: (parentId: string, value: string) => void
  // Auto-open behavior control (future-safe, default false for calm UX)
  autoOpenNext?: boolean
}

export default function Composer({ 
  parentId, 
  onAddItem, 
  onCancel,
  placeholder = "Add a to-do...",
  className = "",
  draftValue = "",
  onDraftChange,
  autoOpenNext = false
}: ComposerProps) {
  const [value, setValue] = useState(draftValue)
  const [bulkAddCount, setBulkAddCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with draft value when parentId changes
  useEffect(() => {
    setValue(draftValue)
  }, [draftValue, parentId])

  // Auto-focus when mounted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedValue = value.trim()
    if (!trimmedValue) return

    // Check for multi-line paste
    const lines = trimmedValue.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter((line, index, arr) => arr.indexOf(line) === index) // De-dupe
    
    if (lines.length > 1) {
      // Bulk add
      lines.forEach(line => onAddItem(line, parentId))
      setBulkAddCount(lines.length)
      setTimeout(() => setBulkAddCount(0), 3000)
    } else {
      // Single add
      onAddItem(trimmedValue, parentId)
    }
    
    // Clear input and handle post-create behavior based on autoOpenNext prop
    setValue('')
    if (onDraftChange) {
      onDraftChange(parentId, '')
    }
    
    if (autoOpenNext) {
      // Future: auto-open new composer (currently not used)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Default: close composer for calm UX
      onCancel?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('\n')) {
      setValue(pastedText)
      if (onDraftChange) {
        onDraftChange(parentId, pastedText)
      }
      e.preventDefault()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    if (onDraftChange) {
      onDraftChange(parentId, newValue)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="input-base flex-1 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="btn-primary text-sm h-9 px-3"
        >
          Add
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-sm h-9 px-3"
          >
            Cancel
          </button>
        )}
      </form>

      {bulkAddCount > 0 && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
          Added {bulkAddCount} to-dos.
        </div>
      )}
    </div>
  )
}

