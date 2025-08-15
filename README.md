# 🐝 Doney - The Ultimate To-Do List

A simple but powerful minimalistic to-do list application with **infinite nesting** capabilities. Every todo can have its own to-do list, creating a hierarchical structure that grows with your needs.

## ✨ Features

### 🎯 **Infinite Nesting**
- Items can have children (sub-items) with no depth limit
- Visual indentation shows hierarchy levels
- Clean, intuitive tree structure

### ✏️ **Inline Editing**
- Click any item to edit its text
- Press Enter to save changes
- Seamless editing experience

### 🔄 **Promote / Demote**
- Move items up a level (outdent) with the ← button
- Move items down a level (indent) with the → button
- Children move with their parent items
- Intuitive drag and drop for smooth reorganization

### 📁 **Collapse / Expand**
- Toggle children hidden/shown with the ▼/▶ button
- Maintains collapse states across sessions
- Clean, organized view of your tasks

### 💾 **Persistence**
- Automatically saves to `localStorage`
- Restores entire tree structure on page reload
- Maintains collapse states and hierarchy

### 🎨 **Beautiful Design**
- Minimalistic black/white/grey color scheme
- Bumblebee yellow accents for primary actions
- Smooth animations and transitions
- Responsive design for all devices

## 🚀 Getting Started

1. **Clone or download** the project files
2. **Open `index.html`** in your web browser
3. **Start organizing** your tasks!

## 🎮 How to Use

### Adding Items
- Click **"Add Item"** to create a new root-level item
- Click the **"+"** button on any item to add a sub-item

### Editing Items
- **Click** on any item's text to edit
- **Press Enter** to save changes
- **Click outside** to cancel editing

### Organizing Items
- **Drag and drop** items to reorder them
- **Drag to the top half** of an item to place it before
- **Drag to the bottom half** to make it a child
- Use **←** and **→** buttons for quick promote/demote

### Managing Items
- **Checkbox**: Mark items as complete
- **▼/▶**: Collapse/expand children
- **×**: Delete item and all its children

## 🛠️ Technical Details

- **Pure HTML/CSS/JavaScript** - No frameworks, no dependencies
- **LocalStorage** for data persistence
- **Drag and Drop API** for smooth interactions
- **Responsive design** with CSS Grid and Flexbox
- **Accessibility** features built-in

## 🎨 Design Philosophy

Doney follows a **minimalistic design approach**:
- Clean, uncluttered interface
- Intuitive visual hierarchy
- Smooth animations for better UX
- Bumblebee mascot for personality
- High contrast for readability

## 🔮 Future Enhancements

The codebase is designed to be easily extensible for features like:
- Due dates and reminders
- Priority levels
- Tags and categories
- Export/import functionality
- Cloud synchronization
- Team collaboration

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 Contributing

Feel free to fork this project and add your own features! The code is clean, well-commented, and ready for extension.

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Built with ❤️ by the Doney team**

*"Map your tasks, get stuff done"* 🐝

## 🚧 Known Limitations

The current MVP focuses on core functionality. These features are planned for the next iteration:

- **Drag and Drop Reorganization**: Full promote/demote functionality with visual feedback
- **Advanced Item Movement**: Before/after sibling reordering and re-parenting
- **Enhanced UX**: Better visual indicators for drag zones and drop targets

## 🔧 Technical Architecture

- **Data Store**: In-memory store with Map-based lookups for O(1) performance
- **No Recursion**: Eliminated circular dependencies that caused stack overflow
- **Debounced Persistence**: 200ms debounced localStorage saves for performance
- **Pure Functions**: `getVisibleLinearOrder()` provides clean data without side effects

