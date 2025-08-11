'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  showSaveCancel?: boolean
  autoFocus?: boolean
}

export default function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder = "Enter text...",
  className = "",
  showSaveCancel = false,
  autoFocus = true
}: InlineEditProps) {
  const [editValue, setEditValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Temporary logging for QA
  useEffect(() => {
    if (isEditing) {
      console.log('🔍 InlineEdit: Mounted for value:', value)
      return () => {
        console.log('🔍 InlineEdit: Unmounted for value:', value)
      }
    }
  }, [isEditing, value])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing, autoFocus])

  const handleStartEdit = () => {
    setEditValue(value)
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmedValue = editValue.trim()
    if (trimmedValue && trimmedValue !== value) {
      onSave(trimmedValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Only handle blur if we're not in editing mode
    // This prevents accidental blur while typing
    if (!isEditing) {
      return
    }
    
    // Small delay to allow for button clicks
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        handleSave()
      }
    }, 100)
  }

  // Temporary logging for QA
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)
    console.log('🔍 InlineEdit: value length:', newValue.length, 'for original value:', value)
  }

  if (isEditing) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="input-base flex-1 text-sm"
        />
        {showSaveCancel && (
          <>
            <button
              onClick={handleSave}
              className="btn-primary text-xs h-7 px-2"
              aria-label="Save"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary text-xs h-7 px-2"
              aria-label="Cancel"
            >
              ✕
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <span
      className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${className}`}
      onClick={handleStartEdit}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${value}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStartEdit()
        }
      }}
    >
      {value}
    </span>
  )
}

