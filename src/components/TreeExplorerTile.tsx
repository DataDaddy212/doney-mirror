'use client'

import { useState, useRef, useEffect } from 'react'
import { TodoItem, getChildren, computeLevel, isDescendant } from '@/utils/treeUtils'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { createPortal } from 'react-dom'
import Composer from './Composer'
import InlineEdit from './InlineEdit'

// Helper to render a simple row preview for DragOverlay
function RowPreview({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-sm">
      {title}
    </div>
  )
}

interface TreeExplorerTileProps {
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
  // Draft management
  draftValue?: (parentId: string) => string
  onDraftChange?: (parentId: string, value: string) => void
  tileHandleAttributes?: any
  tileHandleListeners?: any
  tileIsDragging?: boolean
}

export default function TreeExplorerTile({ 
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
  draftValue,
  onDraftChange,
  tileHandleAttributes,
  tileHandleListeners,
  tileIsDragging
}: TreeExplorerTileProps) {
  const isBrowser = typeof document !== 'undefined'
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const labelFor = (id: string) => allItems.find(i => i.id === id)?.title ?? id

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    setActiveId(id)
    console.log('[DnD] start', { id, title: labelFor(id) })
  }

  const handleDragOver = (e: DragOverEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    setOverId(o)
    if (!activeId) return
    console.log('[DnD] over', { activeId, activeTitle: activeId ? labelFor(activeId) : 'unknown', overId: o })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    if (activeId) {
      console.log('[DnD] end', { activeId, activeTitle: labelFor(activeId), overId: o })
      if (o && o.includes('::')) {
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
            const sibs = getChildren(target.parentId || '', allItems)
            const tIdx = sibs.findIndex(s => s.id === targetId)
            const newIdx = zone === 'before' ? tIdx : tIdx + 1
            if (moving.parentId === target.parentId) {
              onReorder(activeId, newIdx)
            } else {
              onReparent(activeId, target.parentId || null, newIdx)
            }
          }
        }
      }
    }
    setActiveId(null)
    setOverId(null)
  }

  return (
    <div className={`card mb-4 ${tileIsDragging ? 'ring-2 ring-accent-500 ring-offset-1' : ''}`} data-goal-id={goal.id}>
      <div className="p-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <TreeExplorer
            rootItem={goal}
            allItems={allItems}
            onUpdateItem={onUpdateItem}
            onAddItem={onAddItem}
            onDeleteItem={onDeleteItem}
            onReparent={onReparent}
            onReorder={onReorder}
            activeComposerParentId={activeComposerParentId}
            openComposerFor={openComposerFor}
            closeComposer={closeComposer}
            isComposerOpenFor={isComposerOpenFor}
            draftValue={draftValue}
            onDraftChange={onDraftChange}
            activeId={activeId}
            overId={overId}
            tileHandleAttributes={tileHandleAttributes}
            tileHandleListeners={tileHandleListeners}
          />
          {isBrowser ? (
            createPortal(
              <DragOverlay>{activeId ? <RowPreview title={labelFor(activeId)} /> : null}</DragOverlay>,
              document.body
            )
          ) : null}
        </DndContext>
      </div>
    </div>
  )
}

// Hook to wire a row as draggable with handle and three droppable zones
function useRowDnd(rowId: string) {
  const draggable = useDraggable({ id: rowId })
  const before = useDroppable({ id: `${rowId}::before` })
  const into = useDroppable({ id: `${rowId}::into` })
  const after = useDroppable({ id: `${rowId}::after` })
  return { draggable, before, into, after }
}

// NodeRow component - renders a single row in the tree
interface NodeRowProps {
  item: TodoItem
  depth: number
  allItems: TodoItem[]
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void
  onAddItem: (title: string, parentId: string | null) => void
  onDeleteItem: (itemId: string) => void
  onReparent: (nodeId: string, newParentId: string | null, position?: 'start'|'end'|number) => void
  onReorder: (nodeId: string, newIndex: number) => void
  activeComposerParentId: string | null
  openComposerFor: (parentId: string) => void
  closeComposer: () => void
  isComposerOpenFor: (parentId: string) => boolean
  draftValue?: (parentId: string) => string
  onDraftChange?: (parentId: string, value: string) => void
  activeId?: string | null
  overId?: string | null
}

function NodeRow({
  item,
  depth,
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
  draftValue,
  onDraftChange,
  activeId,
  overId
}: NodeRowProps) {
  const itemChildren = getChildren(item.id, allItems)
  const hasChildren = itemChildren.length > 0
  const isActive = activeId === item.id
  const dnd = useRowDnd(item.id)

  return (
    <div className="relative">
      {/* Before drop zone */}
      <div ref={dnd.before.setNodeRef} className={`h-1 rounded ${dnd.before.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />

      {/* Main row */}
      <div 
        ref={dnd.draggable.setNodeRef} 
        className={`flex items-center space-x-2 py-2 rounded ${isActive ? 'ring-2 ring-accent-500 ring-offset-1' : ''} ${dnd.into.isOver ? 'outline outline-2 outline-primary-400' : ''}`}
        style={{ marginLeft: `${(depth - 1) * 16}px` }}
      >
        {/* Drag handle */}
        <button 
          {...dnd.draggable.listeners} 
          {...dnd.draggable.attributes} 
          className="w-4 h-4 cursor-grab text-zinc-400 hover:text-zinc-600" 
          aria-label="Drag handle" 
          onMouseDown={(e) => e.stopPropagation()} 
          onClick={(e) => e.preventDefault()}
        >
          ≡
        </button>
        
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => onUpdateItem(item.id, { completed: !item.completed })}
          className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
        />
        
        {/* Title with inline edit */}
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={item.title}
            onSave={(newTitle) => onUpdateItem(item.id, { title: newTitle })}
            placeholder="Add a to-do…"
            className={`text-sm ${
              item.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          />
        </div>
        
        {/* Big + button */}
        <button
          onClick={() => openComposerFor(item.id)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Add to-do"
          title="Add to-do"
        >
          +
        </button>
      </div>

      {/* Into drop zone (hidden but accessible) */}
      <div ref={dnd.into.setNodeRef} className="sr-only" aria-hidden />

      {/* Composer for this row */}
      {isComposerOpenFor(item.id) && (
        <div className="ml-6 mt-2">
          <Composer
            parentId={item.id}
            onAddItem={onAddItem}
            placeholder="Add a to-do..."
            draftValue={draftValue?.(item.id) || ''}
            onDraftChange={onDraftChange}
          />
        </div>
      )}

      {/* Children */}
      {hasChildren && (
        <div className="ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2">
          {itemChildren.map(child => (
            <NodeRow
              key={child.id}
              item={child}
              depth={depth + 1}
              allItems={allItems}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
              onReparent={onReparent}
              onReorder={onReorder}
              activeComposerParentId={activeComposerParentId}
              openComposerFor={openComposerFor}
              closeComposer={closeComposer}
              isComposerOpenFor={isComposerOpenFor}
              draftValue={draftValue}
              onDraftChange={onDraftChange}
              activeId={activeId}
              overId={overId}
            />
          ))}
        </div>
      )}

      {/* After drop zone */}
      <div ref={dnd.after.setNodeRef} className={`h-1 rounded ${dnd.after.isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />
    </div>
  )
}

// Main tree explorer component
interface TreeExplorerProps {
  rootItem: TodoItem
  allItems: TodoItem[]
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => void
  onAddItem: (title: string, parentId: string | null) => void
  onDeleteItem: (itemId: string) => void
  onReparent: (nodeId: string, newParentId: string | null, position?: 'start'|'end'|number) => void
  onReorder: (nodeId: string, newIndex: number) => void
  activeComposerParentId: string | null
  openComposerFor: (parentId: string) => void
  closeComposer: () => void
  isComposerOpenFor: (parentId: string) => boolean
  draftValue?: (parentId: string) => string
  onDraftChange?: (parentId: string, value: string) => void
  activeId?: string | null
  overId?: string | null
  tileHandleAttributes?: any
  tileHandleListeners?: any
}

function TreeExplorer({
  rootItem,
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
  draftValue,
  onDraftChange,
  activeId,
  overId,
  tileHandleAttributes,
  tileHandleListeners
}: TreeExplorerProps) {
  const children = getChildren(rootItem.id, allItems)

  return (
    <div className="space-y-1" role="tree">
      {/* Root goal row */}
      <div className="relative">
        <div className="flex items-center space-x-2 py-2">
          {/* Tile drag handle */}
          <button 
            {...(tileHandleAttributes||{})} 
            {...(tileHandleListeners||{})} 
            className="w-4 h-4 cursor-grab text-zinc-400 hover:text-zinc-600" 
            aria-label="Reorder goal tile" 
            onMouseDown={(e)=>e.stopPropagation()} 
            onClick={(e)=>e.preventDefault()}
          >
            ≡
          </button>
          
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={rootItem.completed}
            onChange={() => onUpdateItem(rootItem.id, { completed: !rootItem.completed })}
            className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
          />
          
          {/* Title with inline edit */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={rootItem.title}
              onSave={(newTitle) => onUpdateItem(rootItem.id, { title: newTitle })}
              placeholder="Rename goal…"
              className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
            />
          </div>
          
          {/* Big + button */}
          <button
            onClick={() => openComposerFor(rootItem.id)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="Add to-do"
            title="Add to-do"
          >
            +
          </button>
        </div>

        {/* Composer for root */}
        {isComposerOpenFor(rootItem.id) && (
          <div className="ml-6 mt-2">
            <Composer
              parentId={rootItem.id}
              onAddItem={onAddItem}
              placeholder="Add a to-do..."
              draftValue={draftValue?.(rootItem.id) || ''}
              onDraftChange={onDraftChange}
            />
          </div>
        )}
      </div>

      {/* Children rows */}
      {children.map(item => (
        <NodeRow
          key={item.id}
          item={item}
          depth={1}
          allItems={allItems}
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onReparent={onReparent}
          onReorder={onReorder}
          activeComposerParentId={activeComposerParentId}
          openComposerFor={openComposerFor}
          closeComposer={closeComposer}
          isComposerOpenFor={isComposerOpenFor}
          draftValue={draftValue}
          onDraftChange={onDraftChange}
          activeId={activeId}
          overId={overId}
        />
      ))}
    </div>
  )
}
