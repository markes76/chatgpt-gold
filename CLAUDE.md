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

### Commit #4 - Centralized Import/Export System (v2.0.9)
**Date**: July 21, 2025
**Changes**: Complete overhaul of import/export functionality with centralized Options page management

**Major Improvements**:
1. **UI Decluttering**:
   - Removed all import/export buttons from Folders and Prompts sections
   - Removed import/export buttons from popup interface
   - Consolidated ALL backup operations into Options page only
   - Eliminated UI duplication and visual clutter

2. **Unified ZIP Export/Import**:
   - Added "Export Everything as ZIP" feature for complete backups
   - Creates separate JSON files for prompts, folders, conversations, settings, and metadata
   - ZIP import with user-friendly instructions modal
   - Single-file backup solution for easy sharing and archiving

3. **Granular Import/Export Sections**:
   - **Prompts Only**: Export/import just prompt library data
   - **Folders & Conversations**: Export/import folder structure and conversation locations
   - **Settings & Preferences**: Export/import extension settings and customizations
   - Each section handles multiple file formats for flexibility

4. **Complete JSON Backup**:
   - Enhanced traditional JSON export with all data types
   - Improved import validation and error handling
   - Backward compatibility with previous backup formats
   - Better user feedback and progress indicators

5. **Data Integrity & Validation**:
   - Comprehensive file format validation for all import operations
   - Support for multiple backup formats (new typed format + legacy)
   - Proper error handling with user-friendly messages
   - Version tracking in all export files

**Technical Details**:
- Removed 180+ lines of duplicate import/export code from prompt-manager.js
- Removed import/export methods from popup.js
- Added comprehensive export/import methods to options.js
- New CSS styling for backup action groups and granular sections
- Version validation and format detection for imports

**Files Modified**:
- `options.html` - New comprehensive backup interface
- `options.js` - Complete import/export system implementation
- `options-styles.css` - New backup interface styling
- `prompt-manager.js` - Removed duplicate import/export functionality
- `popup.html` - Removed import/export buttons
- `popup.js` - Removed import/export methods
- `manifest.json` - Version bump to 2.0.9

**User Benefits**:
- Single location for ALL backup operations (Options page)
- Much cleaner main UI without backup clutter
- Flexible backup options (ZIP, JSON, or granular)
- Better organization and discoverability of backup features
- Improved data portability and sharing capabilities

### Commit #5 - Prompt Library Aesthetic Overhaul (v2.1.0)
**Date**: July 21, 2025
**Changes**: Complete aesthetic and UX consistency upgrade for Prompt Library to match Conversation Library

**Major Improvements**:
1. **Visual Design Consistency**:
   - Added color-coded borders to prompt categories (matching folder design)
   - Added icons to each prompt category for better visual identification
   - Improved drag handle styling with consistent SVG icons
   - Enhanced hover effects and visual feedback throughout

2. **Enhanced Category Management**:
   - **Color & Icon Support**: Each category now has customizable colors and icons
   - **Controlled Dropdown**: Replaced free-text category field with organized dropdown
   - **Add New Categories**: Inline category creation with icon and color selection
   - **Category Management**: Dedicated management interface for editing/deleting categories

3. **Smart Category Deletion System**:
   - **Safety Prompts**: Warns users before deleting categories with prompts
   - **Reassignment Options**: Move prompts to "Uncategorized" or another category
   - **Prompt Protection**: Prevents accidental data loss with confirmation dialogs
   - **Empty Category Handling**: Safe deletion for categories without prompts

4. **Improved Layout & Spacing**:
   - Aligned prompt category headers with folder design patterns
   - Consistent padding and margins throughout
   - Better visual hierarchy and organization
   - Reduced unnecessary spacing and clutter

5. **Advanced Category Features**:
   - **Edit Categories**: Modify names, icons, and colors of existing categories
   - **Category Controls**: Edit/delete buttons appear on hover
   - **Default Categories**: Pre-configured categories with appropriate icons and colors
   - **Data Integrity**: Automatic prompt reassignment when categories are renamed

**Technical Details**:
- Added comprehensive category data structure with icons and colors
- Implemented robust category CRUD operations with error handling
- Enhanced modal system for category management workflows
- Added extensive CSS styling for visual consistency
- Version bumped to 2.1.0 for major feature release

**Files Modified**:
- `prompt-manager.js` - Complete category management system implementation
- `styles.css` - Extensive styling for new category features and visual improvements
- `manifest.json` - Version bump to 2.1.0

**User Benefits**:
- Visually consistent interface matching Conversation Library design
- Much better category organization and management capabilities
- Professional appearance with color-coded categories and icons
- Safe category deletion with data protection features
- Intuitive dropdown-based category selection

### Commit #6 - Modern Emoji Picker & Final UI Alignment (v2.2.0)
**Date**: July 21, 2025
**Changes**: Complete UI alignment between Prompt and Conversation Libraries with modern emoji picker

**Major Improvements**:
1. **Compact Layout Alignment**:
   - Fixed Prompt Library category spacing to match Conversation Library folders
   - Reduced padding and margins for consistent visual hierarchy
   - Eliminated unnecessary spacing between categories

2. **Modern Emoji Picker Component**:
   - **Grid-Based Interface**: Rich emoji grid with 7 categories and 400+ emojis
   - **No Text Labels**: Clean visual-only emoji selection as requested
   - **Searchable**: Built-in search with keyword support (happy, sad, work, etc.)
   - **Category Tabs**: Organized emoji categories with visual category buttons
   - **Responsive Design**: Scrollable grid with hover effects and animations

3. **Unified Icon Selection**:
   - **Prompt Library**: Replaced select dropdowns with emoji picker in category creation/editing
   - **Conversation Library**: Replaced basic icon suggestions with full emoji picker
   - **Consistent Experience**: Same emoji picker component used across both libraries

4. **Enhanced User Experience**:
   - **Visual Search**: Search emojis by common keywords (work, food, animals, etc.)
   - **Quick Selection**: Single-click emoji selection with visual feedback
   - **Auto-Close**: Smart dropdown closure when clicking outside
   - **Category Memory**: Remembers last selected category during session

5. **Technical Implementation**:
   - Shared emoji picker component between PromptManager and FolderManager
   - 400+ emojis organized in 7 logical categories
   - Search functionality with keyword mapping
   - Event-driven architecture with custom emoji-selected events
   - Responsive grid design with proper scrolling and accessibility

**Files Modified**:
- `prompt-manager.js` - Added emoji picker integration for category management
- `folder-manager.js` - Added emoji picker integration for folder icon selection
- `styles.css` - Complete emoji picker styling with grid layout and animations
- `manifest.json`, `popup.html`, `options.html` - Version bump to 2.2.0

**User Benefits**:
- Visual consistency between Prompt Library and Conversation Library
- Much richer icon selection with 400+ emojis vs previous 10 options
- Searchable emoji selection for faster icon discovery
- Professional grid-based interface matching modern design patterns
- Compact spacing that maximizes content visibility

### Commit #7 - Emoji Picker Polish & Modal Layout Fixes (v2.2.1)
**Date**: July 21, 2025
**Changes**: Critical fixes for emoji picker positioning and modal layout consistency

**Major Fixes**:
1. **Button Overlap Resolution**:
   - Fixed emoji picker z-index from 10000 to 99999 to prevent button overlap
   - Changed positioning from absolute to fixed for consistent placement
   - Added smart edge detection to prevent off-screen dropdowns

2. **Consistent Grid Height**:
   - Standardized emoji grid to exactly 192px height (6 rows)
   - Fixed grid showing inconsistent row counts between libraries
   - Improved scrolling behavior with proper height constraints

3. **Modal Layout Improvements**:
   - Enhanced modal form actions z-index for better layering
   - Added responsive positioning with viewport edge detection
   - Improved dropdown positioning relative to trigger button

4. **Cross-Resolution Compatibility**:
   - Added viewport boundary checks for 1280×720 and 1920×1080
   - Smart positioning that flips above button when space is limited
   - Consistent 10px minimum margin from screen edges

5. **Color Selector Consistency**:
   - Verified folder creation already has color picker (matching prompts)
   - Enhanced color picker visibility in modal layout
   - Maintained feature parity between both libraries

**Files Modified**:
- `prompt-manager.js` - Enhanced emoji picker positioning with edge detection
- `folder-manager.js` - Enhanced emoji picker positioning with edge detection
- `styles.css` - Fixed z-index layering and modal action positioning
- `manifest.json`, `popup.html`, `options.html` - Version bump to 2.2.1

**User Benefits**:
- No more button overlap in emoji picker dropdowns
- Consistent 6-row emoji grid across all dialogs
- Perfect positioning on all screen sizes (1280×720 to 1920×1080+)
- Smooth user experience without clipping or off-screen elements

### Commit #8 - Modal Stability Fix & Design Tokens (v2.2.2)
**Date**: July 21, 2025
**Changes**: Fixed modal shifting issue and implemented design tokens system

**Major Fixes**:
1. **Eliminated Modal Shifting**:
   - Changed emoji dropdown from `position: fixed` to `position: absolute`
   - Removed JavaScript manual positioning calculations
   - Added proper overflow handling to prevent layout reflow
   - Modal now stays perfectly stable when emoji picker opens

2. **Smooth Animations**:
   - Added fade-in animation for emoji dropdown appearance
   - Used transform for animations instead of layout properties
   - Smooth transitions without any jarring movements

3. **Design Tokens System**:
   - Added comprehensive spacing scale (xs to 2xl)
   - Standardized border radius tokens
   - Organized z-index scale for proper layering
   - Created foundation for consistent UI across extension

4. **Enhanced Modal Stability**:
   - Set `overflow: visible` on modal content
   - Proper positioning context for form groups
   - Ensured dropdown doesn't affect modal dimensions
   - Fixed form group spacing with emoji pickers

5. **Code Cleanup**:
   - Removed complex JavaScript positioning logic
   - Simplified dropdown show/hide functionality
   - Better separation of concerns between CSS and JS

**Technical Details**:
- CSS-only solution for dropdown positioning
- Leveraged CSS `:has()` selector for targeted styling
- Used CSS custom properties for design tokens
- Maintained backward compatibility

**Files Modified**:
- `styles.css` - Major positioning fixes and design tokens
- `prompt-manager.js` - Removed manual positioning code
- `folder-manager.js` - Removed manual positioning code
- `manifest.json`, `popup.html`, `options.html` - Version bump to 2.2.2

**User Benefits**:
- No more jarring modal jumps when clicking emoji picker
- Smoother, more professional user experience
- Consistent spacing and styling foundation
- Better performance with less JavaScript

### Commit #9 - Emoji Picker Overlay Fix (v2.2.3)
**Date**: July 21, 2025
**Changes**: Fixed emoji picker dropdown being cut off by modal overflow

**Major Fixes**:
1. **Resolved Dropdown Clipping**:
   - Changed modal `overflow: hidden` to `overflow: visible`
   - Fixed both `.cg-modal-content` and `.cg-modal-body` overflow
   - Dropdown now appears properly above modal buttons

2. **Improved Z-Index Layering**:
   - Updated emoji dropdown to use highest z-index (--cg-z-tooltip)
   - Reduced form actions z-index to ensure dropdown appears above
   - Proper stacking context for all modal elements

3. **Enhanced Modal Structure**:
   - Modal content allows overflow for dropdowns
   - Maintained rounded corners with visible overflow
   - Preserved animation effects

**Technical Details**:
- CSS-only solution maintaining performance
- No JavaScript changes required
- Proper use of CSS custom properties

**Files Modified**:
- `styles.css` - Fixed overflow and z-index issues
- `manifest.json`, `popup.html`, `options.html` - Version bump to 2.2.3

**User Benefits**:
- Emoji picker dropdown fully visible
- No more cut-off or overlapped UI elements
- Smooth interaction with proper layering
- Professional appearance maintained

## Commit Tracking

- **Latest Commit Number**: #9