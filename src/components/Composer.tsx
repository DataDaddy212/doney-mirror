'use client'

import { useState, useRef, useEffect } from 'react'

interface ComposerProps {
  parentId: string
  onAddItem: (title: string, parentId: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
}

export default function Composer({ 
  parentId, 
  onAddItem, 
  onCancel,
  placeholder = "Add a to-do...",
  className = ""
}: ComposerProps) {
  const [value, setValue] = useState('')
  const [bulkAddCount, setBulkAddCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Temporary logging for QA
  useEffect(() => {
    console.log('🔍 Composer: Mounted for parentId:', parentId)
    return () => {
      console.log('🔍 Composer: Unmounted for parentId:', parentId)
    }
  }, [parentId])

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
    
    // Clear input and keep focus for repeat-add
    setValue('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('\n')) {
      setValue(pastedText)
      e.preventDefault()
    }
  }

  // Temporary logging for QA
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    console.log('🔍 Composer: onChange value length:', newValue.length, 'for parentId:', parentId)
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

