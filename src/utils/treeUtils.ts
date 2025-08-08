export interface TodoItem {
  id: string
  title: string
  completed: boolean
  parentId: string | null  // null means it's a top-level goal
  createdAt: number
}

export interface TreeNode {
  item: TodoItem
  children: TreeNode[]
  level: number
}

/**
 * Get immediate children of an item
 */
export function getChildren(itemId: string, items: TodoItem[]): TodoItem[] {
  return items.filter(item => item.parentId === itemId)
}

/**
 * Get all descendants of an item (children, grandchildren, etc.)
 */
export function getDescendants(itemId: string, items: TodoItem[]): TodoItem[] {
  const descendants: TodoItem[] = []
  
  function collectDescendants(parentId: string) {
    const children = getChildren(parentId, items)
    children.forEach(child => {
      descendants.push(child)
      collectDescendants(child.id)
    })
  }
  
  collectDescendants(itemId)
  return descendants
}

/**
 * Get the chain of ancestors from root to the item (excluding the item itself)
 */
export function getAncestors(itemId: string, items: TodoItem[]): TodoItem[] {
  const ancestors: TodoItem[] = []
  
  function collectAncestors(currentId: string) {
    const item = items.find(i => i.id === currentId)
    if (item && item.parentId) {
      const parent = items.find(i => i.id === item.parentId)
      if (parent) {
        ancestors.unshift(parent) // Add to beginning to maintain root->leaf order
        collectAncestors(parent.id)
      }
    }
  }
  
  collectAncestors(itemId)
  return ancestors
}

/**
 * Compute the level (depth) of an item in the tree
 * Level 1 = root goals, Level 2 = first-level to-dos, etc.
 */
export function computeLevel(itemId: string, items: TodoItem[]): number {
  const item = items.find(i => i.id === itemId)
  if (!item || !item.parentId) return 1
  return 1 + computeLevel(item.parentId, items)
}

/**
 * Get the root goal (Level 1 parent) of any item
 */
export function getRootGoal(itemId: string, items: TodoItem[]): TodoItem | null {
  const item = items.find(i => i.id === itemId)
  if (!item) return null
  if (!item.parentId) return item // It's already a root goal
  return getRootGoal(item.parentId, items)
}

/**
 * Check if an item is a root goal (Level 1)
 */
export function isRootGoal(itemId: string, items: TodoItem[]): boolean {
  const item = items.find(i => i.id === itemId)
  return !item || !item.parentId
}

/**
 * Check if an item is a leaf (has no children)
 */
export function isLeaf(itemId: string, items: TodoItem[]): boolean {
  return getChildren(itemId, items).length === 0
}

/**
 * Get the path from root to an item as a string
 */
export function getItemPath(itemId: string, items: TodoItem[]): string {
  const ancestors = getAncestors(itemId, items)
  const item = items.find(i => i.id === itemId)
  if (!item) return ''
  
  const path = [...ancestors, item].map(item => item.title)
  return path.join(' › ')
}

/**
 * Build a tree structure from flat items array
 */
export function buildTree(items: TodoItem[]): TreeNode[] {
  const itemMap = new Map<string, TreeNode>()
  
  // Create nodes for all items
  items.forEach(item => {
    itemMap.set(item.id, {
      item,
      children: [],
      level: computeLevel(item.id, items)
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

/**
 * Get all items at a specific level
 */
export function getItemsAtLevel(level: number, items: TodoItem[]): TodoItem[] {
  return items.filter(item => computeLevel(item.id, items) === level)
}

/**
 * Get all root goals (Level 1 items)
 */
export function getRootGoals(items: TodoItem[]): TodoItem[] {
  return items.filter(item => !item.parentId)
}

/**
 * Get all to-dos (Level 2+ items)
 */
export function getAllTodos(items: TodoItem[]): TodoItem[] {
  return items.filter(item => item.parentId !== null)
}

/**
 * Check if adding a child would create a cycle
 */
export function wouldCreateCycle(parentId: string, childId: string, items: TodoItem[]): boolean {
  if (parentId === childId) return true
  
  const descendants = getDescendants(parentId, items)
  return descendants.some(desc => desc.id === childId)
}

/**
 * Get all items that can be a parent (excluding the item itself and its descendants)
 */
export function getValidParents(itemId: string, items: TodoItem[]): TodoItem[] {
  const item = items.find(i => i.id === itemId)
  if (!item) return items
  
  const descendants = getDescendants(itemId, items)
  const invalidIds = new Set([itemId, ...descendants.map(d => d.id)])
  
  return items.filter(item => !invalidIds.has(item.id))
}

/**
 * Move an item to a new parent
 */
export function moveItem(itemId: string, newParentId: string | null, items: TodoItem[]): TodoItem[] {
  if (newParentId && wouldCreateCycle(newParentId, itemId, items)) {
    throw new Error('Cannot move item: would create a cycle')
  }
  
  return items.map(item => 
    item.id === itemId 
      ? { ...item, parentId: newParentId }
      : item
  )
}

/**
 * Get the maximum depth in the tree
 */
export function getMaxDepth(items: TodoItem[]): number {
  if (items.length === 0) return 0
  
  return Math.max(...items.map(item => computeLevel(item.id, items)))
}

/**
 * Get statistics about the tree structure
 */
export function getTreeStats(items: TodoItem[]): {
  totalItems: number
  rootGoals: number
  todos: number
  maxDepth: number
  averageDepth: number
} {
  const totalItems = items.length
  const rootGoals = getRootGoals(items).length
  const todos = getAllTodos(items).length
  const maxDepth = getMaxDepth(items)
  const averageDepth = totalItems > 0 
    ? items.reduce((sum, item) => sum + computeLevel(item.id, items), 0) / totalItems
    : 0

  return {
    totalItems,
    rootGoals,
    todos,
    maxDepth,
    averageDepth
  }
}
