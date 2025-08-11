'use client'

import { useState } from 'react'
import { TodoItem, TreeNode } from '@/utils/treeUtils'
import Composer from './Composer'

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

  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children.length > 0

    return (
      <div key={node.item.id} className="space-y-2">
        {/* Node Row */}
        <div 
          className={`list-row group cursor-pointer ${
            node.level > 1 ? 'tree-indent' : ''
          }`}
          style={{ marginLeft: `${(node.level - 1) * 16}px` }}
          role="treeitem"
          aria-level={node.level}
          aria-selected="false"
        >
          <div className="w-6" />

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
            {node.children.length > 0 && (
              <span className="badge badge-primary mr-1">
                Goal
              </span>
            )}
            <span className="badge badge-neutral">
              Level {node.level}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>

        {/* Composer for adding children */}
        <div className="ml-9 mt-2">
          <Composer
            parentId={node.item.id}
            onAddItem={onAddSubItem}
            placeholder="Add a to-do..."
          />
        </div>

        {/* Render Children */}
        {hasChildren && (
          <div className="space-y-2">
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
