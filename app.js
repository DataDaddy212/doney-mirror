// Single-source-of-truth state container
const state = {
    byId: new Map(),            // id -> item
    childrenByParent: new Map(), // parentId|null -> [childIds]
    rootIds: [],                // convenience for parentId = null
    loaded: false
};

// Debounced save wrapper
let saveTimeout = null;
const debouncedSave = (fn, delay = 200) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(fn, delay);
};

class DoneyApp {
    constructor() {
        this.draggedItem = null;
        this.dragOverItem = null;
        this.dragOverPosition = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Doney app...');
        this.loadState();
        console.log('Loaded from storage:', { 
            rootIds: state.rootIds.length, 
            totalItems: state.byId.size 
        });
        this.setupEventListeners();
        this.render();
        console.log('Doney app initialization complete!');
    }

    setupEventListeners() {
        document.getElementById('addRootItem').addEventListener('click', () => this.showComposer());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        
        // Global drag and drop
        document.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.addEventListener('drop', (e) => this.handleDrop(e));
        document.addEventListener('dragend', () => this.handleDragEnd());
    }

    // Hydration (one place only)
    loadState() {
        const data = localStorage.getItem('doney-data');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.rebuildIndexesFromArray(parsed.items || []);
            } catch (e) {
                console.error('Failed to load data:', e);
                this.rebuildIndexesFromArray([]);
            }
        } else {
            this.rebuildIndexesFromArray([]);
        }
        state.loaded = true;
    }

    // Index builder (pure)
    rebuildIndexesFromArray(itemsArray) {
        // Clear all indexes
        state.byId.clear();
        state.childrenByParent.clear();
        state.rootIds = [];

        // Insert each item into byId
        itemsArray.forEach(item => {
            state.byId.set(item.id, item);
        });

        // Build childrenByParent index
        itemsArray.forEach(item => {
            const parentId = item.parentId || null;
            if (!state.childrenByParent.has(parentId)) {
                state.childrenByParent.set(parentId, []);
            }
            state.childrenByParent.get(parentId).push(item.id);
        });

        // Sort each childrenByParent array by order
        state.childrenByParent.forEach((childIds, parentId) => {
            childIds.sort((a, b) => {
                const itemA = state.byId.get(a);
                const itemB = state.byId.get(b);
                return (itemA.order || 0) - (itemB.order || 0);
            });
        });

        // Set rootIds
        state.rootIds = state.childrenByParent.get(null) || [];
    }

    // Saving (debounced)
    saveState() {
        debouncedSave(() => {
            const data = {
                items: Array.from(state.byId.values())
            };
            localStorage.setItem('doney-data', JSON.stringify(data));
            console.log('Saved to storage:', data.items.length, 'items');
        });
    }

    // Getters (no storage!)
    getAllItems() {
        return Array.from(state.byId.values());
    }

    getItemById(id) {
        return state.byId.get(id);
    }

    getChildren(parentId) {
        return state.childrenByParent.get(parentId) || [];
    }

    // Helper to ensure bucket exists
    ensureBucket(parentId) {
        const parentKey = parentId || null;
        if (!state.childrenByParent.has(parentKey)) {
            state.childrenByParent.set(parentKey, []);
        }
        return state.childrenByParent.get(parentKey);
    }

    // Add Item flow
    addItem({ parentId, text }) {
        if (!text || !text.trim()) return;

        console.log('Adding item:', { parentId, text });
        
        const newItem = {
            id: Date.now() + Math.random(),
            text: text.trim(),
            completed: false,
            collapsed: false,
            parentId: parentId,
            order: this.getNextOrder(parentId),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Add to state
        state.byId.set(newItem.id, newItem);

        if (parentId === null) {
            // Root item
            state.rootIds.push(newItem.id);
            console.log(`Added root item ${newItem.id}`);
        } else {
            // Sub-item
            const bucket = this.ensureBucket(parentId);
            bucket.push(newItem.id);
            console.log(`Added sub-item ${newItem.id} to parent ${parentId}`);
        }

        console.log('New item created:', newItem);
        console.log('Current state:', {
            rootIds: state.rootIds.length,
            totalItems: state.byId.size
        });
        
        this.saveState();
        this.render();
    }

    getNextOrder(parentId) {
        const bucket = this.ensureBucket(parentId);
        return bucket.length;
    }

    // Composer functions
    showComposer(parentId = null) {
        const composer = document.createElement('div');
        composer.className = 'composer';
        composer.innerHTML = `
            <div class="composer-content">
                <input type="text" class="composer-input" placeholder="Enter item name..." />
                <div class="composer-actions">
                    <button class="btn btn-secondary composer-cancel">Cancel</button>
                    <button class="btn btn-primary composer-create">Create</button>
                </div>
            </div>
        `;

        // Insert at the top of the items container
        const container = document.getElementById('itemsContainer');
        container.insertBefore(composer, container.firstChild);

        const input = composer.querySelector('.composer-input');
        const createBtn = composer.querySelector('.composer-create');
        const cancelBtn = composer.querySelector('.composer-cancel');

        input.focus();

        const cleanup = () => {
            composer.remove();
        };

        const createItem = () => {
            const text = input.value.trim();
            if (text) {
                this.addItem({ parentId, text });
            }
            cleanup();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createItem();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });

        createBtn.addEventListener('click', createItem);
        cancelBtn.addEventListener('click', cleanup);
    }

    // Item management functions
    toggleItem(id) {
        const item = this.getItemById(id);
        if (item) {
            item.completed = !item.completed;
            item.updatedAt = Date.now();
            this.saveState();
            this.render();
        }
    }

    toggleCollapse(id) {
        const item = this.getItemById(id);
        if (item) {
            item.collapsed = !item.collapsed;
            item.updatedAt = Date.now();
            this.saveState();
            this.render();
        }
    }

    deleteItem(id) {
        const item = this.getItemById(id);
        if (!item) return;

        // Remove from parent's children array
        if (item.parentId === null) {
            state.rootIds = state.rootIds.filter(rootId => rootId !== id);
        } else {
            const parentChildren = state.childrenByParent.get(item.parentId);
            if (parentChildren) {
                state.childrenByParent.set(item.parentId, 
                    parentChildren.filter(childId => childId !== id)
                );
            }
        }

        // Recursively delete all children
        this.deleteItemRecursive(id);
        
        this.saveState();
        this.render();
    }

    deleteItemRecursive(id) {
        const item = this.getItemById(id);
        if (!item) return;

        const children = this.getChildren(id);
        children.forEach(childId => {
            this.deleteItemRecursive(childId);
        });

        // Remove from state
        state.byId.delete(id);
    }

    // Inline editing
    startEditing(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const itemElement = document.querySelector(`[data-id="${itemId}"]`);
        const textElement = itemElement.querySelector('.item-text');
        
        if (!textElement) return;
        
        const originalText = item.text;
        
        textElement.contentEditable = true;
        textElement.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const saveText = () => {
            const newText = textElement.textContent.trim();
            if (newText && newText !== originalText) {
                item.text = newText;
                item.updatedAt = Date.now();
                this.saveState();
                this.render();
            } else {
                textElement.textContent = originalText;
            }
            textElement.contentEditable = false;
        };

        const cancelEdit = () => {
            textElement.textContent = originalText;
            textElement.contentEditable = false;
        };

        // Remove any existing event listeners
        textElement.removeEventListener('keydown', saveText);
        textElement.removeEventListener('blur', saveText);

        textElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveText();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });

        textElement.addEventListener('blur', saveText);
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all items? This cannot be undone.')) {
            state.byId.clear();
            state.childrenByParent.clear();
            state.rootIds = [];
            this.saveState();
            this.render();
        }
    }

    // Rendering (no storage reads!)
    render() {
        console.log('Rendering app with state:', {
            rootIds: state.rootIds.length,
            totalItems: state.byId.size
        });
        
        const container = document.getElementById('itemsContainer');
        if (!container) {
            console.error('Items container not found!');
            return;
        }
        
        container.innerHTML = '';

        if (state.rootIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No items yet. Click "Add Item" to get started!</p>
                </div>
            `;
            console.log('Rendered empty state');
            return;
        }

        state.rootIds.forEach(itemId => {
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

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.dataset.id = item.id;
        itemDiv.draggable = true;

        itemDiv.innerHTML = `
            <div class="item-content">
                <div class="item-toggle ${item.completed ? 'checked' : ''}" 
                     onclick="app.toggleItem('${item.id}')">
                    ${item.completed ? '✓' : ''}
                </div>
                <div class="item-text" onclick="app.startEditing('${item.id}')">
                    ${item.text}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn" onclick="app.showComposer('${item.id}')" title="Add sub-item">
                    +
                </button>
                <button class="action-btn" onclick="app.toggleCollapse('${item.id}')" title="Toggle collapse">
                    ${item.collapsed ? '▶' : '▼'}
                </button>
                <button class="action-btn" onclick="app.deleteItem('${item.id}')" title="Delete">
                    ×
                </button>
            </div>
        `;

        // Add drag and drop event listeners
        itemDiv.addEventListener('dragstart', (e) => this.startDrag(e, item.id));

        // Render children if not collapsed
        const children = this.getChildren(item.id);
        if (children.length > 0 && !item.collapsed) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            
            children.forEach(childId => {
                const childElement = this.renderItem(childId);
                childrenContainer.appendChild(childElement);
            });
            
            itemDiv.appendChild(childrenContainer);
        }

        return itemDiv;
    }

    // Drag and Drop functionality (simplified for now)
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
    }

    handleDrop(e) {
        e.preventDefault();
        // Drag and drop implementation coming in next step
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
        items: [
            {
                id: 1,
                text: "Welcome to Doney! 🐝",
                completed: false,
                collapsed: false,
                parentId: null,
                order: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: 2,
                text: "This is your ultimate to-do list",
                completed: false,
                collapsed: false,
                parentId: null,
                order: 1,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        ]
    };
    localStorage.setItem('doney-data', JSON.stringify(sampleData));
}
