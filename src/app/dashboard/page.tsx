'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GoalInput from '@/components/GoalInput'
import GoalDetailModal from '@/components/GoalDetailModal'
import PostGoalPrompt from '@/components/PostGoalPrompt'
import GoalTile from '@/components/GoalTile'
import { 
  TodoItem, 
  computeLevel, 
  getChildren, 
  getDescendants,
  reparent,
  reorderWithinParent,
  reorderRoots,
  isDescendant
} from '@/utils/treeUtils'
import { DndContext, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'

// Interface for goal flags
interface GoalFlags {
  [goalId: string]: {
    promptCompleted?: boolean
    promptSkipped?: boolean
  }
}

// Small sortable wrapper for tiles
function SortableTile({ goal, children }: { goal: TodoItem, children: (p: { setNodeRef: (el: HTMLElement|null)=>void, attributes: any, listeners: any, isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `tile::${goal.id}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties
  return (
    <div style={style}>
      {children({ setNodeRef, attributes, listeners, isDragging })}
    </div>
  )
}

export default function Dashboard() {
  const isBrowser = typeof document !== 'undefined'
  const [items, setItems] = useState<TodoItem[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedItem, setSelectedItem] = useState<TodoItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showPostGoalPrompt, setShowPostGoalPrompt] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalId, setNewGoalId] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showDevMenu, setShowDevMenu] = useState(false)
  const [goalFlags, setGoalFlags] = useState<GoalFlags>({})
  const router = useRouter()

  const sensors = useSensors(useSensor(PointerSensor))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [prevItemsForUndo, setPrevItemsForUndo] = useState<TodoItem[] | null>(null)

  const labelFor = (id: string) => items.find(i => i.id === id.replace('tile::',''))?.title ?? id

  const handleFeedDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    setActiveId(id)
    console.log('[FEED DnD] start', { activeId: id })
  }
  const handleFeedDragOver = (e: DragOverEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    if (activeId) console.log('[FEED DnD] over', { activeId, overId: o })
  }
  const handleFeedDragEnd = (e: DragEndEvent) => {
    const o = e.over?.id ? String(e.over.id) : null
    const a = activeId
    console.log('[FEED DnD] end', { activeId: a, overId: o })
    if (a && o && a !== o && a.startsWith('tile::') && o.startsWith('tile::')) {
      const roots = items.filter(i => i.parentId === null).map(i => i.id)
      const fromId = a.replace('tile::','')
      const toId = o.replace('tile::','')
      const fromIdx = roots.indexOf(fromId)
      const toIdx = roots.indexOf(toId)
      if (fromIdx !== -1 && toIdx !== -1) {
        const newOrder = roots.slice()
        newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, fromId)
        setItems(prev => reorderRoots(newOrder, prev))
        console.log('[FEED DnD] reorder roots', { fromId, toId })
      }
    }
    setActiveId(null)
  }

  const undoLastMove = () => {
    if (prevItemsForUndo) {
      setItems(prevItemsForUndo)
      setPrevItemsForUndo(null)
    }
  }

  function FeedRootDropZone() {
    const { setNodeRef, isOver } = useDroppable({ id: 'feed::root' })
    return <div ref={setNodeRef} className={`h-3 rounded ${isOver ? 'bg-accent-500/40' : 'bg-transparent'}`} aria-hidden />
  }

  function TileBefore({ goalId }: { goalId: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: `tile::${goalId}::before` })
    return <div ref={setNodeRef} className={`h-1 rounded ${isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />
  }
  function TileInto({ goalId, children }: { goalId: string, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: `tile::${goalId}::into` })
    return <div ref={setNodeRef} className={`${isOver ? 'outline outline-2 outline-primary-400' : ''}`}>{children}</div>
  }
  function TileAfter({ goalId }: { goalId: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: `tile::${goalId}::after` })
    return <div ref={setNodeRef} className={`h-1 rounded ${isOver ? 'bg-accent-500' : 'bg-transparent'}`} aria-hidden />
  }

  // Load data from localStorage on mount
  useEffect(() => {
    // Load items from localStorage
    const savedItems = localStorage.getItem('doney.items')
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems) as TodoItem[]
        setItems(parsedItems)
      } catch (error) {
        console.error('Failed to parse saved items:', error)
        // Clear corrupted data
        localStorage.removeItem('doney.items')
      }
    }

    // Load goal flags from localStorage
    const savedGoalFlags = localStorage.getItem('doney.goalFlags')
    if (savedGoalFlags) {
      try {
        const parsedFlags = JSON.parse(savedGoalFlags) as GoalFlags
        setGoalFlags(parsedFlags)
      } catch (error) {
        console.error('Failed to parse saved goal flags:', error)
        localStorage.removeItem('doney.goalFlags')
      }
    }

    // Set up default workspace if none exists
    const workspaceId = localStorage.getItem('workspaceId')
    const storedWorkspaceName = localStorage.getItem('workspaceName')
    
    if (!workspaceId) {
      // Create default workspace
      const defaultWorkspaceId = 'default-workspace'
      const defaultWorkspaceName = 'My Workspace'
      
      localStorage.setItem('workspaceId', defaultWorkspaceId)
      localStorage.setItem('workspaceName', defaultWorkspaceName)
      setWorkspaceName(defaultWorkspaceName)
    } else {
      setWorkspaceName(storedWorkspaceName || 'My Workspace')
    }
  }, [])

  // Save items to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('doney.items', JSON.stringify(items))
  }, [items])

  // Save goal flags to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('doney.goalFlags', JSON.stringify(goalFlags))
  }, [goalFlags])

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const handleLogout = () => {
    localStorage.removeItem('workspaceId')
    localStorage.removeItem('workspaceName')
    router.push('/')
  }

  // Reset data function
  const handleResetData = () => {
    localStorage.removeItem('doney.items')
    localStorage.removeItem('doney.goalFlags')
    setItems([])
    setGoalFlags({})
    setExpandedItems(new Set())
    setSelectedItem(null)
    setIsDetailModalOpen(false)
    setShowDevMenu(false)
  }

  // CRUD operations
  const addItem = (title: string, parentId: string | null = null) => {
    const newItem: TodoItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      completed: false,
      parentId,
      createdAt: Date.now()
    }
    setItems(prev => [...prev, newItem])
    
    // Show post-goal creation prompt only for top-level goals that haven't been completed or skipped
    if (!parentId) {
      const goalId = newItem.id
      const flags = goalFlags[goalId] || {}
      
      if (!flags.promptCompleted && !flags.promptSkipped) {
        setNewGoalTitle(title)
        setNewGoalId(goalId)
        setShowPostGoalPrompt(true)
      }
    }
    
    return newItem.id
  }

  const updateItem = (itemId: string, updates: Partial<TodoItem>) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, ...updates }
        : item
    ))
  }

  const toggleItem = (itemId: string) => {
    updateItem(itemId, { completed: !items.find(i => i.id === itemId)?.completed })
  }

  const removeItem = (itemId: string) => {
    // Remove item and all its descendants
    setItems(prev => {
      const descendants = getDescendants(itemId, prev)
      const idsToRemove = new Set([itemId, ...descendants.map(d => d.id)])
      return prev.filter(item => !idsToRemove.has(item.id))
    })
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null)
      setIsDetailModalOpen(false)
    }
  }

  // DnD move handlers
  const handleReparent = (nodeId: string, newParentId: string | null, position: 'start' | 'end' | number = 'end') => {
    setItems(prev => reparent(nodeId, newParentId, prev, position))
  }
  const handleReorder = (nodeId: string, newIndex: number) => {
    setItems(prev => reorderWithinParent(nodeId, newIndex, prev))
  }

  // Expand/collapse functionality
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(Array.from(prev).concat([itemId]))
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Interaction handlers
  const handleItemClick = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      setSelectedItem(item)
      setIsDetailModalOpen(true)
    }
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedItem(null)
  }

  // Post-goal creation handlers
  const handlePostGoalTodoAdd = (todoText: string) => {
    if (newGoalId) {
      addItem(todoText, newGoalId)
    }
  }

  const handlePostGoalClose = (action: 'done' | 'skip') => {
    if (newGoalId) {
      setGoalFlags(prev => ({
        ...prev,
        [newGoalId]: {
          ...prev[newGoalId],
          promptCompleted: action === 'done',
          promptSkipped: action === 'skip'
        }
      }))
      
      // After popup closes, auto-expand and scroll to the goal
      const goalItem = items.find(item => item.id === newGoalId)
      if (goalItem) {
        // Expand the goal
        setExpandedItems(prev => new Set(Array.from(prev).concat([newGoalId])))
        
        // Scroll to the goal after a short delay
        setTimeout(() => {
          const goalElement = document.querySelector(`[data-goal-id="${newGoalId}"]`)
          if (goalElement) {
            goalElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
          }
        }, 100)
      }
    }
    setShowPostGoalPrompt(false)
    setNewGoalId('')
  }

  const rootGoals = items.filter(item => !item.parentId)
  const tileIds = rootGoals.map(g => `tile::${g.id}`)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200/70 dark:border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🐝</span>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Doney</h1>
            </div>
            {workspaceName && (
              <span className="text-zinc-500 text-sm font-medium">
                {workspaceName}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Dev menu toggle */}
            <button
              onClick={() => setShowDevMenu(!showDevMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              title="Developer Menu"
            >
              <span className="text-lg">⚙️</span>
            </button>
            
            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="text-lg">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
            </button>
            
            {/* Reset workspace */}
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Dev Menu */}
      {showDevMenu && (
        <div className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Developer Menu
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetData}
                className="btn-secondary text-xs h-8 px-3 bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
              >
                Reset Data
              </button>
              <button
                onClick={() => setShowDevMenu(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Add Goal Input */}
        <div className="w-full max-w-2xl mx-auto">
          <GoalInput onGoalAdded={(title) => addItem(title, null)} />
        </div>

        {/* Goals Feed */}
        <DndContext sensors={sensors} onDragStart={handleFeedDragStart} onDragOver={handleFeedDragOver} onDragEnd={handleFeedDragEnd}>
          <SortableContext items={tileIds} strategy={verticalListSortingStrategy}>
            <div className={`space-y-4 ${activeId ? 'overflow-visible relative z-10' : ''}`}>
              {rootGoals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    No goals yet
                  </h3>
                  <p className="text-zinc-500 text-sm">
                    Add your first goal above to get started
                  </p>
                </div>
              ) : (
                rootGoals.map(goal => (
                  <SortableTile key={goal.id} goal={goal}>
                    {({ setNodeRef, attributes, listeners, isDragging }) => (
                      <div ref={setNodeRef} className={isDragging ? 'ring-2 ring-accent-500 ring-offset-1 rounded' : ''}>
                        <GoalTile
                          goal={goal}
                          allItems={items}
                          onUpdateItem={updateItem}
                          onAddItem={addItem}
                          onDeleteItem={removeItem}
                          onReparent={handleReparent}
                          onReorder={handleReorder}
                          // pass tile drag handle props into GoalTile header
                          tileHandleAttributes={attributes}
                          tileHandleListeners={listeners}
                          tileIsDragging={isDragging}
                        />
                      </div>
                    )}
                  </SortableTile>
                ))
              )}
            </div>
          </SortableContext>
          {isBrowser ? (
            createPortal(
              <DragOverlay>{activeId?.startsWith('tile::') ? (
                <div className="card p-3 text-sm">{items.find(i => i.id === activeId.replace('tile::',''))?.title}</div>
              ) : null}</DragOverlay>,
              document.body
            )
          ) : null}
        </DndContext>

        {/* Undo bar */}
        {prevItemsForUndo && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 text-white rounded-full px-4 py-2 shadow-lg">
            <span className="mr-3 text-sm">Move applied</span>
            <button onClick={undoLastMove} className="text-sm underline">Undo</button>
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      <GoalDetailModal 
        goal={selectedItem ? {
          id: selectedItem.id,
          title: selectedItem.title,
          completed: selectedItem.completed,
          todos: items.filter(item => item.parentId === selectedItem.id).map(item => ({
            id: item.id,
            title: item.title,
            completed: item.completed,
            children: [] // Simplified for modal view
          }))
        } : null}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onTodoAdd={(goalId, title) => addItem(title, goalId)}
        onTodoToggle={toggleItem}
        onTodoRemove={removeItem}
      />

      {/* Post-Goal Creation Prompt */}
      <PostGoalPrompt 
        goalTitle={newGoalTitle}
        goalId={newGoalId}
        isVisible={showPostGoalPrompt}
        onClose={handlePostGoalClose}
        onTodoAdd={handlePostGoalTodoAdd}
      />
    </div>
  )
}
