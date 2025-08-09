'use client'

import { useState } from 'react'
import { TodoItem, getChildren, getTreeStats, computeLevel, getDescendants } from '@/utils/treeUtils'

interface FeedProps {
  items: TodoItem[]
  allItems: TodoItem[]
  onItemClick: (itemId: string) => void
  onItemToggle: (itemId: string) => void
  onItemRemove: (itemId: string) => void
  onAddSubItem: (parentId: string, title: string) => void
}

type StatusFilter = 'all' | 'in-progress' | 'completed'
type SortOption = 'newest' | 'most-todos' | 'recently-updated'

interface FeedFilters {
  levels: number[]
  status: StatusFilter
  sort: SortOption
}

export default function Feed({
  items,
  allItems,
  onItemClick,
  onItemToggle,
  onItemRemove,
  onAddSubItem
}: FeedProps) {
  console.log('Feed component rendered with items:', items.length, 'allItems:', allItems.length)
  
  const [filters, setFilters] = useState<FeedFilters>({
    levels: [],
    status: 'all',
    sort: 'newest'
  })
  const [addingToParent, setAddingToParent] = useState<string | null>(null)
  const [newSubItemText, setNewSubItemText] = useState('')

  // Get available levels
  const availableLevels = Array.from(new Set(items.map(item => computeLevel(item.id, allItems)))).sort()

  // Filter items based on current filters
  const getFilteredItems = () => {
    let filtered = items

    // Level filter
    if (filters.levels.length > 0) {
      filtered = filtered.filter(item => filters.levels.includes(computeLevel(item.id, allItems)))
    }

    // Status filter
    if (filters.status === 'completed') {
      filtered = filtered.filter(item => item.completed)
    } else if (filters.status === 'in-progress') {
      filtered = filtered.filter(item => !item.completed)
    }

    // Sort items
    switch (filters.sort) {
      case 'newest':
        filtered = filtered.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'most-todos':
        filtered = filtered.sort((a, b) => {
          const aChildren = getDescendants(a.id, allItems).length
          const bChildren = getDescendants(b.id, allItems).length
          return bChildren - aChildren
        })
        break
      case 'recently-updated':
        // For now, use createdAt as proxy for "recently updated"
        // In a real app, you'd track lastModified
        filtered = filtered.sort((a, b) => b.createdAt - a.createdAt)
        break
    }

    return filtered
  }

  const handleAddSubItem = (parentId: string, e: React.FormEvent) => {
    e.preventDefault()
    const text = newSubItemText.trim()
    if (!text) return

    onAddSubItem(parentId, text)
    setNewSubItemText('')
    setAddingToParent(null)
  }

  const toggleLevelFilter = (level: number) => {
    setFilters(prev => ({
      ...prev,
      levels: prev.levels.includes(level)
        ? prev.levels.filter(l => l !== level)
        : [...prev.levels, level].sort()
    }))
  }

  const getItemStats = (item: TodoItem) => {
    const descendants = getDescendants(item.id, allItems)
    const totalChildren = descendants.length
    const completedChildren = descendants.filter(child => child.completed).length
    const percentage = totalChildren > 0 
      ? Math.round((completedChildren / totalChildren) * 100)
      : 0
    return { totalChildren, completedChildren, percentage }
  }

  const getMiniTreePreview = (item: TodoItem) => {
    const children = getChildren(item.id, allItems).slice(0, 2)
    return children
  }

  const filteredItems = getFilteredItems()

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="space-y-4">
        {/* Level Filter Chips */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Level Filter
          </label>
          <div className="flex flex-wrap gap-2">
            {availableLevels.map(level => (
              <button
                key={level}
                onClick={() => toggleLevelFilter(level)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.levels.includes(level)
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Status and Sort Controls */}
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as StatusFilter }))}
              className="input-base"
            >
              <option value="all">All</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Sort
            </label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as SortOption }))}
              className="input-base"
            >
              <option value="newest">Newest</option>
              <option value="most-todos">Most To-Dos</option>
              <option value="recently-updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🐝</div>
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {items.length === 0 ? 'No goals yet' : 'No items found'}
          </h3>
          <p className="text-zinc-500 text-sm">
            {items.length === 0 
              ? 'Add your first goal above to get started' 
              : 'Try adjusting your filters above'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const stats = getItemStats(item)
            const miniTree = getMiniTreePreview(item)
            
            return (
              <div
                key={item.id}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onItemClick(item.id)}
              >
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-zinc-900 dark:text-zinc-100 truncate ${
                        item.completed ? 'line-through text-zinc-400' : ''
                      }`}>
                        {item.title}
                      </h3>
                      <span className="badge badge-neutral text-xs mt-1">
                        Level {computeLevel(item.id, allItems)}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        e.stopPropagation()
                        onItemToggle(item.id)
                      }}
                      className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600 flex-shrink-0"
                    />
                  </div>

                  {/* Stats */}
                  {stats.totalChildren > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Progress</span>
                        <span>{stats.completedChildren}/{stats.totalChildren} ({stats.percentage}%)</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mini Tree Preview */}
                  {miniTree.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-500 font-medium">Recent to-dos:</div>
                      {miniTree.map((child) => (
                        <div key={child.id} className="flex items-center space-x-2 text-xs">
                          <input
                            type="checkbox"
                            checked={child.completed}
                            onChange={(e) => {
                              e.stopPropagation()
                              onItemToggle(child.id)
                            }}
                            className="w-3 h-3 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
                          />
                          <span className={`truncate ${
                            child.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
                          }`}>
                            {child.title}
                          </span>
                        </div>
                      ))}
                      {stats.totalChildren > 2 && (
                        <div className="text-xs text-zinc-400">
                          +{stats.totalChildren - 2} more...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAddingToParent(item.id)
                      }}
                      className="btn-secondary text-xs h-7 px-2"
                    >
                      + Add To-Do
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onItemRemove(item.id)
                      }}
                      className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-rose-500 rounded transition-colors"
                    >
                      ⋯
                    </button>
                  </div>

                  {/* Add Sub-Item Form */}
                  {addingToParent === item.id && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <form onSubmit={(e) => handleAddSubItem(item.id, e)} className="flex space-x-2">
                        <input
                          type="text"
                          value={newSubItemText}
                          onChange={(e) => setNewSubItemText(e.target.value)}
                          placeholder="Add a to-do..."
                          className="input-base flex-1 text-sm h-8"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newSubItemText.trim()}
                          className="btn-primary text-sm h-8 px-3"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddingToParent(null)
                            setNewSubItemText('')
                          }}
                          className="btn-secondary text-sm h-8 px-3"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
