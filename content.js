/**
 * ChatGPT Gold - Content Script
 * 
 * This script is responsible for injecting the UI enhancements and features
 * into the ChatGPT web interface.
 */

class ChatGPTGold {
  constructor() {
    this.isInitialized = false;
    this.sidebarOpen = this.getSidebarInitialState();
    this.folderManager = null; 
    this.promptManager = null;
    this.hotkeyManager = null; // Disabled for now
    this.positionToggleFunction = null;
    this.searchTimeout = null;
    this.init();
  }

  getSidebarInitialState() {
    // Check if user has ever interacted with the sidebar
    const hasInteracted = localStorage.getItem('cg-sidebar-interacted');
    if (!hasInteracted) {
      // First time - show sidebar by default
      return true;
    }
    // Return last known state
    return localStorage.getItem('cg-sidebar-open') === 'true';
  }

  async init() {
    if (this.isInitialized) return;

    await this.waitForChatGPT();

    this.createSidebar();
    this.createSidebarToggle();
    this.setupEventListeners();
    
    // Apply initial sidebar state
    const sidebar = document.getElementById('cg-sidebar');
    sidebar.classList.toggle('open', this.sidebarOpen);
    
    // Database features removed - using simpler Chrome storage approach
    
    if (window.FolderManager) {
      this.folderManager = new window.FolderManager(this);
      await this.folderManager.init();
    }
    if (window.PromptManager) {
      this.promptManager = new window.PromptManager(this);
      await this.promptManager.init();
    }
    
    // Temporarily disabled HotkeyManager - using legacy keyboard shortcuts
    // if (window.HotkeyManager) {
    //   try {
    //     this.hotkeyManager = new window.HotkeyManager(this);
    //     await this.hotkeyManager.init();
    //   } catch (error) {
    //     console.error('ChatGPT Gold: Failed to initialize hotkey manager:', error);
    //     this.hotkeyManager = null;
    //   }
    // }

    // Load search data immediately for native search enhancement
    await this.loadSearchData();

    // Initialize CmdK enhancer AFTER search data is loaded
    if (window.CmdKEnhancer) {
      this.cmdkEnhancer = new window.CmdKEnhancer();
      // Pass search data directly to enhancer
      if (this.cmdkEnhancer && this.searchData) {
        this.cmdkEnhancer.setSearchData(this.searchData);
      }
      console.log('ChatGPT Gold: CmdK Enhancer initialized with search data:', this.searchData);
    }

    // this.injectResponseTools(); // Temporarily disabled - will implement better UX

    // Load and apply theme settings
    this.loadThemeSettings();

    this.isInitialized = true;
    console.log('ChatGPT Gold: Initialized');
  }

  async waitForChatGPT() {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (document.querySelector('textarea') || document.querySelector('nav')) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  createSidebarToggle() {
    const toggle = document.createElement('div');
    toggle.id = 'cg-sidebar-toggle';
    const initialIcon = this.sidebarOpen ? '›' : '‹';
    toggle.innerHTML = `<div class="cg-toggle-handle">${initialIcon}</div>`;
    toggle.title = 'Click and drag to move • Click to toggle sidebar (Ctrl+M)';
    
    document.body.appendChild(toggle);
    this.setupToggleDragging(toggle);
  }

  createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'cg-sidebar';
    sidebar.innerHTML = `
      <div class="cg-sidebar-header">
        <h3>ChatGPT Gold</h3>
        <div class="cg-header-actions">
          <button id="cg-advanced-search" class="cg-header-btn" title="Advanced Search">🔍</button>
          <button id="cg-open-settings" class="cg-header-btn" title="Settings">⚙️</button>
          <button id="cg-close-sidebar" class="cg-header-btn">×</button>
        </div>
      </div>
      <div class="cg-sidebar-tabs">
        <button class="cg-sidebar-tab active" data-tab="conversations">Conversations</button>
        <button class="cg-sidebar-tab" data-tab="prompts">Prompt Library</button>
      </div>
      <div class="cg-sidebar-content">
        <div class="cg-sidebar-section active" data-section="conversations">
          <div class="cg-conversation-actions">
            <button class="cg-btn cg-btn-small" id="cg-new-folder">New Folder</button>
            <button class="cg-btn cg-btn-small" id="cg-add-current-chat">Add Current</button>
          </div>
          <div id="cg-conversations-list">
            <div class="cg-loading">Loading conversations...</div>
          </div>
        </div>
        <div class="cg-sidebar-section" data-section="prompts">
          <!-- Prompt library UI will be rendered by PromptManager -->
          <div id="cg-prompts-list">
            <div class="cg-loading">Loading prompts...</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    const resizer = document.createElement('div');
    resizer.id = 'cg-sidebar-resizer';
    sidebar.appendChild(resizer);
    this.setupSidebarResizing(sidebar, resizer);
  }

  setupEventListeners() {
    document.getElementById('cg-close-sidebar').addEventListener('click', () => this.toggleSidebar());

    // Advanced Search button
    document.getElementById('cg-advanced-search').addEventListener('click', () => {
      this.showSearchOverlay();
    });

    // Settings button
    document.getElementById('cg-open-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('ChatGPT Gold: Settings button clicked');
      
      // Check if extension context is still valid before sending messages
      if (!chrome.runtime?.id) {
        console.log('ChatGPT Gold: Extension context invalidated - page needs refresh');
        this.showToast('Extension needs refresh. Please reload the page.');
        return;
      }

      try {
        chrome.runtime.sendMessage({ action: 'openSettings' }, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message || chrome.runtime.lastError;
            
            // Handle common extension errors silently
            if (error.includes('message port closed') || 
                error.includes('Extension context invalidated') ||
                error.includes('Could not establish connection')) {
              console.log('ChatGPT Gold: Background script unavailable');
              this.showToast('Extension reloaded. Please refresh the page to reconnect.');
            } else {
              console.error('ChatGPT Gold: Failed to open settings:', error);
              this.showToast('Could not open settings page. Please try again.');
            }
          } else {
            console.log('ChatGPT Gold: Settings page opened successfully');
          }
        });
      } catch (error) {
        // Only log this if it's not a context invalidation error
        if (!error.message?.includes('Extension context invalidated')) {
          console.error('ChatGPT Gold: Error sending settings message:', error);
        }
        this.showToast('Extension needs refresh. Please reload the page.');
      }
    });

    document.querySelectorAll('.cg-sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    document.getElementById('cg-new-folder').addEventListener('click', () => {
      if (this.folderManager) this.folderManager.showFolderDialog();
    });
    document.getElementById('cg-add-current-chat').addEventListener('click', () => {
      if (this.folderManager) this.folderManager.showAddCurrentChatDialog();
    });

    // Primary keyboard shortcuts - use capture phase to intercept before other handlers
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Check for our specific shortcuts first, regardless of input focus
      let isOurShortcut = false;
      
      // Quick prompts: Ctrl+. (Windows/Linux) or Cmd+. (Mac) - Toggle behavior
      if ((isMac && e.metaKey && e.key === '.') || (!isMac && e.ctrlKey && e.key === '.')) {
        console.log('ChatGPT Gold: Quick prompts shortcut detected!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Check if dropdown already exists - if so, close it (toggle behavior)
        const existingDropdown = document.querySelector('.cg-quick-prompts-dropdown');
        if (existingDropdown) {
          console.log('ChatGPT Gold: Closing existing quick prompts dropdown');
          existingDropdown.remove();
        } else {
          console.log('ChatGPT Gold: Opening quick prompts...');
          this.showQuickPrompts();
        }
        isOurShortcut = true;
      }
      // Extension search: Ctrl+Shift+K (Windows/Linux) or Cmd+Shift+K (Mac)
      else if ((isMac && e.metaKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) || (!isMac && e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k'))) {
        console.log('ChatGPT Gold: Extension search shortcut detected! Opening search overlay...');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.showSearchOverlay();
        isOurShortcut = true;
      }
      // Toggle sidebar: Ctrl+M (Windows/Linux) or Cmd+M (Mac)
      else if ((isMac && e.metaKey && e.key === 'm') || (!isMac && e.ctrlKey && e.key === 'm')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSidebar();
        isOurShortcut = true;
      }
      
      // If it's not our shortcut and user is in input field, skip other processing
      if (!isOurShortcut && this.isInputElement(e.target)) {
        return;
      }
    }, true); // Use capture phase to intercept events early
  }

  isInputElement(element) {
    if (!element) return false;
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTypes.includes(element.tagName) || 
           element.contentEditable === 'true' ||
           (element.closest && element.closest('[contenteditable="true"]'));
  }

  setupToggleDragging(toggle) {
    let isDragging = false;
    let mouseDownTime = 0;
    let startY = 0;
    let startTop = 0;
    let hasMoved = false;

    const positionToggle = () => {
      const sidebar = document.getElementById('cg-sidebar');
      if (!sidebar || isDragging) return;
      
      const sidebarRect = sidebar.getBoundingClientRect();
      const isOpen = sidebar.classList.contains('open');
      
      if (isOpen) {
        // When sidebar is OPEN - toggle should be on the LEFT BORDER of the sidebar
        toggle.style.right = (window.innerWidth - sidebarRect.left) + 'px';
      } else {
        // When sidebar is CLOSED - toggle should stick OUT from screen edge
        toggle.style.right = '5px';
      }
      
      toggle.style.position = 'fixed';
      toggle.style.zIndex = 'var(--cg-z-toolbar)';
      
      // Use saved position or center vertically
      const savedPosition = localStorage.getItem('cg-toggle-position');
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition);
          const maxTop = window.innerHeight - toggle.offsetHeight;
          const constrainedTop = Math.max(0, Math.min(maxTop, pos.top));
          toggle.style.top = constrainedTop + 'px';
          toggle.style.transform = 'none';
        } catch (e) {
          toggle.style.top = '50%';
          toggle.style.transform = 'translateY(-50%)';
        }
      } else {
        toggle.style.top = '50%';
        toggle.style.transform = 'translateY(-50%)';
      }
    };

    // Store position function for external access
    this.positionToggleFunction = positionToggle;
    
    // Position toggle initially
    setTimeout(positionToggle, 100);
    
    // Reposition when sidebar state changes - multiple calls for smooth transition
    const observer = new MutationObserver(() => {
      positionToggle(); // Immediate
      setTimeout(positionToggle, 10); // Early in transition
      setTimeout(positionToggle, 50); // Mid transition
      setTimeout(positionToggle, 150); // After transition
      setTimeout(positionToggle, 300); // Final position
    });
    
    const sidebar = document.getElementById('cg-sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    // Simple click handler for toggle
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging && !hasMoved) {
        this.toggleSidebar();
      }
    });

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Only left click
      
      mouseDownTime = Date.now();
      startY = e.clientY;
      startTop = toggle.getBoundingClientRect().top;
      hasMoved = false;
      
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseMove = (e) => {
      if (mouseDownTime === 0) return;
      
      const timeSinceMouseDown = Date.now() - mouseDownTime;
      const moveDistance = Math.abs(e.clientY - startY);
      
      // Only start dragging if held for 200ms+ AND moved more than 3px
      if (timeSinceMouseDown > 200 && moveDistance > 3) {
        if (!isDragging) {
          isDragging = true;
          hasMoved = true;
          toggle.style.cursor = 'grabbing';
          toggle.style.transition = 'none';
          toggle.style.zIndex = '1010';
          document.body.style.userSelect = 'none';
        }
      }
      
      if (isDragging) {
        const deltaY = e.clientY - startY;
        const newTop = startTop + deltaY;
        
        // Constrain to viewport bounds
        const maxTop = window.innerHeight - toggle.offsetHeight;
        const constrainedTop = Math.max(0, Math.min(maxTop, newTop));
        
        toggle.style.top = constrainedTop + 'px';
        toggle.style.transform = 'none';
      }
      
      e.preventDefault();
    };

    const handleMouseUp = (e) => {
      if (mouseDownTime === 0) return;
      
      mouseDownTime = 0;
      
      if (isDragging) {
        isDragging = false;
        toggle.style.cursor = 'pointer';
        toggle.style.transition = 'box-shadow 0.2s ease';
        document.body.style.userSelect = '';
        
        // Save position
        const rect = toggle.getBoundingClientRect();
        localStorage.setItem('cg-toggle-position', JSON.stringify({
          top: rect.top
        }));
        
        // Reposition to ensure attachment to sidebar
        setTimeout(positionToggle, 100);
      }
      
      // Reset hasMoved after a short delay to allow click event
      setTimeout(() => { hasMoved = false; }, 10);
      
      e.preventDefault();
    };

    // Event listeners
    toggle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Hover effects
    toggle.addEventListener('mouseenter', () => {
      if (!isDragging) {
        toggle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }
    });

    toggle.addEventListener('mouseleave', () => {
      if (!isDragging) {
        toggle.style.boxShadow = 'var(--cg-shadow)';
      }
    });

    // Reposition on window resize
    window.addEventListener('resize', positionToggle);
  }

  setupSidebarResizing(sidebar, resizer) {
    let x = 0;
    let w = 0;

    const mouseDownHandler = (e) => {
      x = e.clientX;
      w = sidebar.offsetWidth;
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      sidebar.style.userSelect = 'none';
      sidebar.style.pointerEvents = 'none';
    };

    const mouseMoveHandler = (e) => {
      const dx = e.clientX - x;
      const newWidth = w - dx;
      sidebar.style.width = `${newWidth}px`;
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      sidebar.style.removeProperty('user-select');
      sidebar.style.removeProperty('pointer-events');
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
  }

  toggleSidebar() {
    const sidebar = document.getElementById('cg-sidebar');
    this.sidebarOpen = !this.sidebarOpen;
    sidebar.classList.toggle('open', this.sidebarOpen);
    
    // Immediately reposition toggle to follow sidebar
    if (this.positionToggleFunction) {
      this.positionToggleFunction();
      setTimeout(this.positionToggleFunction, 10);
      setTimeout(this.positionToggleFunction, 50);
      setTimeout(this.positionToggleFunction, 150);
      setTimeout(this.positionToggleFunction, 300);
    }
    
    // Save interaction state and current state
    localStorage.setItem('cg-sidebar-interacted', 'true');
    localStorage.setItem('cg-sidebar-open', this.sidebarOpen.toString());
    
    // Update toggle icon
    const toggle = document.getElementById('cg-sidebar-toggle');
    const handle = toggle?.querySelector('.cg-toggle-handle');
    if (handle) {
      handle.textContent = this.sidebarOpen ? '›' : '‹';
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.cg-sidebar-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.cg-sidebar-section').forEach(section => {
      section.classList.toggle('active', section.dataset.section === tabName);
    });
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

  showQuickPrompts() {
    console.log('ChatGPT Gold: showQuickPrompts() called');
    
    if (!this.promptManager) {
      console.log('ChatGPT Gold: Prompt manager not available');
      this.showToast('Prompt manager not available');
      return;
    }
    console.log('ChatGPT Gold: Prompt manager available');

    let dropdown = document.querySelector('.cg-quick-prompts-dropdown');
    if (dropdown) {
      console.log('ChatGPT Gold: Removing existing dropdown');
      dropdown.remove();
    }

    const quickPrompts = this.promptManager.getQuickPrompts();
    console.log('ChatGPT Gold: Quick prompts retrieved:', quickPrompts.length, quickPrompts);
    
    if (quickPrompts.length === 0) {
      console.log('ChatGPT Gold: No quick prompts available');
      this.showToast('No quick prompts available. Favorite some prompts first!');
      return;
    }

    dropdown = document.createElement('div');
    dropdown.className = 'cg-quick-prompts-dropdown';
    dropdown.innerHTML = `
      <div class="cg-quick-prompts-header">
        <h3>⚡ Quick Prompts</h3>
        <span class="cg-quick-prompts-count">${quickPrompts.length} favorites</span>
      </div>
      ${quickPrompts.map(prompt => `
        <div class="cg-quick-prompt-item" data-prompt-id="${prompt.id}">
          <span class="cg-quick-prompt-title">${prompt.title}</span>
          <span class="cg-quick-prompt-description">${prompt.description}</span>
        </div>
      `).join('')}
    `;

    // Position the dropdown at the exact location specified by user
    dropdown.style.position = 'absolute';
    dropdown.style.top = '200px';
    dropdown.style.left = '400px';
    dropdown.style.width = '320px';
    dropdown.style.maxHeight = '60vh';
    dropdown.style.overflowY = 'auto';
    dropdown.style.zIndex = '10000';
    
    console.log('ChatGPT Gold: Positioning at exact coordinates:', {
      position: 'absolute',
      top: '200px',
      left: '400px',
      width: '320px'
    });
    
    document.body.appendChild(dropdown);
    console.log('ChatGPT Gold: Dropdown appended to body, element:', dropdown);

    dropdown.addEventListener('click', (e) => {
      const promptItem = e.target.closest('.cg-quick-prompt-item');
      if (promptItem) {
        const promptId = promptItem.dataset.promptId;
        const promptToUse = this.promptManager.prompts.find(p => p.id === promptId);
        if (promptToUse) {
          this.promptManager.usePrompt(promptToUse);
          dropdown.remove();
        }
      }
    });

    const closeDropdown = (e) => {
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
        document.removeEventListener('keydown', handleKeydownForDropdown);
      }
    };

    const handleKeydownForDropdown = (e) => {
      if (e.key === 'Escape') {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
        document.removeEventListener('keydown', handleKeydownForDropdown);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeDropdown);
      document.addEventListener('keydown', handleKeydownForDropdown);
    }, 50);
  }

  injectResponseTools() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.addResponseButtons(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Add to existing messages on page load
    this.addResponseButtons(document.body);
  }

  addResponseButtons(container) {
    // Select ChatGPT response elements
    const responses = container.querySelectorAll(
      `[data-message-author-role="assistant"], .markdown, [role="presentation"]`
    );

    responses.forEach((response) => {
      // Avoid adding multiple times
      if (response.querySelector('.cg-response-tools')) return;

      const tools = document.createElement('div');
      tools.className = 'cg-response-tools';
      tools.innerHTML = `
        <button class="cg-response-btn" data-action="copy" title="Copy Response">📋</button>
        <button class="cg-response-btn" data-action="save" title="Save Response">💾</button>
        <button class="cg-response-btn" data-action="analyze" title="Analyze Response">🔍</button>
      `;
      
      // Append tools to the response element
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

  handleResponseAction(action, responseElement) {
    const responseText = responseElement.innerText || responseElement.textContent;
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(responseText).then(() => {
          this.showToast('Response copied to clipboard');
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          this.showToast('Failed to copy response');
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
    // Placeholder for saving response logic
    console.log('Saving response:', text);
    this.showToast('Response saved (feature in development)');
  }

  analyzeResponse(text) {
    // Placeholder for analyzing response logic
    console.log('Analyzing response:', text);
    this.showToast('Response analysis (feature in development)');
  }

  // Advanced Search Overlay
  createSearchOverlay() {
    if (document.getElementById('chatgpt-gold-search-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'chatgpt-gold-search-overlay';
    overlay.className = 'cg-search-overlay';
    overlay.innerHTML = `
      <div class="cg-search-container">
        <div class="cg-search-header">
          <div class="cg-search-logo">
            <div class="cg-logo-icon">🔍</div>
            <div class="cg-logo-text">
              <h1>Advanced Search</h1>
              <span class="cg-subtitle">Find conversations, prompts, and more</span>
            </div>
          </div>
          <button class="cg-close-search" id="cg-close-search">×</button>
        </div>

        <div class="cg-search-section">
          <div class="cg-search-input-group">
            <input type="text" id="cg-search-input" placeholder="Search conversations, prompts, or content..." class="cg-search-input">
            <button class="cg-search-btn" id="cg-search-btn">
              <span class="cg-search-icon">🔍</span>
            </button>
          </div>
          
          <div class="cg-search-filters">
            <div class="cg-filter-group">
              <label class="cg-filter-label">Search in:</label>
              <div class="cg-filter-options">
                <label class="cg-filter-option">
                  <input type="checkbox" id="cg-search-conversations" checked>
                  <span class="cg-checkmark"></span>
                  Conversations
                </label>
                <label class="cg-filter-option">
                  <input type="checkbox" id="cg-search-prompts" checked>
                  <span class="cg-checkmark"></span>
                  Prompts
                </label>
              </div>
            </div>

            <div class="cg-filter-group">
              <label class="cg-filter-label">Folder:</label>
              <select id="cg-folder-filter" class="cg-filter-select">
                <option value="">All Folders</option>
              </select>
            </div>

            <div class="cg-filter-group">
              <label class="cg-filter-label">Date:</label>
              <select id="cg-date-filter" class="cg-filter-select">
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        <div class="cg-results-section">
          <div class="cg-results-header">
            <h3>Search Results</h3>
            <div class="cg-results-count" id="cg-results-count">0 results</div>
          </div>
          
          <div class="cg-results-container" id="cg-results-container">
            <div class="cg-no-results">
              <div class="cg-no-results-icon">🔍</div>
              <h4>Start searching to find conversations and prompts</h4>
              <p>Use the search bar above to filter content</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.setupSearchOverlayEvents();
  }

  setupSearchOverlayEvents() {
    const overlay = document.getElementById('chatgpt-gold-search-overlay');
    if (!overlay) return;

    // Close search overlay
    document.getElementById('cg-close-search')?.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.style.display === 'flex') {
        overlay.style.display = 'none';
      }
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });

    // Search functionality
    const searchInput = document.getElementById('cg-search-input');
    const searchBtn = document.getElementById('cg-search-btn');
    
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.performOverlaySearch();
      }
    });
    
    searchInput?.addEventListener('input', (e) => {
      // Debounce search for better performance
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.performOverlaySearch();
      }, 300);
    });
    
    searchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.performOverlaySearch();
    });

    // Filter change listeners
    document.getElementById('cg-search-conversations')?.addEventListener('change', () => {
      this.performOverlaySearch();
    });
    
    document.getElementById('cg-search-prompts')?.addEventListener('change', () => {
      this.performOverlaySearch();
    });
    
    document.getElementById('cg-folder-filter')?.addEventListener('change', () => {
      this.performOverlaySearch();
    });
    
    document.getElementById('cg-date-filter')?.addEventListener('change', () => {
      this.performOverlaySearch();
    });

    // Initialize with data
    this.loadSearchData();
  }

  async loadSearchData() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('ChatGPT Gold: Extension context invalidated during search data load');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: [
          'chatgpt_gold_conversations',
          'chatgpt_gold_prompts',
          'chatgpt_gold_folders'
        ]
      });
      
      const result = response.success ? response.data : {};

      this.searchData = {
        conversations: result.chatgpt_gold_conversations || [],
        prompts: result.chatgpt_gold_prompts || [],
        folders: result.chatgpt_gold_folders || []
      };

    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.log('ChatGPT Gold: Extension context invalidated during search data load');
      } else {
        console.warn('ChatGPT Gold: Background script unavailable for search data, using fallback approach:', error);
      }
    }

    // Use folder manager's data if available
    if (this.folderManager) {
      console.log('ChatGPT Gold: Using folder manager data for search');
      this.searchData.conversations = this.folderManager.conversations || [];
      this.searchData.folders = this.folderManager.folders || [];
    } else {
      console.warn('ChatGPT Gold: Folder manager not available for search data');
    }

    // Use prompt manager's data if available
    if (this.promptManager) {
      console.log('ChatGPT Gold: Using prompt manager data for search');
      this.searchData.prompts = this.promptManager.prompts || [];
    } else {
      console.warn('ChatGPT Gold: Prompt manager not available for search data');
    }

    console.log('ChatGPT Gold: Updated search data from managers:', {
      conversations: this.searchData.conversations.length,
      folders: this.searchData.folders.length,
      prompts: this.searchData.prompts.length
    });

    if (!this.folderManager || !this.promptManager) {
      console.log('ChatGPT Gold: Some managers not available, trying localStorage fallback');
      
      // Fallback to localStorage
      try {
        const conversationsBackup = localStorage.getItem('chatgpt_gold_conversations_backup');
        const foldersBackup = localStorage.getItem('chatgpt_gold_folders_backup');
        
        if (conversationsBackup) {
          this.searchData.conversations = JSON.parse(conversationsBackup);
        }
        if (foldersBackup) {
          this.searchData.folders = JSON.parse(foldersBackup);
        }
        console.log('ChatGPT Gold: Loaded from localStorage backup');
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed for search data:', localError);
      }
    }

    // Only populate search filters if search overlay exists
    if (document.getElementById('cg-folder-filter')) {
      this.populateSearchFilters();
    }
  }

  // Method to refresh search data when managers data changes
  refreshSearchData() {
    if (this.folderManager) {
      this.searchData.conversations = this.folderManager.conversations || [];
      this.searchData.folders = this.folderManager.folders || [];
    }
    
    if (this.promptManager) {
      this.searchData.prompts = this.promptManager.prompts || [];
    }
    
    // Update CmdK enhancer with fresh data
    if (this.cmdkEnhancer) {
      this.cmdkEnhancer.setSearchData(this.searchData);
    }
    
    console.log('ChatGPT Gold: Search data refreshed:', {
      conversations: this.searchData.conversations.length,
      folders: this.searchData.folders.length,
      prompts: this.searchData.prompts.length
    });
  }

  populateSearchFilters() {
    const folderFilter = document.getElementById('cg-folder-filter');
    if (folderFilter && this.searchData?.folders) {
      // Clear existing options except "All Folders"
      while (folderFilter.children.length > 1) {
        folderFilter.removeChild(folderFilter.lastChild);
      }

      this.searchData.folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `${folder.icon} ${folder.name}`;
        folderFilter.appendChild(option);
      });
    }
  }

  async performOverlaySearch() {
    if (!this.searchData) return;

    const query = document.getElementById('cg-search-input')?.value.toLowerCase().trim() || '';
    const searchConversations = document.getElementById('cg-search-conversations')?.checked || false;
    const searchPrompts = document.getElementById('cg-search-prompts')?.checked || false;
    const folderFilter = document.getElementById('cg-folder-filter')?.value || '';
    const dateFilter = document.getElementById('cg-date-filter')?.value || '';

    let results = [];

    // Search conversations
    if (searchConversations) {
      this.searchData.conversations.forEach(conversation => {
        if (this.matchesSearchFilters(conversation, query, folderFilter, dateFilter, 'conversation')) {
          results.push({
            ...conversation,
            type: 'conversation'
          });
        }
      });
    }

    // Search prompts
    if (searchPrompts) {
      this.searchData.prompts.forEach(prompt => {
        if (this.matchesSearchFilters(prompt, query, null, dateFilter, 'prompt')) {
          results.push({
            ...prompt,
            type: 'prompt'
          });
        }
      });
    }

    // Search folders
    if (query) {
      this.searchData.folders.forEach(folder => {
        if (folder.name.toLowerCase().includes(query)) {
          results.push({
            ...folder,
            type: 'folder',
            title: folder.name,
            description: `Folder with ${this.getFolderConversationCount(folder.id)} conversations`
          });
        }
      });
    }

    // HYBRID SEARCH: Get ChatGPT's sidebar conversations (fallback for Advanced Search)
    if (query && searchConversations) {
      const sidebarResults = this.searchSidebarConversations(query);
      results.push(...sidebarResults);
    }

    // Sort results
    results.sort((a, b) => {
      const aExact = a.title?.toLowerCase().includes(query);
      const bExact = b.title?.toLowerCase().includes(query);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    this.renderSearchResults(results);
  }

  getFolderConversationCount(folderId) {
    return this.searchData.conversations.filter(conv => conv.folderId === folderId).length;
  }



  searchSidebarConversations(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    try {
      // Search all conversations in the sidebar
      const conversationLinks = document.querySelectorAll('nav a[href^="/c/"]');
      
      conversationLinks.forEach(link => {
        const titleElement = link.querySelector('div[title]') || 
                            link.querySelector('span') ||
                            link.querySelector('div');
        
        if (titleElement) {
          const title = titleElement.textContent || titleElement.getAttribute('title') || '';
          if (title.toLowerCase().includes(lowerQuery)) {
            const conversationId = link.href.split('/c/')[1];
            results.push({
              id: conversationId,
              title: title,
              type: 'sidebar_conversation',
              url: link.href,
              createdAt: Date.now(), // Approximate
              updatedAt: Date.now(),
              source: 'ChatGPT Sidebar'
            });
          }
        }
      });
    } catch (error) {
      console.error('Sidebar conversation search failed:', error);
    }
    
    return results;
  }

  matchesSearchFilters(item, query, folderFilter, dateFilter, type) {
    // Text search
    if (query) {
      const title = (item.title || '').toLowerCase();
      const content = (item.content || item.description || '').toLowerCase();
      
      if (!title.includes(query) && !content.includes(query)) {
        return false;
      }
    }

    // Folder filter (only for conversations)
    if (type === 'conversation' && folderFilter && item.folderId !== folderFilter) {
      return false;
    }


    // Date filter
    if (dateFilter && item.updatedAt) {
      const itemDate = new Date(item.updatedAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (itemDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (itemDate < monthAgo) return false;
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          if (itemDate < yearAgo) return false;
          break;
      }
    }

    return true;
  }

  renderSearchResults(results) {
    const container = document.getElementById('cg-results-container');
    const countElement = document.getElementById('cg-results-count');
    
    if (!container) return;

    // Update count
    if (countElement) {
      countElement.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    }

    // Clear container
    container.innerHTML = '';

    if (results.length === 0) {
      container.innerHTML = `
        <div class="cg-no-results">
          <div class="cg-no-results-icon">🔍</div>
          <h4>No results found</h4>
          <p>Try adjusting your search terms or filters</p>
        </div>
      `;
      return;
    }

    // Render results
    results.forEach(result => {
      const resultElement = document.createElement('div');
      resultElement.className = 'cg-result-item';
      resultElement.dataset.id = result.id;
      resultElement.dataset.type = result.type;

      const folder = this.searchData.folders.find(f => f.id === result.folderId);
      
      resultElement.innerHTML = `
        <div class="cg-result-header">
          <div class="cg-result-title">${result.title || 'Untitled'}</div>
          <div class="cg-result-type ${result.type}">${result.type}</div>
        </div>
        <div class="cg-result-meta">
          ${result.type === 'conversation' && folder ? `📁 ${folder.name}` : ''}
          ${result.type === 'prompt' && result.category ? `⚡ ${result.category}` : ''}
          ${result.type === 'folder' ? `📁 ${result.description}` : ''}
          ${result.type === 'native_conversation' ? `🌐 ${result.source}` : ''}
          ${result.type === 'sidebar_conversation' ? `💬 ${result.source}` : ''}
          <span>📅 ${this.formatSearchDate(result.updatedAt || result.createdAt)}</span>
        </div>
      `;

      // Add click handler
      resultElement.addEventListener('click', () => {
        this.handleSearchResultClick(result);
      });

      container.appendChild(resultElement);
    });
  }

  formatSearchDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return 'Today';
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  handleSearchResultClick(result) {
    const overlay = document.getElementById('chatgpt-gold-search-overlay');
    
    if (result.type === 'conversation' && result.url) {
      // Navigate to conversation
      window.location.href = result.url;
      overlay.style.display = 'none';
    } else if (result.type === 'native_conversation' || result.type === 'sidebar_conversation') {
      // Navigate to native ChatGPT conversation
      window.location.href = result.url;
      overlay.style.display = 'none';
    } else if (result.type === 'prompt') {
      // Use prompt - find textarea and insert
      const textarea = document.querySelector('textarea[placeholder*="Message"]');
      if (textarea && this.promptManager) {
        this.promptManager.usePrompt(result);
        overlay.style.display = 'none';
        this.showToast(`Prompt "${result.title}" loaded`);
      }
    } else if (result.type === 'folder') {
      // Show folder contents - filter search to this folder
      const folderSelect = document.getElementById('cg-folder-filter');
      if (folderSelect) {
        folderSelect.value = result.id;
        // Clear search input and perform filtered search
        const searchInput = document.getElementById('cg-search-input');
        if (searchInput) {
          searchInput.value = '';
        }
        this.performOverlaySearch();
        this.showToast(`Showing contents of "${result.name}" folder`);
      }
    }
  }

  async showSearchOverlay() {
    if (!document.getElementById('chatgpt-gold-search-overlay')) {
      this.createSearchOverlay();
    }
    
    // Load search data if not already loaded
    if (!this.searchData) {
      await this.loadSearchData();
    }
    
    const overlay = document.getElementById('chatgpt-gold-search-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      // Focus search input
      setTimeout(() => {
        document.getElementById('cg-search-input')?.focus();
      }, 100);
    }
  }

  async applyThemeSettings(settings) {
    // Apply extension title
    const headerTitle = document.querySelector('#cg-sidebar .cg-sidebar-header h3');
    if (headerTitle && settings.extensionTitle) {
      headerTitle.textContent = settings.extensionTitle;
    }

    // Apply theme colors to CSS variables
    const root = document.documentElement;
    
    if (settings.primaryColor) {
      root.style.setProperty('--cg-primary', settings.primaryColor);
      
      // Calculate hover color (slightly darker)
      const hoverColor = this.adjustColorBrightness(settings.primaryColor, -20);
      root.style.setProperty('--cg-primary-hover', hoverColor);
    }

    // Apply font settings
    if (settings.fontFamily && settings.fontFamily !== 'system') {
      const fontMap = {
        'inter': 'Inter, sans-serif',
        'roboto': 'Roboto, sans-serif',
        'open-sans': 'Open Sans, sans-serif',
        'lato': 'Lato, sans-serif'
      };
      
      const sidebar = document.getElementById('cg-sidebar');
      if (sidebar && fontMap[settings.fontFamily]) {
        sidebar.style.fontFamily = fontMap[settings.fontFamily];
      }
    }

    // Apply font size
    if (settings.fontSize) {
      const sidebar = document.getElementById('cg-sidebar');
      if (sidebar) {
        sidebar.style.fontSize = settings.fontSize + 'px';
      }
    }

    // Apply sidebar width
    if (settings.sidebarWidth) {
      const sidebar = document.getElementById('cg-sidebar');
      if (sidebar) {
        sidebar.style.width = settings.sidebarWidth + 'px';
      }
    }

    // Apply theme (light/dark)
    if (settings.theme) {
      this.applyThemeMode(settings.theme);
    }
  }

  adjustColorBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  applyThemeMode(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.style.setProperty('--cg-bg-primary', '#ffffff');
      root.style.setProperty('--cg-bg-secondary', '#f7f7f8');
      root.style.setProperty('--cg-bg-tertiary', '#ececf1');
      root.style.setProperty('--cg-text-primary', '#374151');
      root.style.setProperty('--cg-text-secondary', '#6b7280');
      root.style.setProperty('--cg-border', '#e5e7eb');
      root.style.setProperty('--cg-shadow', '0 2px 10px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--cg-shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.15)');
    } else if (theme === 'dark') {
      root.style.setProperty('--cg-bg-primary', '#1f2937');
      root.style.setProperty('--cg-bg-secondary', '#374151');
      root.style.setProperty('--cg-bg-tertiary', '#4b5563');
      root.style.setProperty('--cg-text-primary', '#f9fafb');
      root.style.setProperty('--cg-text-secondary', '#d1d5db');
      root.style.setProperty('--cg-border', '#4b5563');
      root.style.setProperty('--cg-shadow', '0 2px 10px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--cg-shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.4)');
    }
    // For 'auto' theme, we rely on the CSS media query
  }

  async loadThemeSettings() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('ChatGPT Gold: Extension context invalidated during theme settings load');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'STORAGE_GET',
        keys: ['chatgpt_gold_settings']
      });
      
      const result = response.success ? response.data : {};
      const settings = result.chatgpt_gold_settings;
      
      if (settings) {
        // Apply theme settings on load
        setTimeout(() => {
          this.applyThemeSettings(settings);
        }, 500); // Small delay to ensure sidebar is created
      }
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.log('ChatGPT Gold: Extension context invalidated during theme settings load');
      } else {
        console.error('Failed to load theme settings:', error);
      }
    }
  }





}

// Listen for search overlay request
window.addEventListener('message', (event) => {
  if (event.data.type === 'CHATGPT_GOLD_SHOW_SEARCH') {
    // Get ChatGPT Gold instance
    const chatgptGold = window.chatgptGoldInstance;
    if (chatgptGold) {
      chatgptGold.showSearchOverlay();
    }
  }
});

// Listen for theme updates from settings
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHATGPT_GOLD_UPDATE_THEME') {
    const chatgptGold = window.chatgptGoldInstance;
    if (chatgptGold) {
      chatgptGold.applyThemeSettings(message.settings);
    }
  }
});

// Store instance globally for message handling
try {
  const chatgptGoldInstance = new ChatGPTGold();
  window.chatgptGoldInstance = chatgptGoldInstance;
  console.log('ChatGPT Gold: Extension loaded successfully');
} catch (error) {
  console.error('ChatGPT Gold: Failed to initialize extension:', error);
}