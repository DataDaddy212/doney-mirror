export interface TodoItem {
  id: string
  title: string
  completed: boolean
  parentId: string | null  // null means it's a top-level goal
  createdAt: number
  updatedAt?: number
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
  return path.join(' > ')
}

/**
 * Build a tree structure from flat items array
 */
export function buildTree(items: TodoItem[]): TreeNode[] {
  const itemMap = new Map<string, TodoItem>()
  const childrenMap = new Map<string, TodoItem[]>()
  
  // Build maps
  items.forEach(item => {
    itemMap.set(item.id, item)
    if (item.parentId) {
      const children = childrenMap.get(item.parentId) || []
      children.push(item)
      childrenMap.set(item.parentId, children)
    }
  })
  
  // Build tree recursively
  function buildNode(item: TodoItem, level: number): TreeNode {
    const children = childrenMap.get(item.id) || []
    return {
      item,
      level,
      children: children.map(child => buildNode(child, level + 1))
    }
  }
  
  // Return root nodes only
  return items
    .filter(item => !item.parentId)
    .map(item => buildNode(item, 1))
}

/**
 * Get items at a specific level
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
 * Get all to-dos (non-root items)
 */
export function getAllTodos(items: TodoItem[]): TodoItem[] {
  return items.filter(item => item.parentId !== null)
}

/**
 * Check if moving an item would create a cycle
 */
export function wouldCreateCycle(parentId: string, childId: string, items: TodoItem[]): boolean {
  if (parentId === childId) return true
  
  const parent = items.find(i => i.id === parentId)
  if (!parent) return false
  
  return wouldCreateCycle(parent.parentId || '', childId, items)
}

/**
 * Get valid parent options for an item (excluding itself and descendants)
 */
export function getValidParents(itemId: string, items: TodoItem[]): TodoItem[] {
  return items.filter(item => 
    item.id !== itemId && 
    !wouldCreateCycle(itemId, item.id, items)
  )
}

/**
 * Move an item to a new parent
 */
export function moveItem(itemId: string, newParentId: string | null, items: TodoItem[]): TodoItem[] {
  if (newParentId && wouldCreateCycle(newParentId, itemId, items)) {
    return items // Don't move if it would create a cycle
  }
  
  return items.map(item => 
    item.id === itemId 
      ? { ...item, parentId: newParentId }
      : item
  )
}

/**
 * Get the maximum depth of the tree
 */
export function getMaxDepth(items: TodoItem[]): number {
  if (items.length === 0) return 0
  
  function getDepth(itemId: string, visited: Set<string> = new Set()): number {
    if (visited.has(itemId)) return 0 // Prevent cycles
    visited.add(itemId)
    
    const children = getChildren(itemId, items)
    if (children.length === 0) return 1
    
    return 1 + Math.max(...children.map(child => getDepth(child.id, visited)))
  }
  
  const rootItems = getRootGoals(items)
  return rootItems.length > 0 
    ? Math.max(...rootItems.map(item => getDepth(item.id)))
    : 0
}

/**
 * Get tree statistics
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
  
  const totalDepth = items.reduce((sum, item) => sum + computeLevel(item.id, items), 0)
  const averageDepth = totalItems > 0 ? totalDepth / totalItems : 0
  
  return {
    totalItems,
    rootGoals,
    todos,
    maxDepth,
    averageDepth
  }
}

/**
 * Get direct progress for a parent item (direct children only)
 */
export function getDirectProgress(parentId: string, items: TodoItem[]): {
  completed: number
  total: number
} {
  const children = getChildren(parentId, items)
  const completed = children.filter(child => child.completed).length
  const total = children.length
  
  return { completed, total }
}

/** Determine if sourceId is a descendant of targetId */
export function isDescendant(sourceId: string, targetId: string, items: TodoItem[]): boolean {
  if (sourceId === targetId) return true
  const descendants = getDescendants(targetId, items)
  return descendants.some(d => d.id === sourceId)
}

/** Get siblings (ordered by original array order) for a given parent */
export function getSiblings(parentId: string | null, items: TodoItem[]): TodoItem[] {
  return items.filter(i => i.parentId === parentId)
}

/** Reorder node within its current parent to a new index (stable, reorders array) */
export function reorderWithinParent(nodeId: string, newIndex: number, items: TodoItem[]): TodoItem[] {
  const node = items.find(i => i.id === nodeId)
  if (!node) return items
  const siblings = getSiblings(node.parentId, items)
  const currentIndexInSiblings = siblings.findIndex(s => s.id === nodeId)
  if (currentIndexInSiblings === -1) return items
  const siblingIds = siblings.map(s => s.id)
  siblingIds.splice(currentIndexInSiblings, 1)
  const boundedIndex = Math.max(0, Math.min(newIndex, siblingIds.length))
  siblingIds.splice(boundedIndex, 0, nodeId)
  // Rebuild items array keeping overall order but adjusting sibling relative order
  const setSiblingOrder = new Map<string, number>(siblingIds.map((id, idx) => [id, idx]))
  const reordered = [...items]
  // Stable sort only siblings relative to each other by mapping order
  reordered.sort((a, b) => {
    const aIs = a.parentId === node.parentId && setSiblingOrder.has(a.id)
    const bIs = b.parentId === node.parentId && setSiblingOrder.has(b.id)
    if (aIs && bIs) return (setSiblingOrder.get(a.id)! - setSiblingOrder.get(b.id)!)
    if (aIs) return -1
    if (bIs) return 1
    return 0
  })
  return reordered
}

/** Reparent a node to a new parent (or null) and place at position (start|end|index) */
export function reparent(
  nodeId: string,
  newParentId: string | null,
  items: TodoItem[],
  position: 'start' | 'end' | number = 'end'
): TodoItem[] {
  const node = items.find(i => i.id === nodeId)
  if (!node) return items
  // Prevent cycles: cannot move under its own descendant
  if (newParentId && isDescendant(newParentId, nodeId, items)) return items
  // Update parentId
  const updated = items.map(i => i.id === nodeId ? { ...i, parentId: newParentId, updatedAt: Date.now() } : i)
  // Place in new sibling order
  const siblings = getSiblings(newParentId, updated)
  const targetIds = siblings.filter(s => s.id !== nodeId).map(s => s.id)
  const idx = typeof position === 'number'
    ? Math.max(0, Math.min(position, targetIds.length))
    : (position === 'start' ? 0 : targetIds.length)
  targetIds.splice(idx, 0, nodeId)
  const orderMap = new Map<string, number>(targetIds.map((id, i) => [id, i]))
  const resorted = [...updated]
  resorted.sort((a, b) => {
    const aIs = a.parentId === newParentId && orderMap.has(a.id)
    const bIs = b.parentId === newParentId && orderMap.has(b.id)
    if (aIs && bIs) return (orderMap.get(a.id)! - orderMap.get(b.id)!)
    if (aIs) return -1
    if (bIs) return 1
    return 0
  })
  return resorted
}

/** Reorder root goals (parentId === null) by new order of ids; other items keep relative order */
export function reorderRoots(newRootOrder: string[], items: TodoItem[]): TodoItem[] {
  const rootSet = new Set(items.filter(i => i.parentId === null).map(i => i.id))
  // Filter provided order to only existing root ids, and append any missing roots at end (defensive)
  const normalized = newRootOrder.filter(id => rootSet.has(id))
  for (const id of Array.from(rootSet)) {
    if (!normalized.includes(id)) normalized.push(id)
  }
  const orderMap = new Map<string, number>(normalized.map((id, idx) => [id, idx]))
  const reordered = [...items]
  reordered.sort((a, b) => {
    const aRoot = a.parentId === null
    const bRoot = b.parentId === null
    if (aRoot && bRoot) return (orderMap.get(a.id)! - orderMap.get(b.id)!)
    if (aRoot) return -1
    if (bRoot) return 1
    return 0
  })
  return reordered
}
