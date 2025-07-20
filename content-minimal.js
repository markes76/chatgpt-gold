/**
 * ChatGPT Gold - Minimal Content Script
 * Lightweight version for faster loading
 */

class ChatGPTGoldMinimal {
  constructor() {
    this.isInitialized = false;
    this.settings = {};
    
    // Quick initialization
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('ChatGPT Gold: Starting initialization...');
      
      // Load minimal settings
      await this.loadBasicSettings();
      
      // Create basic UI only if enabled
      if (this.settings.sidebarEnabled !== false) {
        this.createBasicToolbar();
      }
      
      this.isInitialized = true;
      console.log('ChatGPT Gold: Initialized successfully');
      
    } catch (error) {
      console.error('ChatGPT Gold: Initialization failed:', error);
    }
  }

  async loadBasicSettings() {
    try {
      const result = await chrome.storage.sync.get(['chatgpt_gold_settings']);
      this.settings = result.chatgpt_gold_settings || {
        sidebarEnabled: true,
        toolbarEnabled: true
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { sidebarEnabled: true, toolbarEnabled: true };
    }
  }

  createBasicToolbar() {
    // Don't create if already exists
    if (document.querySelector('.cg-toolbar')) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'cg-toolbar';
    
    toolbar.innerHTML = `
      <button class="cg-toolbar-btn" title="ChatGPT Gold Settings" id="cg-settings-btn">
        ⚙️
      </button>
      <button class="cg-toolbar-btn" title="Toggle Sidebar" id="cg-sidebar-btn">
        📁
      </button>
    `;

    document.body.appendChild(toolbar);

    // Add basic event listeners
    document.getElementById('cg-settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('cg-sidebar-btn').addEventListener('click', () => {
      this.showBasicMessage('Sidebar feature loading... Please check the settings page for full features.');
    });
  }

  showBasicMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'cg-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Only initialize if we're on ChatGPT
if (window.location.hostname === 'chat.openai.com') {
  // Use a small delay to ensure page is ready
  setTimeout(() => {
    new ChatGPTGoldMinimal();
  }, 500);
}