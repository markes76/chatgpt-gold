# 🏆 ChatGPT Gold - AI Workspace Extension

Transform ChatGPT into a powerful, organized AI workspace with smart conversation organization, advanced prompt libraries, and enhanced search capabilities. Features a draggable sidebar with folder management, quick-access prompt templates, and seamless integration with ChatGPT's native interface.

![ChatGPT Gold Demo](https://img.shields.io/badge/Version-3.0.5-brightgreen) ![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🗂️ **Smart Conversation Organization**
- **Custom Folders**: Create folders with custom icons, colors, and names
- **Visual Indicators**: See folder assignments directly in ChatGPT's sidebar

### ⚡ **Advanced Prompt Library**
- **Custom Prompts**: Create, edit, and organize your prompt collection with live preview
- **Smart Categories**: Organize prompts by custom categories with icons and colors
- **Favorites System**: Star frequently used prompts for quick access
- **Quick Access**: Use `Ctrl+.` (or `Cmd+.` on Mac) for instant prompt dropdown
- **Variable Support**: Dynamic prompts with highlighted variable placeholders
- **Category Management**: Full CRUD operations for categories with visual organization
- **Modern UI**: Glassmorphism design for prompt interface with enhanced visual appeal

### 🔍 **Hybrid Search Enhancement**
- **Native Search Enhancement**: Injects extension results into ChatGPT's Cmd+K search
- **Advanced Search Overlay**: Standalone search interface with comprehensive filtering
- **Cross-Content Search**: Search across conversations, folders, and prompts simultaneously
- **Smart Filtering**: Filter by content type, date ranges, and folder assignments
- **Keyboard Shortcuts**: 
  - `Ctrl+K` (Cmd+K): Enhanced native search with extension results
  - `Ctrl+Shift+K` (Cmd+Shift+K): Advanced search overlay with filters

### ⌨️ **Productivity Shortcuts**
- `Ctrl+M` (Cmd+M): Toggle sidebar visibility
- `Ctrl+.` (Cmd+.): Quick prompts dropdown
- `Ctrl+K` (Cmd+K): Enhanced search
- `Ctrl+Shift+K` (Cmd+Shift+K): Advanced search overlay

### 🎨 **Customization Options**
- **Flexible Sidebar**: Draggable toggle, adjustable width
- **Theme Support**: Auto/Light/Dark modes with live switching (no refresh required)
- **Color Customization**: 12 pre-defined glass themes + custom color picker
- **Personalization**: Custom folder colors and icons, category management
- **Settings Management**: Comprehensive preferences with backup/restore
- **Professional Design**: Clean interface optimized for productivity

### 💾 **Backup & Data Management**
- **Complete Backup**: Export all data (prompts, folders, conversations, settings) in one file
- **Granular Export/Import**: Export specific data types (prompts only, folders only, settings only)
- **Data Portability**: JSON format for easy sharing and migration
- **Settings Backup**: Preserve themes, preferences, and customizations
- **Zero Data Loss**: Robust error handling and validation during import/export

## 🚀 Quick Start

### Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/markes76/chatgpt-gold.git
   cd chatgpt-gold
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" 
   - Select the extension folder

3. **Start Using**
   - Navigate to [ChatGPT](https://chatgpt.com)
   - The sidebar will appear automatically
   - Begin organizing your conversations!

### First Steps

1. **Create Your First Folder**
   - Click "📁 New Folder" in the sidebar
   - Choose a name, icon, and color
   - Click "Create"

2. **Add Current Conversation**
   - In any ChatGPT conversation, click "➕ Add Current"
   - Select your folder and customize the title
   - Click "Add"

3. **Create Custom Prompts**
   - Switch to the "⚡ Prompts" tab
   - Click "⚡ New Prompt"
   - Add title, description, category, and content
   - Use `Ctrl+.` to access quickly later

## 📖 Detailed Usage Guide

### Managing Conversations

#### Adding Conversations to Folders
1. Navigate to any ChatGPT conversation
2. Click "➕ Add Current" in the ChatGPT Gold sidebar
3. Choose a folder from the dropdown
4. Customize the conversation title if needed
5. Click "Add" to save

#### Moving Conversations
- Use the folder dropdown in the "Add Current" dialog
- Remove conversations by clicking the "×" next to them in folders
- Conversations remain in ChatGPT when removed from folders

#### Folder Management
- **Edit**: Click the ✏️ icon next to any folder name
- **Delete**: Click the 🗑️ icon (conversations won't be deleted)
- **Expand/Collapse**: Click folder names to toggle visibility

### Using the Prompt Library

#### Creating Effective Prompts
```
Title: Code Review Assistant
Category: Development
Description: Comprehensive code review for best practices

Content:
Please review this code for:
- Best practices and conventions
- Potential bugs or issues  
- Performance optimizations
- Security considerations
- Readability improvements

Code to review:
[PASTE YOUR CODE HERE]

Please provide specific suggestions with examples.
```

#### Quick Access Workflow
1. Press `Ctrl+.` (Cmd+. on Mac) anywhere in ChatGPT
2. Browse favorites or recent prompts
3. Click to instantly insert into the chat input
4. Customize placeholders as needed
5. Send your enhanced prompt

### Search & Discovery

#### Native Search Enhancement
- Press `Ctrl+K` as usual in ChatGPT
- Type your search query
- See ChatGPT Gold results appear above native results
- Click any extension result to navigate or use

#### Advanced Search Overlay
- Press `Ctrl+Shift+K` for the advanced search
- Filter by folder, type (conversations/prompts/folders)
- Search across all your organized content
- Click results to navigate or use prompts

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture with CSP compliance
- **Content Script Injection**: Dynamically injects sidebar UI and functionality into ChatGPT
- **Background Service Worker**: Handles Chrome storage, message passing, and persistence
- **Modular Design**: Separate managers for folders, prompts, search, and hotkeys
- **Hybrid Storage**: Chrome extension storage with localStorage fallback for reliability
- **Error Recovery**: Robust handling for "Extension context invalidated" scenarios
- **Modern UI Framework**: Glassmorphism design system with responsive layout
- **Performance Optimized**: Clean code architecture with minimal resource usage

### File Structure
```
chatgpt-gold/
├── manifest.json          # Extension configuration
├── content.js             # Main functionality & UI injection
├── folder-manager.js      # Conversation organization
├── prompt-manager.js      # Prompt library system
├── cmdk-enhancer.js       # Native search enhancement
├── hotkey-manager.js      # Keyboard shortcut handling
├── background.js          # Service worker & storage
├── styles.css             # Main UI styling
├── content-working-styles.css # Additional UI styles
├── popup.html/js          # Extension popup dashboard
├── options.html/js        # Settings & preferences
├── debug-hotkey.js        # Debug utilities
├── test-*.js              # Testing utilities
└── LICENSE                # MIT License
```

### Storage Schema
```javascript
// Folders
{
  id: 'folder_123',
  name: 'Work Projects',
  icon: '💼',
  color: '#10a37f',
  expanded: true,
  createdAt: 1640995200000,
  updatedAt: 1640995200000
}

// Conversations  
{
  id: 'conversation_456',
  title: 'API Design Discussion',
  folderId: 'folder_123',
  url: 'https://chatgpt.com/c/...',
  createdAt: 1640995200000,
  updatedAt: 1640995200000
}

// Prompts
{
  id: 'prompt_789',
  title: 'Code Reviewer',
  description: 'Review code for best practices',
  category: 'Development',
  content: 'Please review this code...',
  isFavorite: true,
  createdAt: 1640995200000,
  updatedAt: 1640995200000
}

// Categories
{
  name: 'Development',
  icon: '💻',
  color: '#3b82f6',
  expanded: true
}

// Settings
{
  theme: 'auto', // 'auto' | 'light' | 'dark'
  primaryColor: '#10a37f',
  extensionTitle: 'ChatGPT Gold',
  sidebarDefaultOpen: true,
  sidebarWidth: 350,
  showNotifications: true,
  notificationDuration: 3
}
```

## 🔒 Privacy & Security

- **Local Storage Only**: All data stored in your browser's local storage
- **No External Servers**: No data sent to external servers or APIs
- **Open Source**: Complete transparency with public source code
- **Minimal Permissions**: Only requests necessary Chrome extension permissions

### Required Permissions
- `storage`: Save your folders, conversations, and prompts locally
- `activeTab`: Interact with ChatGPT website for UI injection
- `scripting`: Inject the extension UI and functionality into ChatGPT
- `host_permissions`: Access ChatGPT domains (chatgpt.com, chat.openai.com)

### Browser Compatibility
- ✅ **Chrome**: Full support (Manifest V3)
- ✅ **Edge**: Full support (Chromium-based)
- ❌ **Firefox**: Not supported (requires Manifest V3 migration)
- ❌ **Safari**: Not supported (different extension architecture)

## 🛠️ Troubleshooting

### Common Issues

#### Extension Not Loading
- Ensure "Developer mode" is enabled in `chrome://extensions/`
- Refresh the extension by clicking the reload button
- Check browser console for errors (F12 > Console)

#### Sidebar Not Appearing
- Navigate to [ChatGPT](https://chatgpt.com) or [chat.openai.com](https://chat.openai.com)
- Press `Ctrl+M` (Cmd+M) to toggle sidebar visibility
- Check if extension is enabled in `chrome://extensions/`

#### Storage/Data Issues
- **"Extension context invalidated"**: The page will automatically show a refresh message - simply reload the page
- **Data not saving**: Extension automatically retries with fallback storage
- **Settings lost**: Check Chrome storage usage isn't at limit, use backup/restore feature
- **Performance issues**: Clear browser cache and restart Chrome
- **Import/Export problems**: Use the Options page (chrome://extensions/ → ChatGPT Gold → Options) for all backup operations

#### Search Not Working
- Try refreshing the ChatGPT page
- Check if content has been indexed (may take a moment for new conversations)
- Verify keyboard shortcuts aren't conflicting with other extensions

### Debug Mode
The extension includes debug utilities:
- Check browser console for detailed error logs
- Look for "ChatGPT Gold" prefixed messages
- Test files included for development diagnostics

## 🤝 Contributing

Contributions welcome! 

### Development Setup
1. Clone the repository
2. Load in Chrome developer mode
3. Make your changes
4. Test thoroughly with various ChatGPT scenarios
5. Submit a pull request

### Reporting Issues
- Use GitHub Issues for bug reports
- Include Chrome version and extension version
- Provide steps to reproduce the issue
- Include relevant console errors if any

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Repository**: [GitHub](https://github.com/markes76/chatgpt-gold)
- **Issues**: [Report Bugs](https://github.com/markes76/chatgpt-gold/issues)
- **Author**: markes76@gmail.com

## 🎯 Roadmap

### Implemented ✅
- ✅ **Local Storage**: Chrome extension storage with localStorage fallback
- ✅ **Folder Organization**: Full folder management with visual indicators
- ✅ **Prompt Library**: Complete prompt management with categories and favorites
- ✅ **Search Enhancement**: Both native integration and advanced overlay
- ✅ **Keyboard Shortcuts**: Comprehensive hotkey system
- ✅ **Settings Management**: Persistent preferences and customization
- ✅ **Export/Import**: Complete backup and restore functionality
- ✅ **Theme System**: Auto/Light/Dark modes with custom colors
- ✅ **Category Management**: Full CRUD operations for prompt categories
- ✅ **Modern UI**: Glassmorphism design system (prompt library)
- ✅ **Error Recovery**: Robust handling for extension context invalidation

### In Development 🚧
- 🚧 **Performance Optimization**: Further UI performance improvements
- 🚧 **Code Cleanup**: Removing experimental and test files
- 🚧 **Extended Themes**: Full glassmorphism throughout (currently prompt library only)

### Planned 🗺️
- 🗺️ **Cloud Sync**: Optional cloud synchronization
- 🗺️ **Team Sharing**: Share prompts and folders with team members
- 🗺️ **Advanced Analytics**: Usage statistics and insights
- 🗺️ **API Integration**: Connect with external tools and services
- 🗺️ **Response Tools**: Enhanced response management features

## 📋 Changelog

### Version 3.0.5 (Latest)
- 🔧 **Fixed**: Extension context invalidation errors with better error handling
- 🔧 **Fixed**: Broken button styling after glassmorphism cleanup
- 💾 **Fixed**: Complete backup/restore system overhaul (ZIP → JSON format)
- 🔧 **Fixed**: Modal close buttons and emoji picker positioning
- 🎨 **Improved**: Removed duplicate backup sections for cleaner UI
- 🎨 **Improved**: Dark mode compatibility (glassmorphism disabled for readability)

### Version 3.0.2-3.0.4
- 🎨 **Major**: Glassmorphism design system implementation (prompt library)
- 🔧 **Fixed**: Category management bugs (Work category display)
- 🎨 **Enhanced**: Emoji picker with 400+ emojis and search functionality
- 🔧 **Fixed**: Modal sizing and positioning issues
- 💾 **Enhanced**: Backup/restore with granular options
- 🎨 **Improved**: UI consistency between conversation and prompt libraries

### Version 3.0.0-3.0.1
- 🎨 **Major**: Complete UI/UX overhaul for professional appearance
- 🔧 **Fixed**: Prompt library interface and live preview improvements
- 🎨 **Enhanced**: Color picker and theme customization
- 🔧 **Fixed**: Various modal and dropdown positioning issues

## ⭐ Acknowledgments

- Built for the ChatGPT community
- Inspired by power users who need better organization
- Thanks to all contributors and users providing feedback

---

**Made with ❤️ for productive AI conversations**

*Transform your ChatGPT experience today!*
