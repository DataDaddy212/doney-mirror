class DoneyApp {
    constructor() {
        this.items = [];
        this.allItems = new Map(); // Use Map for O(1) lookup
        this.draggedItem = null;
        this.dragOverItem = null;
        this.dragOverPosition = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Doney app...');
        this.loadFromStorage();
        console.log('Loaded from storage:', { items: this.items, allItems: this.allItems.size });
        this.setupEventListeners();
        this.render();
        console.log('Doney app initialization complete!');
    }

    setupEventListeners() {
        document.getElementById('addRootItem').addEventListener('click', () => this.addItem());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        
        // Global drag and drop
        document.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.addEventListener('drop', (e) => this.handleDrop(e));
        document.addEventListener('dragend', () => this.handleDragEnd());
    }

    addItem(parentId = null, text = 'New Item') {
        console.log('Adding item:', { parentId, text });
        
        const newItem = {
            id: Date.now() + Math.random(),
            text: text,
            completed: false,
            collapsed: false,
            children: [],
            parentId: parentId,
            level: parentId ? this.getItemById(parentId).level + 1 : 0
        };

        // Add to allItems map
        this.allItems.set(newItem.id, newItem);

        if (parentId) {
            const parent = this.getItemById(parentId);
            if (parent) {
                parent.children.push(newItem.id);
                console.log(`Added sub-item ${newItem.id} to parent ${parentId}`);
            } else {
                console.error(`Parent item ${parentId} not found!`);
            }
        } else {
            this.items.push(newItem.id);
            console.log(`Added root item ${newItem.id}`);
        }

        console.log('New item created:', newItem);
        console.log('Current items:', this.items);
        
        this.saveToStorage();
        this.render();
        
        // Focus on the new item for editing
        setTimeout(() => {
            const newItemElement = document.querySelector(`[data-id="${newItem.id}"] .item-text`);
            if (newItemElement) {
                newItemElement.focus();
                newItemElement.select();
            }
        }, 100);
    }

    getItemById(id) {
        return this.allItems.get(id);
    }

    getAllItems() {
        return Array.from(this.allItems.values());
    }

    toggleItem(id) {
        const item = this.getItemById(id);
        if (item) {
            item.completed = !item.completed;
            this.saveToStorage();
            this.render();
        }
    }

    toggleCollapse(id) {
        const item = this.getItemById(id);
        if (item) {
            item.collapsed = !item.collapsed;
            this.saveToStorage();
            this.render();
        }
    }

    deleteItem(id) {
        const item = this.getItemById(id);
        if (!item) return;

        // Remove from parent's children array
        if (item.parentId) {
            const parent = this.getItemById(item.parentId);
            if (parent) {
                parent.children = parent.children.filter(childId => childId !== id);
            }
        } else {
            this.items = this.items.filter(itemId => itemId !== id);
        }

        // Recursively delete all children
        this.deleteItemRecursive(id);
        
        this.saveToStorage();
        this.render();
    }

    deleteItemRecursive(id) {
        const item = this.getItemById(id);
        if (!item) return;

        item.children.forEach(childId => {
            this.deleteItemRecursive(childId);
        });

        // Remove from allItems map
        this.allItems.delete(id);
    }

    promoteItem(id) {
        const item = this.getItemById(id);
        if (!item || !item.parentId) return;

        const parent = this.getItemById(item.parentId);
        if (!parent) return;

        // Remove from current parent
        parent.children = parent.children.filter(childId => childId !== id);
        
        // Add to parent's parent
        if (parent.parentId) {
            const grandParent = this.getItemById(parent.parentId);
            if (grandParent) {
                grandParent.children.push(id);
                item.parentId = parent.parentId;
            }
        } else {
            this.items.push(id);
            item.parentId = null;
        }

        item.level = item.level - 1;
        this.saveToStorage();
        this.render();
    }

    demoteItem(id) {
        const item = this.getItemById(id);
        if (!item) return;

        // Find the previous sibling to become the new parent
        const siblings = this.getSiblings(id);
        const itemIndex = siblings.findIndex(sibling => sibling.id === id);
        
        if (itemIndex > 0) {
            const newParent = siblings[itemIndex - 1];
            
            // Remove from current parent
            if (item.parentId) {
                const currentParent = this.getItemById(item.parentId);
                if (currentParent) {
                    currentParent.children = currentParent.children.filter(childId => childId !== id);
                }
            } else {
                this.items = this.items.filter(itemId => itemId !== id);
            }

            // Add to new parent
            newParent.children.push(id);
            item.parentId = newParent.id;
            item.level = newParent.level + 1;
            
            this.saveToStorage();
            this.render();
        }
    }

    getSiblings(id) {
        const item = this.getItemById(id);
        if (!item) return [];

        if (item.parentId) {
            const parent = this.getItemById(item.parentId);
            return parent ? parent.children.map(childId => this.getItemById(childId)).filter(Boolean) : [];
        } else {
            return this.items.map(itemId => this.getItemById(itemId)).filter(Boolean);
        }
    }

    // Drag and Drop functionality
    startDrag(e, itemId) {
        this.draggedItem = itemId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', itemId);
        
        const draggedElement = e.target.closest('.item');
        if (draggedElement) {
            draggedElement.classList.add('dragging');
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const itemElement = e.target.closest('.item');
        if (!itemElement || !this.draggedItem) return;

        const itemId = itemElement.dataset.id;
        if (itemId === this.draggedItem) return;

        // Clear previous drag over states
        document.querySelectorAll('.drag-over, .drag-over-child').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-child');
        });

        const rect = itemElement.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            itemElement.classList.add('drag-over');
            this.dragOverPosition = 'before';
        } else {
            itemElement.classList.add('drag-over-child');
            this.dragOverPosition = 'child';
        }
        
        this.dragOverItem = itemId;
    }

    handleDrop(e) {
        e.preventDefault();
        
        if (!this.draggedItem || !this.dragOverItem) return;

        const draggedItem = this.getItemById(this.draggedItem);
        const targetItem = this.getItemById(this.dragOverItem);
        
        if (!draggedItem || !targetItem) return;

        // Prevent dropping on itself or its descendants
        if (this.isDescendant(this.draggedItem, this.dragOverItem)) return;

        if (this.dragOverPosition === 'before') {
            this.moveItemBefore(this.draggedItem, this.dragOverItem);
        } else if (this.dragOverPosition === 'child') {
            this.moveItemAsChild(this.draggedItem, this.dragOverItem);
        }

        this.saveToStorage();
        this.render();
        
        this.clearDragState();
    }

    moveItemBefore(movedId, targetId) {
        const movedItem = this.getItemById(movedId);
        const targetItem = this.getItemById(targetId);
        
        if (!movedItem || !targetItem) return;

        // Remove from current position
        this.removeItemFromParent(movedId);
        
        // Insert before target
        if (targetItem.parentId) {
            const parent = this.getItemById(targetItem.parentId);
            const index = parent.children.indexOf(targetId);
            parent.children.splice(index, 0, movedId);
            movedItem.parentId = targetItem.parentId;
            movedItem.level = targetItem.level;
        } else {
            const index = this.items.indexOf(targetId);
            this.items.splice(index, 0, movedId);
            movedItem.parentId = null;
            movedItem.level = 0;
        }
        
        // Update levels of moved item and its descendants
        this.updateItemLevels(movedId, movedItem.level);
    }

    moveItemAsChild(movedId, targetId) {
        const movedItem = this.getItemById(movedId);
        const targetItem = this.getItemById(targetId);
        
        if (!movedItem || !targetItem) return;

        // Remove from current position
        this.removeItemFromParent(movedId);
        
        // Add as child
        targetItem.children.push(movedId);
        movedItem.parentId = targetId;
        movedItem.level = targetItem.level + 1;
        
        // Update levels of moved item and its descendants
        this.updateItemLevels(movedId, movedItem.level);
    }

    removeItemFromParent(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (item.parentId) {
            const parent = this.getItemById(item.parentId);
            if (parent) {
                parent.children = parent.children.filter(childId => childId !== itemId);
            }
        } else {
            this.items = this.items.filter(id => id !== itemId);
        }
    }

    updateItemLevels(itemId, newLevel) {
        const item = this.getItemById(itemId);
        if (!item) return;

        item.level = newLevel;
        item.children.forEach(childId => {
            this.updateItemLevels(childId, newLevel + 1);
        });
    }

    isDescendant(potentialParentId, potentialChildId) {
        const parent = this.getItemById(potentialParentId);
        if (!parent) return false;

        if (parent.children.includes(potentialChildId)) return true;
        
        return parent.children.some(childId => this.isDescendant(childId, potentialChildId));
    }

    handleDragEnd() {
        this.clearDragState();
    }

    clearDragState() {
        this.draggedItem = null;
        this.dragOverItem = null;
        this.dragOverPosition = null;
        
        document.querySelectorAll('.dragging, .drag-over, .drag-over-child').forEach(el => {
            el.classList.remove('dragging', 'drag-over', 'drag-over-child');
        });
    }

    // Inline editing
    startEditing(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const itemElement = document.querySelector(`[data-id="${itemId}"]`);
        const textElement = itemElement.querySelector('.item-text');
        
        if (!textElement) return;
        
        textElement.contentEditable = true;
        textElement.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Handle save on Enter or blur
        const saveText = () => {
            const newText = textElement.textContent.trim();
            if (newText && newText !== item.text) {
                item.text = newText;
                this.saveToStorage();
                this.render();
            }
            textElement.contentEditable = false;
        };

        // Remove any existing event listeners to prevent duplicates
        textElement.removeEventListener('keydown', saveText);
        textElement.removeEventListener('blur', saveText);

        textElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveText();
            }
        });

        textElement.addEventListener('blur', saveText);
    }

    // Storage
    saveToStorage() {
        const data = {
            items: this.items,
            allItems: Array.from(this.allItems.entries())
        };
        localStorage.setItem('doney-data', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('doney-data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.items = parsed.items || [];
                this.allItems = new Map(parsed.allItems || []);
            } catch (e) {
                console.error('Failed to load data:', e);
                this.items = [];
                this.allItems = new Map();
            }
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all items? This cannot be undone.')) {
            this.items = [];
            this.allItems.clear();
            this.saveToStorage();
            this.render();
        }
    }

    // Rendering
    render() {
        console.log('Rendering app with items:', this.items);
        const container = document.getElementById('itemsContainer');
        if (!container) {
            console.error('Items container not found!');
            return;
        }
        
        container.innerHTML = '';

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No items yet. Click "Add Item" to get started!</p>
                </div>
            `;
            console.log('Rendered empty state');
            return;
        }

        this.items.forEach(itemId => {
            const itemElement = this.renderItem(itemId);
            container.appendChild(itemElement);
        });
        
        console.log('Rendering complete');
    }

    renderItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) {
            console.error(`Item ${itemId} not found!`);
            return document.createElement('div');
        }

        console.log(`Rendering item:`, item);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.dataset.id = item.id;
        itemDiv.draggable = true;

        itemDiv.innerHTML = `
            <div class="item-content">
                ${this.renderIndent(item.level)}
                <div class="item-toggle ${item.completed ? 'checked' : ''}" 
                     onclick="app.toggleItem('${item.id}')">
                    ${item.completed ? '✓' : ''}
                </div>
                <div class="item-text" onclick="app.startEditing('${item.id}')">
                    ${item.text}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn" onclick="app.addItem('${item.id}')" title="Add sub-item">
                    +
                </button>
                <button class="action-btn" onclick="app.toggleCollapse('${item.id}')" title="Toggle collapse">
                    ${item.collapsed ? '▶' : '▼'}
                </button>
                <button class="action-btn" onclick="app.promoteItem('${item.id}')" title="Promote (outdent)">
                    ←
                </button>
                <button class="action-btn" onclick="app.demoteItem('${item.id}')" title="Demote (indent)">
                    →
                </button>
                <button class="action-btn" onclick="app.deleteItem('${item.id}')" title="Delete">
                    ×
                </button>
            </div>
        `;

        // Add drag and drop event listeners
        itemDiv.addEventListener('dragstart', (e) => this.startDrag(e, item.id));

        // Render children if not collapsed
        if (item.children.length > 0 && !item.collapsed) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            
            item.children.forEach(childId => {
                const childElement = this.renderItem(childId);
                childrenContainer.appendChild(childElement);
            });
            
            itemDiv.appendChild(childrenContainer);
        }

        return itemDiv;
    }

    renderIndent(level) {
        if (level === 0) return '';
        return `<div class="item-indent level-${level}"></div>`;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Doney app...');
    try {
        window.app = new DoneyApp();
        console.log('Doney app initialized successfully!');
    } catch (error) {
        console.error('Error initializing Doney app:', error);
    }
});

// Add some sample data for first-time users
if (!localStorage.getItem('doney-data')) {
    const sampleData = {
        items: [1, 2],
        allItems: [
            [1, {
                id: 1,
                text: "Welcome to Doney! 🐝",
                completed: false,
                collapsed: false,
                children: [3, 4],
                parentId: null,
                level: 0
            }],
            [2, {
                id: 2,
                text: "This is your ultimate to-do list",
                completed: false,
                collapsed: false,
                children: [],
                parentId: null,
                level: 0
            }],
            [3, {
                id: 3,
                text: "Click to edit any item",
                completed: false,
                collapsed: false,
                children: [],
                parentId: 1,
                level: 1
            }],
            [4, {
                id: 4,
                text: "Drag and drop to reorganize",
                completed: false,
                collapsed: false,
                children: [],
                parentId: 1,
                level: 1
            }]
        ]
    };
    localStorage.setItem('doney-data', JSON.stringify(sampleData));
}
