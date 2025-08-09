'use client'

import { useState, useRef, useEffect } from 'react'
import { TodoItem, getChildren, computeLevel, getDirectProgress, getDescendants, getSiblings, isDescendant } from '@/utils/treeUtils'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

// helper to render a simple row preview for DragOverlay
function RowPreview({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm">
      {title}
    </div>
  )
}

interface GoalTileProps {
  goal: TodoItem
  allItems: TodoItem[]
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void
  onAddItem: (title: string, parentId: string | null) => void
  onDeleteItem: (itemId: string) => void
  onReparent: (nodeId: string, newParentId: string | null, position?: 'start'|'end'|number) => void
  onReorder: (nodeId: string, newIndex: number) => void
  tileHandleAttributes?: any
  tileHandleListeners?: any
  tileIsDragging?: boolean
}

export default function GoalTile({ 
  goal, 
  allItems, 
  onUpdateItem, 
  onAddItem, 
  onDeleteItem,
  onReparent,
  onReorder,
  tileHandleAttributes,
  tileHandleListeners,
  tileIsDragging
}: GoalTileProps) {
  const isBrowser = typeof document !== 'undefined'
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(goal.title)
  const [isExpanded, setIsExpanded] = useState(false)
  const [deletedItems, setDeletedItems] = useState<Map<string, { item: TodoItem, timestamp: number }>>(new Map())
  const titleInputRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const directChildren = getChildren(goal.id, allItems)
  const progress = getDirectProgress(goal.id, allItems)
  const level = computeLevel(goal.id, allItems)

  const labelFor = (id: string) => allItems.find(i => i.id === id)?.title ?? id

  // Handle title editing
  const handleTitleEdit = () => {
    setIsEditingTitle(true)
    setEditTitle(goal.title)
    setTimeout(() => titleInputRef.current?.focus(), 100)
  }

  const handleTitleSave = () => {
    const trimmedTitle = editTitle.trim()
    if (trimmedTitle && trimmedTitle !== goal.title) {
      onUpdateItem(goal.id, { title: trimmedTitle })
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setEditTitle(goal.title)
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }

  // Handle item deletion with undo
  const handleDeleteItem = (itemId: string) => {
    const item = allItems.find(i => i.id === itemId)
    if (item) {
      // Soft delete - store for potential undo
      const descendants = getDescendants(itemId, allItems)
      const itemsToDelete = [item, ...descendants]
      
      setDeletedItems(prev => {
        const newMap = new Map(prev)
        itemsToDelete.forEach(item => {
          newMap.set(item.id, { 
            item, 
            timestamp: Date.now() 
          })
        })
        return newMap
      })
      
      // Actually delete the items
      itemsToDelete.forEach(item => onDeleteItem(item.id))
    }
  }

  // Clean up expired undo items
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const expired = Array.from(deletedItems.entries())
        .filter(([_, data]) => now - data.timestamp > 5000)
        .map(([id, _]) => id)
      
      if (expired.length > 0) {
        setDeletedItems(prev => {
          const newMap = new Map(prev)
          expired.forEach(id => newMap.delete(id))
          return newMap
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [deletedItems])

  const handleUndoDelete = (itemId: string) => {
    const deletedData = deletedItems.get(itemId)
    if (deletedData) {
      // Restore the item
      onAddItem(deletedData.item.title, deletedData.item.parentId)
      setDeletedItems(prev => {
        const newMap = new Map(prev)
        newMap.delete(itemId)
        return newMap
      })
    }
  }

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    setActiveId(id)
    console.log('[DnD] start', { id, title: labelFor(id) })
  }

  const handleDragOver = (e: DragOverEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    setOverId(o)
    if (!activeId) return
    console.log('[DnD] over', { activeId, activeTitle: labelFor(activeId), overId: o })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    if (activeId) {
      console.log('[DnD] end', { activeId, activeTitle: labelFor(activeId), overId: o })
      if (o) {
        // root drop
        if (o === `root:${goal.id}`) {
          onReparent(activeId, goal.id, 'end')
        } else if (o.includes('::')) {
          const [targetId, zone] = o.split('::') as [string, 'before'|'after'|'into']
          if (zone === 'into') {
            if (isDescendant(targetId, activeId, allItems)) {
              console.warn('[DnD] blocked: cannot drop into own descendant')
            } else {
              onReparent(activeId, targetId, 'end')
            }
          } else {
            const target = allItems.find(i => i.id === targetId)
            const moving = allItems.find(i => i.id === activeId)
            if (target && moving) {
              const sibs = getSiblings(target.parentId ?? null, allItems)
              const tIdx = sibs.findIndex(s => s.id === targetId)
              const newIdx = zone === 'before' ? tIdx : tIdx + 1
              if (moving.parentId === target.parentId) {
                onReorder(activeId, newIdx)
              } else {
                onReparent(activeId, target.parentId ?? null, newIdx)
              }
            }
          }
        }
      }
    }
    setActiveId(null)
    setOverId(null)
  }

  // Root droppable area just above tree
  function RootDropZone() {
    const { setNodeRef, isOver } = useDroppable({ id: `root:${goal.id}` })
    return (
      <div ref={setNodeRef} className={`mb-2 h-2 rounded ${isOver ? 'bg-accent-500/50' : 'bg-transparent'}`} aria-hidden />
    )
  }

  return (
    <div className={`card mb-4 ${tileIsDragging ? 'ring-2 ring-accent-500 ring-offset-1' : ''}`} data-goal-id={goal.id}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center mr-2">
            {/* Tile drag handle */}
            <button {...(tileHandleAttributes||{})} {...(tileHandleListeners||{})} className="w-4 h-4 mr-2 cursor-grab text-zinc-400 hover:text-zinc-600" aria-label="Reorder goal tile" onMouseDown={(e)=>e.stopPropagation()} onClick={(e)=>e.preventDefault()}>
              ≡
            </button>
          </div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                placeholder="Rename goal…"
                className="input-base w-full text-lg font-medium"
              />
            ) : (
              <h3 
                className="text-lg font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 py-1 rounded -mx-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                onClick={handleTitleEdit}
                tabIndex={0}
                role="button"
                aria-label="Edit goal title"
              >
                {goal.title}
              </h3>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <span className="badge badge-neutral text-xs">
                Level {level}
              </span>
              <span className="text-sm text-zinc-500">
                {progress.completed}/{progress.total} completed
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={goal.completed}
              onChange={() => onUpdateItem(goal.id, { completed: !goal.completed })}
              className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Body - Tree */}
      <div className={`p-4 ${activeId ? 'overflow-visible relative z-10' : ''}`}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <RootDropZone />
          {isExpanded ? (
            <FullTree
              parentId={goal.id}
              allItems={allItems}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              onDeleteItem={handleDeleteItem}
              onReparent={onReparent}
              onReorder={onReorder}
              activeId={activeId}
              overId={overId}
            />
          ) : (
            <CompactTree
              parentId={goal.id}
              allItems={allItems}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              onDeleteItem={handleDeleteItem}
              activeId={activeId}
              overId={overId}
            />
          )}
          {isBrowser ? (
            createPortal(
              <DragOverlay>{activeId ? <RowPreview title={labelFor(activeId)} /> : null}</DragOverlay>,
              document.body
            )
          ) : null}
        </DndContext>
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-secondary text-sm h-8 px-3"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={() => onAddItem('', goal.id)}
            className="btn-primary text-sm h-8 px-3"
          >
            Add to-do
          </button>
          <button className="btn-secondary text-sm h-8 px-3">
            ⋯
          </button>
        </div>
      </div>

      {/* Undo Chips */}
      {Array.from(deletedItems.entries()).map(([itemId, data]) => (
        <div key={itemId} className="px-4 pb-2">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700 dark:text-amber-300">
                &quot;{data.item.title}&quot; deleted
              </span>
              <button
                onClick={() => handleUndoDelete(itemId)}
                className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-2 py-1 rounded hover:bg-amber-200 dark:hover:bg-amber-700"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// small hook to wire a row as draggable with handle and three droppable zones
function useRowDnd(rowId: string) {
  const draggable = useDraggable({ id: rowId })
  const before = useDroppable({ id: `${rowId}::before` })
  const into = useDroppable({ id: `${rowId}::into` })
  const after = useDroppable({ id: `${rowId}::after` })
  return { draggable, before, into, after }
}

// CompactTree Component
interface CompactTreeProps {
  parentId: string
  allItems: TodoItem[]
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void
  onAddItem: (title: string, parentId: string | null) => void
  onDeleteItem: (itemId: string) => void
  activeId?: string | null
  overId?: string | null
}

function CompactTree({
  parentId,
  allItems,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  activeId,
  overId
}: CompactTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [addText, setAddText] = useState('')
  const [showMoreDepth, setShowMoreDepth] = useState<number | null>(null)
  const [bulkAddCount, setBulkAddCount] = useState(0)
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const children = getChildren(parentId, allItems)
  const maxVisibleChildren = 3
  const hasMoreChildren = children.length > maxVisibleChildren
  const visibleChildren = showMoreDepth === 1 ? children : children.slice(0, maxVisibleChildren)

  const handleEditStart = (item: TodoItem) => {
    setEditingId(item.id)
    setEditText(item.title)
    setTimeout(() => editInputRef.current?.focus(), 100)
  }

  const handleEditSave = () => {
    const trimmedText = editText.trim()
    if (editingId && trimmedText && trimmedText !== allItems.find(i => i.id === editingId)?.title) {
      onUpdateItem(editingId, { title: trimmedText })
    }
    setEditingId(null)
  }

  const handleEditCancel = () => {
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const handleAddStart = (parentId: string) => {
    setAddingToId(parentId)
    setAddText('')
    setTimeout(() => addInputRef.current?.focus(), 100)
  }

  const handleAddSave = () => {
    const trimmedText = addText.trim()
    if (addingToId && trimmedText) {
      // Check for multi-line paste
      const lines = trimmedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter((line, index, arr) => arr.indexOf(line) === index) // De-dupe
      
      if (lines.length > 1) {
        // Bulk add
        lines.forEach(line => onAddItem(line, addingToId))
        setBulkAddCount(lines.length)
        setTimeout(() => setBulkAddCount(0), 3000)
      } else {
        // Single add
        onAddItem(trimmedText, addingToId)
      }
      
      setAddText('')
      // Keep input visible for rapid adding
      setTimeout(() => addInputRef.current?.focus(), 100)
    }
  }

  const handleAddCancel = () => {
    setAddingToId(null)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSave()
    } else if (e.key === 'Escape') {
      handleAddCancel()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('\n')) {
      setAddText(pastedText)
      e.preventDefault()
    }
  }

  function CompactTreeRow({ item, depth = 1 }: { item: TodoItem, depth?: number }) {
    const itemChildren = getChildren(item.id, allItems)
    const isEditing = editingId === item.id
    const isAdding = addingToId === item.id
    const isActive = activeId === item.id
    const dnd = useRowDnd(item.id)

    return (
      <div className={`ml-${(depth - 1) * 4}`} role="treeitem" aria-level={depth + 1}>
        <div ref={dnd.before.setNodeRef} className={`h-1 rounded ${dnd.before.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />

        <div ref={dnd.draggable.setNodeRef} className={`flex items-center space-x-2 py-1 rounded ${isActive ? 'ring-2 ring-accent-500 ring-offset-1' : ''} ${dnd.into.isOver ? 'outline outline-2 outline-primary-400' : ''}`}>
          <button {...dnd.draggable.listeners} {...dnd.draggable.attributes} className="w-4 h-4 cursor-grab text-zinc-400 hover:text-zinc-600" aria-label="Drag handle" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.preventDefault()}>
            ≡
          </button>

          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onUpdateItem(item.id, { completed: !item.completed })}
            className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
            onClick={(e) => e.stopPropagation()}
          />

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditSave}
              placeholder="Add a to-do…"
              className="input-base flex-1 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className={`flex-1 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                item.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
              }`}
              onClick={() => handleEditStart(item)}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${item.title}`}
            >
              {item.title}
            </span>
          )}

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleAddStart(item.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-xs"
              aria-label={`Add child to ${item.title}`}
            >
              +
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 text-xs"
              aria-label={`Delete ${item.title}`}
            >
              ×
            </button>
          </div>
        </div>
        <div ref={dnd.into.setNodeRef} className="sr-only" aria-hidden />

        {bulkAddCount > 0 && isAdding && (
          <div className="ml-6 mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
            Added {bulkAddCount} to-dos.
          </div>
        )}

        {isAdding && (
          <div className="ml-6 mt-1">
            <input
              ref={addInputRef}
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onPaste={handlePaste}
              onBlur={handleAddCancel}
              placeholder="Add a to-do…"
              className="input-base w-full text-sm"
            />
          </div>
        )}

        {depth === 1 && itemChildren.length > 0 && (
          <div className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2">
            {itemChildren.slice(0, 2).map(child => (
              <CompactTreeRow key={child.id} item={child} depth={depth + 1} />
            ))}
            {itemChildren.length > 2 && (
              <button
                onClick={() => setShowMoreDepth(depth + 1)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-1"
              >
                Show more
              </button>
            )}
          </div>
        )}

        <div ref={dnd.after.setNodeRef} className={`h-1 rounded ${dnd.after.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />
      </div>
    )
  }

  return (
    <div className="space-y-1" role="tree">
      {visibleChildren.map(item => (
        <CompactTreeRow key={item.id} item={item} depth={1} />
      ))}
      {hasMoreChildren && !showMoreDepth && (
        <button
          onClick={() => setShowMoreDepth(1)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-1"
        >
          Show more
        </button>
      )}
    </div>
  )
}

// FullTree Component
interface FullTreeProps {
  parentId: string
  allItems: TodoItem[]
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void
  onAddItem: (title: string, parentId: string | null) => void
  onDeleteItem: (itemId: string) => void
  onReparent: (nodeId: string, newParentId: string | null, position?: 'start'|'end'|number) => void
  onReorder: (nodeId: string, newIndex: number) => void
  activeId?: string | null
  overId?: string | null
}

function FullTree({
  parentId,
  allItems,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onReparent,
  onReorder,
  activeId,
  overId
}: FullTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [addText, setAddText] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [bulkAddCount, setBulkAddCount] = useState(0)
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const handleEditStart = (item: TodoItem) => {
    setEditingId(item.id)
    setEditText(item.title)
    setTimeout(() => editInputRef.current?.focus(), 100)
  }

  const handleEditSave = () => {
    const trimmedText = editText.trim()
    if (editingId && trimmedText && trimmedText !== allItems.find(i => i.id === editingId)?.title) {
      onUpdateItem(editingId, { title: trimmedText })
    }
    setEditingId(null)
  }

  const handleEditCancel = () => {
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const handleAddStart = (parentId: string) => {
    setAddingToId(parentId)
    setAddText('')
    setTimeout(() => addInputRef.current?.focus(), 100)
  }

  const handleAddSave = () => {
    const trimmedText = addText.trim()
    if (addingToId && trimmedText) {
      // Check for multi-line paste
      const lines = trimmedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter((line, index, arr) => arr.indexOf(line) === index) // De-dupe
      
      if (lines.length > 1) {
        // Bulk add
        lines.forEach(line => onAddItem(line, addingToId))
        setBulkAddCount(lines.length)
        setTimeout(() => setBulkAddCount(0), 3000)
      } else {
        // Single add
        onAddItem(trimmedText, addingToId)
      }
      
      setAddText('')
      // Keep input visible for rapid adding
      setTimeout(() => addInputRef.current?.focus(), 100)
    }
  }

  const handleAddCancel = () => {
    setAddingToId(null)
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSave()
    } else if (e.key === 'Escape') {
      handleAddCancel()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('\n')) {
      setAddText(pastedText)
      e.preventDefault()
    }
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(Array.from(prev))
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  function FullTreeRow({ item, depth = 1 }: { item: TodoItem, depth?: number }) {
    const itemChildren = getChildren(item.id, allItems)
    const isEditing = editingId === item.id
    const isAdding = addingToId === item.id
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = itemChildren.length > 0
    const isActive = activeId === item.id
    const dnd = useRowDnd(item.id)

    return (
      <div className={`ml-${(depth - 1) * 4}`} role="treeitem" aria-level={depth + 1} aria-expanded={hasChildren ? isExpanded : undefined}>
        <div ref={dnd.before.setNodeRef} className={`h-1 rounded ${dnd.before.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />

        <div ref={dnd.draggable.setNodeRef} className={`flex items-center space-x-2 py-1 rounded ${isActive ? 'ring-2 ring-accent-500 ring-offset-1' : ''} ${dnd.into.isOver ? 'outline outline-2 outline-primary-400' : ''}`}>
          <button {...dnd.draggable.listeners} {...dnd.draggable.attributes} className="w-4 h-4 cursor-grab text-zinc-400 hover:text-zinc-600" aria-label="Drag handle" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.preventDefault()}>
            ≡
          </button>

          {hasChildren && (
            <button
              onClick={() => toggleExpanded(item.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-xs w-4 h-4 flex items-center justify-center"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onUpdateItem(item.id, { completed: !item.completed })}
            className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
          />
          
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditSave}
              placeholder="Add a to-do…"
              className="input-base flex-1 text-sm"
            />
          ) : (
            <span 
              className={`flex-1 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                item.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
              }`}
              onClick={() => handleEditStart(item)}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${item.title}`}
            >
              {item.title}
            </span>
          )}
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleAddStart(item.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-xs"
              aria-label={`Add child to ${item.title}`}
            >
              +
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 text-xs"
              aria-label={`Delete ${item.title}`}
            >
              ×
            </button>
          </div>
        </div>
        <div ref={dnd.into.setNodeRef} className="sr-only" aria-hidden />

        {bulkAddCount > 0 && isAdding && (
          <div className="ml-6 mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
            Added {bulkAddCount} to-dos.
          </div>
        )}

        {isAdding && (
          <div className="ml-6 mt-1">
            <input
              ref={addInputRef}
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onPaste={handlePaste}
              onBlur={handleAddCancel}
              placeholder="Add a to-do…"
              className="input-base w-full text-sm"
            />
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2">
            {itemChildren.map(child => (
              <FullTreeRow key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}

        <div ref={dnd.after.setNodeRef} className={`h-1 rounded ${dnd.after.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />
      </div>
    )
  }

  const children = getChildren(parentId, allItems)

  return (
    <div className="space-y-1" role="tree">
      {children.map(item => (
        <FullTreeRow key={item.id} item={item} depth={1} />
      ))}
    </div>
  )
}
