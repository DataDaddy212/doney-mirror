'use client'

import { useState, useRef, useEffect } from 'react'
import { TodoItem, getChildren, computeLevel, getDirectProgress, getDescendants, getSiblings, isDescendant } from '@/utils/treeUtils'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { createPortal } from 'react-dom'
import Composer from './Composer'
import InlineEdit from './InlineEdit'

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
  // Composer management
  activeComposerParentId: string | null
  openComposerFor: (parentId: string) => void
  closeComposer: () => void
  isComposerOpenFor: (parentId: string) => boolean
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
  activeComposerParentId,
  openComposerFor,
  closeComposer,
  isComposerOpenFor,
  tileHandleAttributes,
  tileHandleListeners,
  tileIsDragging
}: GoalTileProps) {
  const isBrowser = typeof document !== 'undefined'
  const [deletedItems, setDeletedItems] = useState<Map<string, { item: TodoItem, timestamp: number }>>(new Map())
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const directChildren = getChildren(goal.id, allItems)
  const progress = getDirectProgress(goal.id, allItems)
  const level = computeLevel(goal.id, allItems)

  const labelFor = (id: string) => allItems.find(i => i.id === id)?.title ?? id

  // Handle title editing
  const handleTitleSave = (newTitle: string) => {
    onUpdateItem(goal.id, { title: newTitle })
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
            <InlineEdit
              value={goal.title}
              onSave={handleTitleSave}
              placeholder="Rename goal…"
              className="text-lg font-medium text-zinc-900 dark:text-zinc-100 -mx-2"
            />
            <div className="flex items-center space-x-2 mt-2">
              {directChildren.length > 0 && (
                <span className="badge badge-primary text-xs">
                  Goal
                </span>
              )}
              <span className="badge badge-neutral text-xs">
                Level {level}
              </span>
              <span className="text-sm text-zinc-500">
                {progress.completed}/{progress.total} completed
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openComposerFor(goal.id)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={`Add to-do to ${goal.title}`}
              title="Add to-do"
            >
              +
            </button>
            <input
              type="checkbox"
              checked={goal.completed}
              onChange={() => onUpdateItem(goal.id, { completed: !goal.completed })}
              className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Conditional composer for adding to goal */}
      {isComposerOpenFor(goal.id) && (
        <div className="px-4 py-2 border-b border-zinc-200/70 dark:border-zinc-700">
          <Composer
            parentId={goal.id}
            onAddItem={onAddItem}
            placeholder="Add a to-do..."
          />
        </div>
      )}

      {/* Body - Tree */}
      <div className={`p-4 ${activeId ? 'overflow-visible relative z-10' : ''}`}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <RootDropZone />
          <FullTree
            parentId={goal.id}
            allItems={allItems}
            onUpdateItem={onUpdateItem}
            onAddItem={onAddItem}
            onDeleteItem={handleDeleteItem}
            onReparent={onReparent}
            onReorder={onReorder}
            activeComposerParentId={activeComposerParentId}
            openComposerFor={openComposerFor}
            closeComposer={closeComposer}
            isComposerOpenFor={isComposerOpenFor}
            activeId={activeId}
            overId={overId}
          />
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
  // Composer management
  activeComposerParentId: string | null
  openComposerFor: (parentId: string) => void
  closeComposer: () => void
  isComposerOpenFor: (parentId: string) => boolean
  activeId?: string | null
  overId?: string | null
}

function CompactTree({
  parentId,
  allItems,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  activeComposerParentId,
  openComposerFor,
  closeComposer,
  isComposerOpenFor,
  activeId,
  overId
}: CompactTreeProps) {
  const children = getChildren(parentId, allItems)
  const maxVisibleChildren = 3
  const hasMoreChildren = children.length > maxVisibleChildren
  const visibleChildren = children.slice(0, maxVisibleChildren)

  function CompactTreeRow({ 
    item, 
    depth = 1,
    activeComposerParentId,
    openComposerFor,
    closeComposer,
    isComposerOpenFor
  }: { 
    item: TodoItem, 
    depth?: number,
    activeComposerParentId: string | null,
    openComposerFor: (parentId: string) => void,
    closeComposer: () => void,
    isComposerOpenFor: (parentId: string) => boolean
  }) {
    const itemChildren = getChildren(item.id, allItems)
    const isActive = activeId === item.id

    return (
      <div style={{ marginLeft: `${(depth - 1) * 16}px` }} role="treeitem" aria-level={depth + 1} aria-selected="false">
        <div className="flex items-center space-x-2 py-1">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onUpdateItem(item.id, { completed: !item.completed })}
            className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
          />
          
          <div className="flex-1 flex items-center space-x-2">
            <InlineEdit
              value={item.title}
              onSave={(newTitle) => onUpdateItem(item.id, { title: newTitle })}
              placeholder="Add a to-do…"
              className={`text-sm ${
                item.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            />
            {itemChildren.length > 0 && (
              <span className="badge badge-primary text-xs">
                Goal
              </span>
            )}
            <span className="badge badge-neutral text-xs">
              Level {depth}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openComposerFor(item.id)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={`Add to-do to ${item.title}`}
              title="Add to-do"
            >
              +
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 text-xs p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label={`Delete ${item.title}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Conditional composer for adding children */}
        {isComposerOpenFor(item.id) && (
          <div className="ml-6 mt-2">
            <Composer
              parentId={item.id}
              onAddItem={onAddItem}
              placeholder="Add a to-do..."
            />
          </div>
        )}

        {/* Render children recursively */}
        {itemChildren.length > 0 && (
          <div className="space-y-2">
            {itemChildren.map(child => (
              <CompactTreeRow 
                key={child.id} 
                item={child} 
                depth={depth + 1}
                activeComposerParentId={activeComposerParentId}
                openComposerFor={openComposerFor}
                closeComposer={closeComposer}
                isComposerOpenFor={isComposerOpenFor}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1" role="tree">
      {visibleChildren.map(item => (
        <CompactTreeRow 
          key={item.id} 
          item={item} 
          depth={1}
          activeComposerParentId={activeComposerParentId}
          openComposerFor={openComposerFor}
          closeComposer={closeComposer}
          isComposerOpenFor={isComposerOpenFor}
        />
      ))}
      
      {hasMoreChildren && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 ml-4">
          +{children.length - maxVisibleChildren} more items
        </div>
      )}

      {/* Plus button for adding to parent */}
      <div className="ml-4 mt-2">
        <button
          onClick={() => openComposerFor(parentId)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Add to-do to parent"
          title="Add to-do"
        >
          +
        </button>
      </div>

      {/* Conditional composer for adding to parent */}
      {isComposerOpenFor(parentId) && (
        <div className="ml-4 mt-2">
          <Composer
            parentId={parentId}
            onAddItem={onAddItem}
            placeholder="Add a to-do..."
          />
        </div>
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
  // Composer management
  activeComposerParentId: string | null
  openComposerFor: (parentId: string) => void
  closeComposer: () => void
  isComposerOpenFor: (parentId: string) => boolean
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
  activeComposerParentId,
  openComposerFor,
  closeComposer,
  isComposerOpenFor,
  activeId,
  overId
}: FullTreeProps) {

  function FullTreeRow({ 
    item, 
    depth = 1,
    activeComposerParentId,
    openComposerFor,
    closeComposer,
    isComposerOpenFor
  }: { 
    item: TodoItem, 
    depth?: number,
    activeComposerParentId: string | null,
    openComposerFor: (parentId: string) => void,
    closeComposer: () => void,
    isComposerOpenFor: (parentId: string) => boolean
  }) {
    const itemChildren = getChildren(item.id, allItems)
    const hasChildren = itemChildren.length > 0
    const isActive = activeId === item.id
    const dnd = useRowDnd(item.id)

    return (
      <div style={{ marginLeft: `${(depth - 1) * 16}px` }} role="treeitem" aria-level={depth + 1} aria-selected="false">
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
          />
          
          <div className="flex-1 flex items-center space-x-2">
            <InlineEdit
              value={item.title}
              onSave={(newTitle) => onUpdateItem(item.id, { title: newTitle })}
              placeholder="Add a to-do…"
              className={`text-sm ${
                item.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            />
            {itemChildren.length > 0 && (
              <span className="badge badge-primary text-xs">
                Goal
              </span>
            )}
            <span className="badge badge-neutral text-xs">
              Level {depth}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => openComposerFor(item.id)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={`Add to-do to ${item.title}`}
              title="Add to-do"
            >
              +
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 text-xs p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label={`Delete ${item.title}`}
            >
              ×
            </button>
          </div>
        </div>
        <div ref={dnd.into.setNodeRef} className="sr-only" aria-hidden />

        {/* Conditional composer for adding children */}
        {isComposerOpenFor(item.id) && (
          <div className="ml-6 mt-2">
            <Composer
              parentId={item.id}
              onAddItem={onAddItem}
              placeholder="Add a to-do..."
            />
          </div>
        )}

        {/* Render children recursively */}
        {hasChildren && (
          <div className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2">
            {itemChildren.map(child => (
              <FullTreeRow 
                key={child.id} 
                item={child} 
                depth={depth + 1}
                activeComposerParentId={activeComposerParentId}
                openComposerFor={openComposerFor}
                closeComposer={closeComposer}
                isComposerOpenFor={isComposerOpenFor}
              />
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
        <FullTreeRow 
          key={item.id} 
          item={item} 
          depth={1}
          activeComposerParentId={activeComposerParentId}
          openComposerFor={openComposerFor}
          closeComposer={closeComposer}
          isComposerOpenFor={isComposerOpenFor}
        />
      ))}
      
      {/* Plus button for adding to parent */}
      <div className="ml-4 mt-2">
        <button
          onClick={() => openComposerFor(parentId)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Add to-do to parent"
          title="Add to-do"
        >
          +
        </button>
      </div>

      {/* Conditional composer for adding to parent */}
      {isComposerOpenFor(parentId) && (
        <div className="ml-4 mt-2">
          <Composer
            parentId={parentId}
            onAddItem={onAddItem}
            placeholder="Add a to-do..."
          />
        </div>
      )}
    </div>
  )
}
