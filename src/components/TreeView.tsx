'use client'

import { useState } from 'react'

interface TodoItem {
  id: string
  title: string
  completed: boolean
  parentId: string | null
  createdAt: number
}

interface TreeNode {
  item: TodoItem
  children: TreeNode[]
  level: number
}

interface TreeViewProps {
  nodes: TreeNode[]
  expandedItems: Set<string>
  onItemClick: (itemId: string) => void
  onItemToggle: (itemId: string) => void
  onItemRemove: (itemId: string) => void
  onAddSubItem: (parentId: string, title: string) => void
  onExpandToggle: (itemId: string) => void
}

export default function TreeView({
  nodes,
  expandedItems,
  onItemClick,
  onItemToggle,
  onItemRemove,
  onAddSubItem,
  onExpandToggle
}: TreeViewProps) {
  const [addingToParent, setAddingToParent] = useState<string | null>(null)
  const [newSubItemText, setNewSubItemText] = useState('')

  const handleAddSubItem = (parentId: string, e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = newSubItemText.trim()
    if (!text) return

    onAddSubItem(parentId, text)
    setNewSubItemText('')
    setAddingToParent(null)
  }

  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedItems.has(node.item.id)
    const isAddingHere = addingToParent === node.item.id

    return (
      <div key={node.item.id} className="space-y-2">
        {/* Node Row */}
        <div 
          className={`list-row group cursor-pointer ${
            node.level > 1 ? 'tree-indent' : ''
          } ${
            node.level === 2 ? 'ml-4' : 
            node.level === 3 ? 'ml-8' : 
            node.level === 4 ? 'ml-12' : 
            node.level === 5 ? 'ml-16' : 
            node.level >= 6 ? 'ml-20' : ''
          }`}
        >
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onExpandToggle(node.item.id)
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors rounded"
              >
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                  ▶
                </span>
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            {/* Checkbox */}
            <input
              type="checkbox"
              checked={node.item.completed}
              onChange={(e) => {
                e.stopPropagation()
                onItemToggle(node.item.id)
              }}
              className="w-4 h-4 text-primary-500 border-zinc-300 rounded focus:ring-primary-300 focus:ring-2 dark:border-zinc-600"
            />

            {/* Title and Level Badge */}
            <div 
              className="flex-1 flex items-center space-x-2"
              onClick={() => onItemClick(node.item.id)}
            >
              <span className={`font-medium ${
                node.item.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'
              }`}>
                {node.item.title}
              </span>
              <span className="badge badge-neutral">
                Level {node.level}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingToParent(node.item.id)
                }}
                className="btn-secondary text-xs h-8"
              >
                + Add to-do
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onItemRemove(node.item.id)
                }}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-rose-500 rounded transition-colors"
              >
                ⋯
              </button>
            </div>

          {/* Add Sub-Item Form */}
          {isAddingHere && (
            <div className="mt-3 pl-9 pr-3">
              <form onSubmit={(e) => handleAddSubItem(node.item.id, e)} className="flex space-x-2">
                <input
                  type="text"
                  value={newSubItemText}
                  onChange={(e) => setNewSubItemText(e.target.value)}
                  placeholder="Add a to-do..."
                  className="input-base flex-1 text-sm h-9"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newSubItemText.trim()}
                  className="btn-primary text-sm h-9 px-3"
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
                  className="btn-secondary text-sm h-9 px-3"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-2 transition-all duration-200">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          No goals yet
        </h3>
        <p className="text-zinc-500 text-sm">
          Add a goal above to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {nodes.map(node => renderNode(node))}
    </div>
  )
}
