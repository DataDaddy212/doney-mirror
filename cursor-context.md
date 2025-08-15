---
# Doney — Cursor Development Context

## Vision
Doney is a collaborative goal + to-do network with infinite hierarchy. Any to-do can be a goal with its own to-dos. Tiles are editable inline (no separate detail page).

## Nomenclature
- Level 1 = **Goal** (root; parentId = null)
- Level 2+ = **To-Do** (child of any node). If a node has children, it's also a "Goal".
- "GoalTile-Tree-Inline" = editable tree inside each feed tile.

## Non-negotiable invariants
- Item: { id, title, completed, parentId|null, updatedAt }
- **No stored level**; compute `level` by ancestry: `computeLevel(id)`.
- **Any node can have children.**
- **No empty items**; composer creates only on confirm (Enter / Add).
- **Drafts per parent** restore if user exits without submitting.
- **DnD must support**: before/after sibling reordering; into (re-parent); promote to root; demote into another goal; prevent cycles.

## Utilities (must exist and be pure)
- getChildren(parentId): Item[]
- getAncestors(id): Item[]
- computeLevel(id): number (root=1)
- hasChildren(id): boolean
- isDescendant(sourceId, targetId): boolean
- reorderWithinParent(nodeId, newIndex): void
- reparent(nodeId, newParentId|null, position?: "start"|"end"|index): void
- reorderRoots(newOrder: string[]): void

## Composer (shared component)
- Triggered from popup and from any node's "Add to-do".
- Repeat-add; multi-line paste; drafts per parentId; no blank rows.

## DnD design
- Library: @dnd-kit (core/sortable/utilities).
- Per-row droppable zones: `::before`, `::into`, `::after`.
- Tile-level droppables: `tile::<goalId>::into` and feed root `feed::root`.
- Drag handles on row left; tile header handle for tiles.
- `<DragOverlay>` to avoid clipping; nested DndContexts allowed.

## Badges & counts
- When hasChildren(id), show "Goal" tag + "Level {computeLevel(id)}".
- Progress shows direct children only (X/Y).

## Accessibility
- role="tree"/"treeitem", aria-level, aria-expanded, keyboard: Enter/Esc for edit; Enter to add.

## Persistence
- LocalStorage for items, collapse state, and drafts.

## Order of work when confused
1) Invariants & pure utils
2) Composer everywhere
3) DnD insertion/re-parent (rows)
4) DnD demote/promote (tiles)
5) QA checklist
---

