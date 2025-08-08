'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GoalInput from '@/components/GoalInput'
import TreeView from '@/components/TreeView'
import FilteredTodosList from '@/components/FilteredTodosList'
import GoalDetailModal from '@/components/GoalDetailModal'
import PostGoalPrompt from '@/components/PostGoalPrompt'

interface TodoItem {
  id: string
  title: string
  completed: boolean
  parentId: string | null  // null means it's a top-level goal
  createdAt: number
}

// Helper interfaces for UI components
interface TreeNode {
  item: TodoItem
  children: TreeNode[]
  level: number
}

export default function Dashboard() {
  const [items, setItems] = useState<TodoItem[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedItem, setSelectedItem] = useState<TodoItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showPostGoalPrompt, setShowPostGoalPrompt] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [todoFilter, setTodoFilter] = useState<'all' | string>('all') // 'all' or parentId or 'level-X'
  const [isDarkMode, setIsDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const workspaceId = localStorage.getItem('workspaceId')
    const storedWorkspaceName = localStorage.getItem('workspaceName')
    
    if (!workspaceId) {
      router.push('/')
      return
    }

    setWorkspaceName(storedWorkspaceName || '')
  }, [router])

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

  // Utility functions for tree operations
  const calculateLevel = (itemId: string, allItems: TodoItem[]): number => {
    const item = allItems.find(i => i.id === itemId)
    if (!item || !item.parentId) return 1
    return 1 + calculateLevel(item.parentId, allItems)
  }

  const buildTree = (items: TodoItem[]): TreeNode[] => {
    const itemMap = new Map<string, TreeNode>()
    
    // Create nodes for all items
    items.forEach(item => {
      itemMap.set(item.id, {
        item,
        children: [],
        level: calculateLevel(item.id, items)
      })
    })

    // Build the tree structure
    const roots: TreeNode[] = []
    items.forEach(item => {
      const node = itemMap.get(item.id)!
      if (item.parentId) {
        const parent = itemMap.get(item.parentId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const getTopLevelGoals = (): TreeNode[] => {
    return buildTree(items)
  }

  const getAllItemsFlat = () => {
    return items.map(item => ({
      ...item,
      level: calculateLevel(item.id, items)
    }))
  }

  const getFilteredItems = () => {
    const flatItems = getAllItemsFlat()
    
    if (todoFilter === 'all') {
      return flatItems
    }
    
    if (todoFilter.startsWith('level-')) {
      const targetLevel = parseInt(todoFilter.split('-')[1])
      return flatItems.filter(item => item.level === targetLevel)
    }
    
    // Filter by parent ID
    return flatItems.filter(item => item.parentId === todoFilter)
  }

  // CRUD operations
  const addItem = (title: string, parentId: string | null = null) => {
    const newItem: TodoItem = {
      id: `item-${Date.now()}`,
      title,
      completed: false,
      parentId,
      createdAt: Date.now()
    }
    setItems(prev => [...prev, newItem])
    
    // Show post-goal creation prompt only for top-level goals
    if (!parentId) {
      setNewGoalTitle(title)
      setShowPostGoalPrompt(true)
    }
    
    return newItem.id
  }

  const toggleItem = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, completed: !item.completed }
        : item
    ))
  }

  const removeItem = (itemId: string) => {
    // Remove item and all its children recursively
    const removeRecursively = (idToRemove: string) => {
      setItems(prev => {
        const children = prev.filter(item => item.parentId === idToRemove)
        children.forEach(child => removeRecursively(child.id))
        return prev.filter(item => item.id !== idToRemove)
      })
    }
    
    removeRecursively(itemId)
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(null)
      setIsDetailModalOpen(false)
    }
  }

  // Expand/collapse functionality
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
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
    // Find the most recently created top-level goal
    const topLevelGoals = items.filter(item => !item.parentId).sort((a, b) => b.createdAt - a.createdAt)
    const latestGoal = topLevelGoals[0]
    if (latestGoal) {
      addItem(todoText, latestGoal.id)
    }
    setShowPostGoalPrompt(false)
  }

  const handlePostGoalClose = () => {
    setShowPostGoalPrompt(false)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200/70 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
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
          
          {/* Future: Navigation tabs would go here */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="text-lg">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
            </button>
            {/* Future: Workspace switcher */}
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Goal Input - Full width, centered */}
        <div className="w-full max-w-2xl mx-auto">
          <GoalInput onGoalAdded={(title) => addItem(title, null)} />
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Goals</h2>
                <p className="text-sm text-zinc-500">Organize your goals into actionable steps</p>
              </div>
            </div>
            <div className="p-4">
              <TreeView 
                nodes={getTopLevelGoals()}
                expandedItems={expandedItems}
                onItemClick={handleItemClick}
                onItemToggle={toggleItem}
                onItemRemove={removeItem}
                onAddSubItem={(parentId, title) => addItem(title, parentId)}
                onExpandToggle={toggleExpanded}
              />
            </div>
          </div>

          {/* To-Dos Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">To-Dos</h2>
                <p className="text-sm text-zinc-500">All your to-dos in one place</p>
              </div>
            </div>
            <div className="p-4">
              <FilteredTodosList 
                items={getFilteredItems()}
                allItems={getAllItemsFlat()}
                filter={todoFilter}
                onFilterChange={setTodoFilter}
                onItemToggle={toggleItem}
                onItemRemove={removeItem}
                onItemClick={handleItemClick}
              />
            </div>
          </div>
        </div>
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
        isVisible={showPostGoalPrompt}
        onClose={handlePostGoalClose}
        onTodoAdd={handlePostGoalTodoAdd}
      />
    </div>
  )
}
