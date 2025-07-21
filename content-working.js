/**
 * ChatGPT Gold - Working Content Script
 * Implements actual functionality on chat.openai.com
 */

class ChatGPTGoldWorking {
  constructor() {
    this.isInitialized = false;
    this.settings = {};
    this.sidebarOpen = false;
    this.toolbar = null;
    this.sidebar = null;
    this.promptManager = null;
    this.folderManager = null;
    
    console.log('ChatGPT Gold: Starting...');
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('ChatGPT Gold: Starting initialization...');
      console.log('ChatGPT Gold: Current URL:', window.location.href);
      
      // Wait for page to be ready
      await this.waitForChatGPT();
      console.log('ChatGPT Gold: Page ready detected');
      
      // Load settings
      await this.loadSettings();
      console.log('ChatGPT Gold: Settings loaded');
      
      // Create actual UI
      this.createToolbar();
      console.log('ChatGPT Gold: Toolbar created');
      
      this.createSidebar();
      console.log('ChatGPT Gold: Sidebar created');
      
      this.setupEventListeners();
      this.setupMessageListeners();
      console.log('ChatGPT Gold: Event listeners setup');
      
      this.injectResponseTools();
      console.log('ChatGPT Gold: Response tools injected');
      
      // Initialize managers
      await this.initializeManagers();
      console.log('ChatGPT Gold: Managers initialized');
      
      this.isInitialized = true;
      console.log('ChatGPT Gold: Fully initialized with working features');
      
      // Make instance globally accessible for debugging
      window.ChatGPTGoldWorking = this;
      
    } catch (error) {
      console.error('ChatGPT Gold: Initialization failed:', error);
      console.error('ChatGPT Gold: Error stack:', error.stack);
    }
  }

  async waitForChatGPT() {
    // Wait for ChatGPT's main interface to load
    return new Promise((resolve) => {
      const checkForChatGPT = () => {
        const chatContainer = document.querySelector('main') || 
                            document.querySelector('[role="main"]') ||
                            document.querySelector('.chat-container') ||
                            document.querySelector('#__next');
        
        if (chatContainer) {
          console.log('ChatGPT Gold: ChatGPT interface detected');
          resolve();
        } else {
          setTimeout(checkForChatGPT, 500);
        }
      };
      checkForChatGPT();
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['chatgpt_gold_settings']);
      this.settings = result.chatgpt_gold_settings || {
        sidebarEnabled: true,
        toolbarEnabled: true,
        responseToolsEnabled: true
      };
      console.log('ChatGPT Gold: Settings loaded', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { sidebarEnabled: true, toolbarEnabled: true, responseToolsEnabled: true };
    }
  }

  createToolbar() {
    if (!this.settings.toolbarEnabled || this.toolbar) return;
    
    console.log('ChatGPT Gold: Creating toolbar...');
    
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'cg-toolbar';
    this.toolbar.innerHTML = `
      <button class="cg-toolbar-btn" id="cg-sidebar-toggle" title="Toggle Sidebar (Ctrl+M)">
        📁
      </button>
      <button class="cg-toolbar-btn" id="cg-quick-prompts" title="Quick Prompts (Ctrl+/)">
        ⚡
      </button>
      <button class="cg-toolbar-btn" id="cg-settings" title="Settings">
        ⚙️
      </button>
    `;

    document.body.appendChild(this.toolbar);
    console.log('ChatGPT Gold: Toolbar created');
  }

  createSidebar() {
    if (!this.settings.sidebarEnabled || this.sidebar) return;
    
    console.log('ChatGPT Gold: Creating sidebar...');
    
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'cg-sidebar';
    this.sidebar.innerHTML = `
      <div class="cg-sidebar-header">
        <h3 class="cg-sidebar-title">ChatGPT Gold</h3>
        <button class="cg-sidebar-close" id="cg-sidebar-close">×</button>
      </div>
      
      <div class="cg-sidebar-tabs">
        <button class="cg-sidebar-tab active" data-tab="conversations">Conversations</button>
        <button class="cg-sidebar-tab" data-tab="prompts">Prompts</button>
        <button class="cg-sidebar-tab" data-tab="tools">Tools</button>
      </div>
      
      <div class="cg-sidebar-content">
        <div class="cg-sidebar-section active" data-section="conversations">
          <div class="cg-search-container">
            <input type="text" class="cg-search-box" placeholder="Search conversations..." id="cg-search-conversations">
          </div>
          <div class="cg-conversation-actions">
            <button class="cg-btn cg-btn-small" id="cg-new-chat">New Chat</button>
            <button class="cg-btn cg-btn-small" id="cg-new-folder">New Folder</button>
            <button class="cg-btn cg-btn-small" id="cg-add-current-chat">Add Current</button>
          </div>
          <div id="cg-conversations-list">
            <!-- Folders and conversations will be populated by FolderManager -->
            <div class="cg-loading">Loading conversations...</div>
          </div>
        </div>
        
        <div class="cg-sidebar-section" data-section="prompts">
          <div class="cg-prompt-actions">
            <button class="cg-btn cg-btn-small" id="cg-new-prompt">New Prompt</button>
          </div>
          <div id="cg-prompts-list">
            <!-- Prompts will be populated by PromptManager -->
            <div class="cg-loading">Loading prompts...</div>
          </div>
        </div>
        
        <div class="cg-sidebar-section" data-section="tools">
          <div class="cg-tools-section">
            <h4>Response Tools</h4>
            <button class="cg-btn cg-btn-secondary" id="cg-export-conversation">Export Current Chat</button>
            <button class="cg-btn cg-btn-secondary" id="cg-analyze-conversation">Analyze Conversation</button>
          </div>
          <div class="cg-tools-section">
            <h4>Settings</h4>
            <button class="cg-btn cg-btn-secondary" id="cg-open-settings">Open Settings</button>
            <button class="cg-btn cg-btn-secondary" id="cg-toggle-theme">Toggle Theme</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.sidebar);
    console.log('ChatGPT Gold: Sidebar created');
  }

  setupEventListeners() {
    console.log('ChatGPT Gold: Setting up event listeners...');
    
    // Toolbar events
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.id === 'cg-sidebar-toggle') {
        this.toggleSidebar();
      } else if (target.id === 'cg-quick-prompts') {
        this.showQuickPrompts();
      } else if (target.id === 'cg-settings') {
        this.openSettings();
      } else if (target.id === 'cg-sidebar-close') {
        this.closeSidebar();
      } else if (target.id === 'cg-new-chat') {
        this.startNewChat();
      } else if (target.id === 'cg-new-prompt') {
        if (this.promptManager) {
          this.promptManager.showPromptDialog();
        } else {
          this.showNewPromptDialog();
        }
      } else if (target.id === 'cg-open-settings') {
        this.openSettings();
      } else if (target.dataset.prompt) {
        this.usePrompt(target.dataset.prompt);
      }
      
      // Handle folder actions
      if (target.id === 'cg-new-folder') {
        if (this.folderManager) {
          this.folderManager.showFolderDialog();
        }
      } else if (target.id === 'cg-add-current-chat') {
        if (this.folderManager) {
          this.folderManager.showAddCurrentChatDialog();
        }
      }
    });

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('cg-sidebar-tab')) {
        this.switchTab(e.target.dataset.tab);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        this.toggleSidebar();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.showQuickPrompts();
      }
    });

    // Search functionality
    const searchBox = document.getElementById('cg-search-conversations');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        this.searchConversations(e.target.value);
      });
    }

    console.log('ChatGPT Gold: Event listeners set up');
  }

  async initializeManagers() {
    // Initialize prompt manager
    if (window.PromptManager) {
      this.promptManager = new window.PromptManager(this);
      await this.promptManager.init();
    }
    
    // Initialize folder manager
    if (window.FolderManager) {
      this.folderManager = new window.FolderManager(this);
      await this.folderManager.init();
    }
  }

  setupMessageListeners() {
    // Handle messages from popup and background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('ChatGPT Gold: Received message', request);
      
      switch (request.action) {
        case 'ping':
          sendResponse({ status: 'ready' });
          break;
        case 'toggleSidebar':
          this.toggleSidebar();
          sendResponse({ status: 'toggled' });
          break;
        case 'getStatus':
          sendResponse({ 
            initialized: this.isInitialized,
            sidebarOpen: this.sidebarOpen
          });
          break;
        default:
          sendResponse({ status: 'unknown_action' });
      }
      
      return true; // Keep message channel open
    });
  }

  injectResponseTools() {
    if (!this.settings.responseToolsEnabled) return;
    
    console.log('ChatGPT Gold: Injecting response tools...');
    
    // Monitor for new messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            this.addResponseButtons(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Add to existing messages
    this.addResponseButtons(document.body);
  }

  addResponseButtons(container) {
    // Look for ChatGPT response containers
    const responses = container.querySelectorAll('[data-message-author-role="assistant"]') ||
                     container.querySelectorAll('.markdown') ||
                     container.querySelectorAll('[role="presentation"]');
    
    responses.forEach((response) => {
      if (response.querySelector('.cg-response-tools')) return;
      
      const tools = document.createElement('div');
      tools.className = 'cg-response-tools';
      tools.innerHTML = `
        <button class="cg-response-btn" data-action="copy" title="Copy Response">📋</button>
        <button class="cg-response-btn" data-action="save" title="Save Response">💾</button>
        <button class="cg-response-btn" data-action="analyze" title="Analyze Response">🔍</button>
      `;
      
      response.appendChild(tools);
      
      // Add event listeners for response tools
      tools.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action) {
          this.handleResponseAction(action, response);
        }
      });
    });
  }

  // UI Actions
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebar) {
      this.sidebar.classList.toggle('open', this.sidebarOpen);
    }
    console.log('ChatGPT Gold: Sidebar toggled', this.sidebarOpen);
  }

  closeSidebar() {
    this.sidebarOpen = false;
    if (this.sidebar) {
      this.sidebar.classList.remove('open');
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.cg-sidebar-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update sections
    document.querySelectorAll('.cg-sidebar-section').forEach(section => {
      section.classList.toggle('active', section.dataset.section === tabName);
    });

    console.log('ChatGPT Gold: Switched to tab', tabName);
  }

  showQuickPrompts() {
    const textarea = this.findChatInput();
    if (!textarea) {
      this.showToast('Chat input not found');
      return;
    }

    // Create quick prompt dropdown
    let dropdown = document.querySelector('.cg-quick-prompts-dropdown');
    if (dropdown) {
      dropdown.remove();
    }

    dropdown = document.createElement('div');
    dropdown.className = 'cg-quick-prompts-dropdown';
    dropdown.innerHTML = `
      <div class="cg-quick-prompt-item" data-prompt="code-review">🔍 Code Review</div>
      <div class="cg-quick-prompt-item" data-prompt="explain">🎓 Explain Simply</div>
      <div class="cg-quick-prompt-item" data-prompt="improve">✨ Improve This</div>
      <div class="cg-quick-prompt-item" data-prompt="summarize">📝 Summarize</div>
    `;

    // Position dropdown near textarea
    const rect = textarea.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.top - 200) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';

    document.body.appendChild(dropdown);

    // Handle selections
    dropdown.addEventListener('click', (e) => {
      const promptItem = e.target.closest('.cg-quick-prompt-item');
      if (promptItem) {
        this.usePrompt(promptItem.dataset.prompt);
        dropdown.remove();
      }
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.remove();
        }
      }, { once: true });
    }, 100);

    console.log('ChatGPT Gold: Quick prompts shown');
  }

  usePrompt(promptKey) {
    // If PromptManager is available and this is a prompt ID, use it
    if (this.promptManager && promptKey.startsWith('prompt_')) {
      this.promptManager.usePrompt(promptKey);
      return;
    }
    
    // Fallback to hardcoded prompts for legacy support
    const prompts = {
      'code-review': 'Please review this code for potential bugs, security issues, and suggest improvements:\n\n',
      'explain': 'Please explain this in simple terms that anyone can understand:\n\n',
      'improve': 'Please suggest improvements for:\n\n',
      'summarize': 'Please summarize the key points from:\n\n',
      'eli5': 'Please explain this like I\'m 5 years old:\n\n'
    };

    const promptText = prompts[promptKey];
    if (!promptText) return;

    const textarea = this.findChatInput();
    if (textarea) {
      textarea.value = promptText;
      textarea.focus();
      
      // Trigger input event to notify ChatGPT
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      this.showToast(`Prompt "${promptKey}" inserted`);
    }
  }

  startNewChat() {
    // Try to find and click ChatGPT's new chat button
    const newChatBtn = document.querySelector('[aria-label*="New chat"]') ||
                      document.querySelector('button[title*="New chat"]') ||
                      document.querySelector('a[href="/"]') ||
                      document.querySelector('[data-testid="new-chat"]');
    
    if (newChatBtn && typeof newChatBtn.click === 'function') {
      try {
        newChatBtn.click();
        this.showToast('Starting new chat');
      } catch (error) {
        console.error('Click failed:', error);
        this.fallbackNewChat();
      }
    } else {
      this.fallbackNewChat();
    }
  }

  fallbackNewChat() {
    // Fallback: navigate to home
    try {
      if (window.location.hostname.includes('chatgpt.com')) {
        window.location.href = 'https://chatgpt.com/';
      } else {
        window.location.href = 'https://chat.openai.com/';
      }
      this.showToast('Navigating to new chat');
    } catch (error) {
      console.error('Navigation failed:', error);
      this.showToast('Failed to start new chat');
    }
  }


  handleResponseAction(action, responseElement) {
    const responseText = responseElement.innerText || responseElement.textContent;
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(responseText).then(() => {
          this.showToast('Response copied to clipboard');
        });
        break;
      
      case 'save':
        this.saveResponse(responseText);
        break;
      
      case 'analyze':
        this.analyzeResponse(responseText);
        break;
    }
  }

  saveResponse(text) {
    const savedResponses = JSON.parse(localStorage.getItem('cg-saved-responses') || '[]');
    savedResponses.push({
      text: text,
      timestamp: Date.now(),
      title: text.substring(0, 50) + '...'
    });
    localStorage.setItem('cg-saved-responses', JSON.stringify(savedResponses));
    this.showToast('Response saved');
  }

  analyzeResponse(text) {
    // Simple analysis for now
    const wordCount = text.split(' ').length;
    const charCount = text.length;
    const sentences = text.split(/[.!?]+/).length - 1;
    
    this.showToast(`Analysis: ${wordCount} words, ${sentences} sentences, ${charCount} characters`);
  }

  searchConversations(query) {
    const items = document.querySelectorAll('.cg-chat-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const matches = text.includes(query.toLowerCase());
      item.style.display = matches ? 'block' : 'none';
    });
  }

  showNewPromptDialog() {
    this.showToast('Prompt creation dialog - Feature coming soon!');
  }

  openSettings() {
    // Send message to background script to open settings
    chrome.runtime.sendMessage({ action: 'openSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to open settings:', chrome.runtime.lastError);
        this.showToast('Failed to open settings');
      } else {
        this.showToast('Opening settings...');
      }
    });
  }

  // Utility functions
  findChatInput() {
    return document.querySelector('textarea[placeholder*="Message"]') ||
           document.querySelector('textarea[data-id]') ||
           document.querySelector('#prompt-textarea') ||
           document.querySelector('textarea');
  }

  getCurrentChatTitle() {
    const titleElement = document.querySelector('title');
    return titleElement ? titleElement.textContent : `Chat ${Date.now()}`;
  }

  extractCurrentConversation() {
    const messages = [];
    
    // Try to find message containers
    const messageElements = document.querySelectorAll('[data-message-author-role]') ||
                           document.querySelectorAll('.message') ||
                           document.querySelectorAll('[role="presentation"]');
    
    messageElements.forEach(element => {
      const role = element.getAttribute('data-message-author-role') || 'unknown';
      const content = element.innerText || element.textContent;
      
      if (content && content.trim()) {
        messages.push({
          role: role,
          content: content.trim(),
          timestamp: Date.now()
        });
      }
    });

    return messages;
  }

  showToast(message) {
    let toast = document.querySelector('.cg-toast');
    if (toast) {
      toast.remove();
    }

    toast = document.createElement('div');
    toast.className = 'cg-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }
}

// Initialize when on ChatGPT (support multiple domains)
const isChatGPT = window.location.hostname === 'chat.openai.com' || 
                  window.location.hostname === 'chatgpt.com' ||
                  window.location.hostname.includes('chatgpt.com');

if (isChatGPT) {
  console.log('ChatGPT Gold: Detected ChatGPT domain:', window.location.hostname);
  // Small delay to ensure page elements are loaded
  setTimeout(() => {
    new ChatGPTGoldWorking();
  }, 1000);
} else {
  console.log('ChatGPT Gold: Not on ChatGPT domain:', window.location.hostname);
}