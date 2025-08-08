'use client'

import { TodoItem, getRootGoals, getItemsAtLevel, getItemPath } from '@/utils/treeUtils'

interface FilteredTodosListProps {
  items: TodoItem[]
  allItems: TodoItem[]  // For getting parent titles
  filter: string
  onFilterChange: (filter: string) => void
  onItemToggle: (itemId: string) => void
  onItemRemove: (itemId: string) => void
  onItemClick: (itemId: string) => void
}

export default function FilteredTodosList({
  items,
  allItems,
  filter,
  onFilterChange,
  onItemToggle,
  onItemRemove,
  onItemClick
}: FilteredTodosListProps) {
  const getParentTitle = (parentId: string | null): string => {
    if (!parentId) return 'Top Level'
    const parent = allItems.find(item => item.id === parentId)
    return parent ? parent.title : 'Unknown Parent'
  }

  const getTopLevelGoals = () => {
    return getRootGoals(allItems)
  }

  const getAvailableLevels = () => {
    const levels = new Set(allItems.map(item => item.level))
    return Array.from(levels).sort()
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Filter To-Dos
        </label>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="input-base w-full"
        >
          <option value="all">All To-Dos ({allItems.length})</option>
          
          <optgroup label="By Parent Goal">
            {getTopLevelGoals().map(goal => {
              const childCount = allItems.filter(item => item.parentId === goal.id).length
              return (
                <option key={goal.id} value={goal.id}>
                  {goal.title} ({childCount} to-dos)
                </option>
              )
            })}
          </optgroup>
          
          <optgroup label="By Level">
            {getAvailableLevels().map(level => {
              const levelCount = allItems.filter(item => item.level === level).length
              return (
                <option key={level} value={`level-${level}`}>
                  Level {level} ({levelCount} items)
                </option>
              )
            })}
          </optgroup>
        </select>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🐝</div>
          <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            {filter === 'all' ? 'No to-dos yet' : 'Nothing here'}
          </h3>
          <p className="text-zinc-500 text-sm">
            {filter === 'all' 
              ? 'Create your first goal above to get started' 
              : 'Try adjusting your filter above'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="list-row cursor-pointer"
              onClick={() => onItemClick(item.id)}
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => {
                  e.stopPropagation()
                  onItemToggle(item.id)
                }}
                className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium truncate ${
                    item.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {item.title}
                  </span>
                  <span className="badge badge-neutral flex-shrink-0">
                    Level {item.level}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 truncate">
                  {getParentTitle(item.parentId)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onItemRemove(item.id)
                }}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-rose-500 rounded transition-colors flex-shrink-0"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
