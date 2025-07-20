// ChatGPT Gold - Command+K Search Enhancer
// Integrates with ChatGPT's native search to add folders and prompts

console.log('CmdK Enhancer script loaded!');

window.CmdKEnhancer = class CmdKEnhancer {
  constructor() {
    this.isActive = false;
    this.searchDialog = null;
    this.searchInput = null;
    this.resultsContainer = null;
    this.enhancedSection = null;
    this.debounceTimer = null;
    
    // Initialize
    this.init();
  }

  init() {
    this.setupKeyboardListener();
    this.setupMessageListener();
    console.log('CmdK Enhancer initialized - Cmd+K will open Advanced Search');
    
    // Test search data availability
    setTimeout(() => {
      this.testSearchDataAvailability();
    }, 2000);
  }

  setSearchData(searchData) {
    this.searchData = searchData;
    console.log('CmdK Enhancer: Search data set directly:', {
      folders: searchData?.folders?.length || 0,
      prompts: searchData?.prompts?.length || 0,
      conversations: searchData?.conversations?.length || 0
    });
  }
  
  testSearchDataAvailability() {
    console.log('CmdK Enhancer: Testing search data availability...');
    const chatgptGold = window.chatgptGoldInstance;
    console.log('CmdK Enhancer: ChatGPT Gold instance:', !!chatgptGold);
    
    if (chatgptGold) {
      console.log('CmdK Enhancer: Search data:', chatgptGold.searchData);
      if (chatgptGold.searchData) {
        console.log('CmdK Enhancer: Search data contents:', {
          folders: chatgptGold.searchData.folders?.length || 0,
          prompts: chatgptGold.searchData.prompts?.length || 0,
          conversations: chatgptGold.searchData.conversations?.length || 0
        });
      }
    }
  }

  setupKeyboardListener() {
    console.log('CmdK Enhancer: Setting up keyboard listener');
    document.addEventListener('keydown', (event) => {
      // Only log and handle if it's the exact combo we care about
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        console.log('CmdK Enhancer: K shortcut detected - ctrlKey:', event.ctrlKey, 'metaKey:', event.metaKey, 'shiftKey:', event.shiftKey);
        
        // Only handle Cmd+K (Mac) and Ctrl+K (Windows/Linux) WITHOUT Shift
        // If Shift is pressed, it's for the extension search, not native search
        if (!event.shiftKey) {
          console.log('CmdK Enhancer: Native search shortcut (without Shift) - will enhance native search');
          
          // Reset enhancement attempts
          this.enhanceAttempts = 0;
          
          // Don't prevent the native search, but enhance it
          // Let ChatGPT's native search open first
          setTimeout(() => {
            this.enhanceNativeSearch();
          }, 100);
        } else {
          console.log('CmdK Enhancer: Extension search shortcut (with Shift) - ignoring, let extension handle it');
        }
      }
    });
  }
  
  enhanceNativeSearch() {
    console.log('CmdK Enhancer: Looking for search dialog...');
    
    // First, let's log what dialogs exist
    const allDialogs = document.querySelectorAll('[role="dialog"]');
    console.log('CmdK Enhancer: Found dialogs:', allDialogs.length);
    allDialogs.forEach((dialog, index) => {
      console.log(`CmdK Enhancer: Dialog ${index}:`, dialog.outerHTML.substring(0, 200) + '...');
    });
    
    // Look for search-related elements
    const searchInputs = document.querySelectorAll('input[placeholder*="Search"], input[placeholder*="search"]');
    console.log('CmdK Enhancer: Found search inputs:', searchInputs.length);
    searchInputs.forEach((input, index) => {
      console.log(`CmdK Enhancer: Search input ${index}:`, input.outerHTML);
    });
    
    // Wait for ChatGPT's native search dialog to appear
    const searchDialog = document.querySelector('[role="dialog"]') || 
                        document.querySelector('div[class*="search"]') ||
                        document.querySelector('input[placeholder*="Search"]')?.closest('div') ||
                        document.querySelector('input[placeholder*="search"]')?.closest('div');
    
    console.log('CmdK Enhancer: Found search dialog:', !!searchDialog);
    if (searchDialog) {
      console.log('CmdK Enhancer: Search dialog HTML:', searchDialog.outerHTML.substring(0, 500) + '...');
    }
    
    if (searchDialog) {
      console.log('CmdK Enhancer: Enhancing search dialog');
      this.addExtensionDataToNativeSearch(searchDialog);
    } else {
      // Try again in a moment, but limit attempts
      this.enhanceAttempts = (this.enhanceAttempts || 0) + 1;
      console.log('CmdK Enhancer: Search dialog not found, attempt', this.enhanceAttempts);
      if (this.enhanceAttempts < 20) {
        setTimeout(() => {
          this.enhanceNativeSearch();
        }, 100);
      } else {
        console.log('CmdK Enhancer: Gave up looking for search dialog after 20 attempts');
      }
    }
  }
  
  addExtensionDataToNativeSearch(searchDialog) {
    // Add our extension data to the native search results
    const searchInput = searchDialog.querySelector('input[placeholder*="Search"]');
    
    if (searchInput) {
      // Clear any existing timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // Monitor search input changes with debounce
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        
        if (query) {
          // Debounce the search
          this.searchTimeout = setTimeout(() => {
            this.injectExtensionResults(query, searchDialog);
          }, 500); // Increased to 500ms to reduce flickering
        } else {
          // Remove extension results when search is empty
          this.removeExtensionResults(searchDialog);
        }
      });
    }
  }
  
  removeExtensionResults(searchDialog) {
    const existingResults = searchDialog.querySelectorAll('.chatgpt-gold-result, .chatgpt-gold-separator');
    existingResults.forEach(el => el.remove());
  }
  
  async injectExtensionResults(query, searchDialog) {
    const chatgptGold = window.chatgptGoldInstance;
    if (!chatgptGold) {
      return;
    }
    
    // Get extension data
    const extensionResults = await this.getExtensionSearchResults(query);
    
    if (extensionResults.length === 0) {
      this.removeExtensionResults(searchDialog);
      return;
    }
    
    // Wait a bit for ChatGPT's results to load first
    setTimeout(() => {
      // Let's log all possible containers first
      const allLists = searchDialog.querySelectorAll('ol, ul');
      console.log('CmdK Enhancer: Found lists in search dialog:', allLists.length);
      allLists.forEach((list, index) => {
        console.log(`CmdK Enhancer: List ${index} (${list.tagName}):`, list.className, list.outerHTML.substring(0, 200) + '...');
      });
      
      // Try different selectors for the results container
      const resultsContainer = searchDialog.querySelector('ol.mx-2') || 
                              searchDialog.querySelector('ol') ||
                              searchDialog.querySelector('ul') ||
                              searchDialog.querySelector('[role="listbox"]') ||
                              searchDialog.querySelector('div[class*="result"]');
      
      console.log('CmdK Enhancer: Looking for results container, found:', !!resultsContainer);
      if (resultsContainer) {
        console.log('CmdK Enhancer: Results container HTML:', resultsContainer.outerHTML.substring(0, 300) + '...');
      }
      
      if (resultsContainer) {
        // Add extension results to the native search
        this.addExtensionResultsToNative(extensionResults, resultsContainer);
      } else {
        console.log('CmdK Enhancer: Could not find any results container');
      }
    }, 300); // Wait 300ms for ChatGPT's results to appear first
  }
  
  async getExtensionSearchResults(query) {
    const results = [];
    
    // Use directly set search data first, then fallback to global instance
    let searchData = this.searchData;
    let chatgptGold = window.chatgptGoldInstance;
    if (!searchData && chatgptGold) {
      searchData = chatgptGold.searchData;
    }
    
    console.log('CmdK Enhancer: Getting extension search results for query:', query);
    console.log('CmdK Enhancer: Direct search data available:', !!this.searchData);
    console.log('CmdK Enhancer: Global search data available:', !!chatgptGold?.searchData);
    
    if (searchData) {
      console.log('CmdK Enhancer: Using search data with contents:', {
        folders: searchData.folders?.length || 0,
        prompts: searchData.prompts?.length || 0,
        conversations: searchData.conversations?.length || 0
      });
    } else {
      console.log('CmdK Enhancer: No search data available from any source');
      return results;
    }
    
    const lowerQuery = query.toLowerCase();
    
    // Search folders
    if (searchData.folders) {
      searchData.folders.forEach(folder => {
        if (folder.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            ...folder,
            type: 'folder',
            title: folder.name,
            description: `Folder with ${chatgptGold?.getFolderConversationCount ? chatgptGold.getFolderConversationCount(folder.id) : searchData.conversations?.filter(c => c.folderId === folder.id).length || 0} conversations`,
            source: 'ChatGPT Gold'
          });
        }
      });
    }
    
    // Search prompts
    if (searchData.prompts) {
      searchData.prompts.forEach(prompt => {
        if (prompt.title.toLowerCase().includes(lowerQuery) || 
            prompt.description?.toLowerCase().includes(lowerQuery)) {
          results.push({
            ...prompt,
            type: 'prompt',
            description: `${prompt.category} - ${prompt.description}`,
            source: 'ChatGPT Gold'
          });
        }
      });
    }
    
    // Search conversations
    if (searchData.conversations) {
      searchData.conversations.forEach(conversation => {
        if (conversation.title.toLowerCase().includes(lowerQuery)) {
          results.push({
            ...conversation,
            type: 'conversation',
            description: `Conversation`,
            source: 'ChatGPT Gold'
          });
        }
      });
    }
    
    console.log('CmdK Enhancer: Found extension results:', results.length);
    results.forEach(result => {
      console.log('CmdK Enhancer: Result:', result.type, result.title);
    });
    
    return results.slice(0, 5); // Limit to 5 results
  }
  
  addExtensionResultsToNative(extensionResults, resultsContainer) {
    console.log('CmdK Enhancer: Adding extension results to native search');
    
    // Remove any existing extension results
    const existingExtensionResults = resultsContainer.querySelectorAll('.chatgpt-gold-result, .chatgpt-gold-separator');
    existingExtensionResults.forEach(el => el.remove());
    
    // Add "FROM CHATGPT GOLD" separator first
    const separator = document.createElement('li');
    separator.className = 'chatgpt-gold-separator';
    separator.innerHTML = `
      <div class="px-4 py-2 text-xs font-medium text-token-text-tertiary uppercase tracking-wide">
        FROM CHATGPT GOLD
      </div>
    `;
    resultsContainer.appendChild(separator);
    
    // Add extension results
    extensionResults.forEach((result) => {
      const resultElement = document.createElement('li');
      resultElement.className = 'chatgpt-gold-result';
      
      // Match ChatGPT's exact result structure
      const icon = result.type === 'folder' ? '📁' : 
                   result.type === 'prompt' ? '⚡' : '💬';
      
      resultElement.innerHTML = `
        <div>
          <div class="cursor-pointer">
            <div class="group relative flex items-center rounded-xl px-4 py-3 hover:bg-token-surface-secondary">
              <div class="flex items-center justify-center w-5 h-5 text-base">
                ${icon}
              </div>
              <div class="relative grow overflow-hidden whitespace-nowrap ps-2">
                <div class="flex items-center">
                  <div class="relative grow overflow-hidden whitespace-nowrap">
                    <div class="text-sm text-token-text-primary">
                      <div class="truncate">${result.title}</div>
                    </div>
                    <div class="pt-1 text-xs text-token-text-secondary">
                      <div class="truncate">${result.description}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add click handler
      resultElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleExtensionResultClick(result);
      });
      
      // Insert at the beginning of the results container
      resultsContainer.insertBefore(resultElement, resultsContainer.firstChild);
    });
    
    // Add separator after extension results if there are native results
    if (resultsContainer.children.length > extensionResults.length) {
      const separator = document.createElement('li');
      separator.className = 'chatgpt-gold-separator';
      separator.innerHTML = `
        <div class="px-4 py-2">
          <div class="flex items-center">
            <div class="flex-1 border-t border-token-border-light"></div>
            <div class="px-3 text-xs text-token-text-tertiary font-medium">
              FROM CHATGPT GOLD
            </div>
            <div class="flex-1 border-t border-token-border-light"></div>
          </div>
        </div>
      `;
      
      // Insert the separator after the extension results
      const insertPosition = resultsContainer.children[extensionResults.length];
      resultsContainer.insertBefore(separator, insertPosition);
    }
  }
  
  handleExtensionResultClick(result) {
    const chatgptGold = window.chatgptGoldInstance;
    
    // Close native search
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });
    document.dispatchEvent(escapeEvent);
    
    // Handle the result click
    if (result.type === 'folder') {
      // Open ChatGPT Gold's Advanced Search with folder selected
      chatgptGold.showSearchOverlay();
      setTimeout(() => {
        const folderSelect = document.getElementById('cg-folder-filter');
        if (folderSelect) {
          folderSelect.value = result.id;
          chatgptGold.performOverlaySearch();
        }
      }, 100);
    } else if (result.type === 'prompt') {
      // Use the prompt
      if (chatgptGold.promptManager) {
        chatgptGold.promptManager.usePrompt(result);
      }
    } else if (result.type === 'conversation') {
      // Navigate to conversation
      if (result.url) {
        window.location.href = result.url;
      }
    }
  }

  // Mutation observer removed - we now directly open Advanced Search on Cmd+K

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'CHATGPT_GOLD_ENABLE_SEARCH') {
        // Open ChatGPT Gold's Advanced Search from popup button
        const chatgptGold = window.chatgptGoldInstance;
        if (chatgptGold && chatgptGold.showSearchOverlay) {
          chatgptGold.showSearchOverlay();
        }
      }
    });
  }

  // All dialog enhancement methods removed - we now directly open Advanced Search
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('CmdK Enhancer: DOM ready, initializing...');
    new window.CmdKEnhancer();
  });
} else {
  console.log('CmdK Enhancer: DOM already ready, initializing...');
  new window.CmdKEnhancer();
}