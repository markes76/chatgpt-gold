/**
 * ChatGPT Gold - Hotkey Management System
 * Handles user-configurable keyboard shortcuts with conflict detection
 */

class HotkeyManager {
  constructor(parentInstance) {
    this.parent = parentInstance;
    this.hotkeys = new Map();
    this.defaultHotkeys = {
      'toggle-sidebar': { key: 'm', ctrl: true, alt: false, shift: false, meta: false },
      'quick-prompts': { key: '/', ctrl: true, alt: false, shift: false, meta: false },
      'advanced-search': { key: 'k', ctrl: true, alt: false, shift: false, meta: false }
    };
    this.conflictingKeys = new Set();
    this.init();
  }

  async init() {
    try {
      await this.loadHotkeys();
      this.setupEventListeners();
      // Don't wait for conflict detection to complete initialization
      this.detectConflicts().catch(error => {
        console.error('ChatGPT Gold: Error detecting conflicts:', error);
      });
      console.log('ChatGPT Gold: Hotkey Manager initialized');
    } catch (error) {
      console.error('ChatGPT Gold: Error initializing Hotkey Manager:', error);
      // Fallback to defaults if initialization fails
      this.hotkeys = new Map(Object.entries(this.defaultHotkeys));
      this.setupEventListeners();
    }
  }

  async loadHotkeys() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_hotkeys']
      });
      
      if (response.success && response.data.chatgpt_gold_hotkeys) {
        const saved = response.data.chatgpt_gold_hotkeys;
        // Merge with defaults
        this.hotkeys = new Map(Object.entries({
          ...this.defaultHotkeys,
          ...saved
        }));
      } else {
        this.hotkeys = new Map(Object.entries(this.defaultHotkeys));
      }
    } catch (error) {
      console.error('Failed to load hotkeys:', error);
      this.hotkeys = new Map(Object.entries(this.defaultHotkeys));
    }
  }

  async saveHotkeys() {
    try {
      const hotkeyObj = Object.fromEntries(this.hotkeys);
      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_SET',
        data: { chatgpt_gold_hotkeys: hotkeyObj }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to save hotkeys:', error);
      throw error;
    }
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      try {
        // Skip if user is typing in input fields
        if (this.isInputElement(e.target)) return;
        
        const pressedKey = this.getKeyFromEvent(e);
        
        for (const [action, hotkey] of this.hotkeys) {
          if (this.matchesHotkey(pressedKey, hotkey)) {
            e.preventDefault();
            e.stopPropagation();
            this.executeAction(action);
            return;
          }
        }
      } catch (error) {
        console.error('ChatGPT Gold: Error in hotkey event listener:', error);
      }
    });
  }

  isInputElement(element) {
    if (!element || !element.tagName) return false;
    
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTypes.includes(element.tagName) || 
           element.contentEditable === 'true' ||
           (element.closest && element.closest('[contenteditable="true"]'));
  }

  getKeyFromEvent(e) {
    return {
      key: e.key.toLowerCase(),
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey
    };
  }

  matchesHotkey(pressed, hotkey) {
    return pressed.key === hotkey.key.toLowerCase() &&
           pressed.ctrl === hotkey.ctrl &&
           pressed.alt === hotkey.alt &&
           pressed.shift === hotkey.shift &&
           pressed.meta === hotkey.meta;
  }

  executeAction(action) {
    console.log('ChatGPT Gold: Executing action:', action);
    
    try {
      switch (action) {
        case 'toggle-sidebar':
          if (this.parent && typeof this.parent.toggleSidebar === 'function') {
            this.parent.toggleSidebar();
          } else {
            console.error('ChatGPT Gold: toggleSidebar method not available');
          }
          break;
        case 'quick-prompts':
          if (this.parent && typeof this.parent.showQuickPrompts === 'function') {
            this.parent.showQuickPrompts();
          } else {
            console.error('ChatGPT Gold: showQuickPrompts method not available');
          }
          break;
        case 'advanced-search':
          if (this.parent && typeof this.parent.showSearchOverlay === 'function') {
            this.parent.showSearchOverlay();
          } else {
            console.error('ChatGPT Gold: showSearchOverlay method not available');
          }
          break;
        default:
          console.warn('ChatGPT Gold: Unknown action:', action);
      }
    } catch (error) {
      console.error('ChatGPT Gold: Error executing action:', action, error);
    }
  }

  async detectConflicts() {
    const conflicts = [];
    
    // Test each hotkey by simulating the event
    for (const [action, hotkey] of this.hotkeys) {
      const isConflicted = await this.testHotkeyConflict(hotkey);
      if (isConflicted) {
        conflicts.push({ action, hotkey });
        this.conflictingKeys.add(action);
      }
    }
    
    if (conflicts.length > 0) {
      console.warn('ChatGPT Gold: Detected hotkey conflicts:', conflicts);
      this.showConflictWarning(conflicts);
    }
    
    return conflicts;
  }

  async testHotkeyConflict(hotkey) {
    return new Promise((resolve) => {
      let conflictDetected = false;
      
      const testListener = (e) => {
        if (this.matchesHotkey(this.getKeyFromEvent(e), hotkey)) {
          // If event is already handled by something else
          if (e.defaultPrevented) {
            conflictDetected = true;
          }
        }
      };
      
      // Add listener to detect if event gets prevented
      document.addEventListener('keydown', testListener, true);
      
      // Simulate the hotkey
      const event = new KeyboardEvent('keydown', {
        key: hotkey.key,
        code: `Key${hotkey.key.toUpperCase()}`,
        ctrlKey: hotkey.ctrl,
        altKey: hotkey.alt,
        shiftKey: hotkey.shift,
        metaKey: hotkey.meta,
        bubbles: true,
        cancelable: true
      });
      
      // Test in next tick
      setTimeout(() => {
        document.dispatchEvent(event);
        document.removeEventListener('keydown', testListener, true);
        resolve(conflictDetected);
      }, 10);
    });
  }

  showConflictWarning(conflicts) {
    const conflictList = conflicts.map(c => 
      `${c.action}: ${this.formatHotkey(c.hotkey)}`
    ).join('\n');
    
    this.parent.showToast(
      `⚠️ Hotkey conflicts detected:\n${conflictList}\n\nGo to Settings > Hotkeys to configure alternatives.`,
      5000
    );
  }

  formatHotkey(hotkey) {
    const parts = [];
    if (hotkey.ctrl) parts.push('Ctrl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.meta) parts.push('Meta');
    parts.push(hotkey.key.toUpperCase());
    return parts.join('+');
  }

  setHotkey(action, hotkey) {
    this.hotkeys.set(action, hotkey);
    this.saveHotkeys();
  }

  getHotkey(action) {
    return this.hotkeys.get(action);
  }

  getAllHotkeys() {
    return Object.fromEntries(this.hotkeys);
  }

  resetToDefaults() {
    this.hotkeys = new Map(Object.entries(this.defaultHotkeys));
    this.saveHotkeys();
  }

  // Alternative hotkey suggestions for common conflicts
  getAlternatives(action) {
    const alternatives = {
      'quick-prompts': [
        { key: '.', ctrl: true, alt: false, shift: false, meta: false },
        { key: ',', ctrl: true, alt: false, shift: false, meta: false },
        { key: ';', ctrl: true, alt: false, shift: false, meta: false },
        { key: "'", ctrl: true, alt: false, shift: false, meta: false },
        { key: '`', ctrl: true, alt: false, shift: false, meta: false },
        { key: 'p', ctrl: true, alt: true, shift: false, meta: false }
      ],
      'toggle-sidebar': [
        { key: 'b', ctrl: true, alt: false, shift: false, meta: false },
        { key: 's', ctrl: true, alt: true, shift: false, meta: false }
      ],
      'advanced-search': [
        { key: 'f', ctrl: true, alt: true, shift: false, meta: false },
        { key: 's', ctrl: true, alt: false, shift: false, meta: false }
      ]
    };
    
    return alternatives[action] || [];
  }
}

window.HotkeyManager = HotkeyManager;