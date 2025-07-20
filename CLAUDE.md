# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatGPT Gold is a Chrome extension (Manifest V3) that transforms ChatGPT into an organized AI workspace. It adds a sidebar with folder management, prompt libraries, search enhancement, and keyboard shortcuts to the ChatGPT web interface.

## Architecture

This is a browser extension with no build system - files are used directly:

- **Content Scripts**: Injected into ChatGPT web pages for UI enhancement
- **Background Service Worker**: Handles storage, messaging, and Chrome API calls
- **Modular Design**: Separate manager classes for different features
- **Storage**: Chrome extension storage with localStorage fallback
- **No Package Manager**: Pure JavaScript with no dependencies

## Core Components

- `content.js` - Main content script that initializes the extension UI
- `folder-manager.js` - Handles conversation organization and folder management  
- `prompt-manager.js` - Manages custom prompt library with categories and favorites
- `cmdk-enhancer.js` - Enhances ChatGPT's native Cmd+K search functionality
- `hotkey-manager.js` - Keyboard shortcut handling (Ctrl+M, Ctrl+., etc.)
- `background.js` - Service worker for storage and message passing
- `popup.html/js` - Extension popup dashboard
- `options.html/js` - Settings and preferences page

## Development Commands

Since this is a browser extension with no build system:

**Load extension in Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked"
4. Select this directory

**Testing:**
- Load extension and navigate to chatgpt.com
- Check browser console (F12) for "ChatGPT Gold" prefixed logs
- Test keyboard shortcuts: Ctrl+M (sidebar), Ctrl+. (prompts), Ctrl+K (search)

**No lint/build/test commands** - this is vanilla JavaScript

## Key Features Architecture

**Folder System:**
- Conversations organized into custom folders with icons/colors
- Visual indicators in ChatGPT's native sidebar
- Drag-and-drop reordering and management

**Prompt Library:**
- Custom prompts with categories, favorites, and templates
- Quick access via Ctrl+. hotkey with dropdown interface
- Import/export functionality for sharing prompts

**Search Enhancement:**
- Injects results into ChatGPT's native Cmd+K search
- Advanced overlay with filtering (Ctrl+Shift+K)
- Searches across conversations, folders, and prompts

**Storage Schema:**
```javascript
// Folders: cg-folders
{ id, name, icon, color, expanded, createdAt, updatedAt }

// Conversations: cg-conversations  
{ id, title, folderId, url, createdAt, updatedAt }

// Prompts: cg-prompts
{ id, title, description, category, content, isFavorite, createdAt, updatedAt }
```

## Content Security Policy

Manifest V3 with strict CSP - no inline scripts, only approved resources. All functionality implemented through content scripts and background workers.

## Error Handling

Extensive retry logic for "Extension context invalidated" scenarios common with Manifest V3. Chrome storage operations have localStorage fallbacks for reliability.

## Recent Updates

### Commit #3 - Compact Interface Redesign (v2.0.8)
**Date**: January 2025
**Changes**: Complete UI overhaul for space-efficient interface design

**Major Improvements**:
1. **Compact Dropdown Interface**:
   - Replaced multiple sort buttons with single dropdown menus
   - Added separate ascending/descending buttons (↑↓) 
   - Consistent design across both Conversations and Prompts sections
   - Custom dropdown styling with proper arrow positioning

2. **Expand/Collapse Controls**:
   - Created dedicated compact row for "Expand All/Collapse All" functionality
   - Fixed non-working expand/collapse buttons for both folders and prompts
   - Proper button text toggling between "Expand All" and "Collapse All" states
   - Event listener management improved to survive re-renders

3. **Category Toggle System**:
   - Implemented working expand/collapse for prompt categories
   - Direct button listeners for reliable event handling
   - State persistence across browser sessions
   - Visual feedback with arrow indicators (▶/▼)

4. **Code Cleanup**:
   - Removed all debug console.log statements
   - Streamlined event delegation system
   - Improved Chrome extension caching compatibility
   - Enhanced error handling for storage operations

**Technical Details**:
- Fixed dropdown arrow overlap with proper CSS padding
- Event listeners now re-attach after DOM re-renders
- Maintained localStorage fallback for storage reliability
- Version bumped to 2.0.8 for Chrome extension reload

**Files Modified**:
- `prompt-manager.js` - Compact UI implementation, category toggles
- `folder-manager.js` - Matching compact UI for consistency  
- `styles.css` - New dropdown and compact control styling
- `manifest.json` - Version bump for extension reload

**User Benefits**:
- Much cleaner, less cluttered interface
- Space-efficient design that doesn't overwhelm
- Reliable expand/collapse functionality
- Consistent sorting controls across all sections