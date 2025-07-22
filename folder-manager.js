/**
 * ChatGPT Gold - Folder Management System
 * Handles creation, organization, and management of conversation folders
 */

class FolderManager {
  constructor(parentInstance) {
    this.parent = parentInstance;
    this.folders = [];
    this.conversations = [];
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      draggedIndex: null,
      dropTarget: null
    };
    this.sortState = {
      currentSort: 'custom', // custom, name, date
      direction: 'asc', // asc, desc
      previousState: null
    };
    this.savedViews = [];
    this.emojiData = this.getEmojiData();
    this.init();
  }

  async init() {
    await this.loadFolders();
    await this.loadConversations();
    console.log('ChatGPT Gold: Folder Manager initialized with:', this.folders.length, 'folders and', this.conversations.length, 'conversations');
    this.renderFolders();
    this.setupFolderEventListeners();
    this.injectConversationIndicators();
  }

  async loadFolders() {
    try {
      // First try direct chrome.storage.local.get
      try {
        const result = await chrome.storage.local.get(['chatgpt_gold_folders']);
        this.folders = result.chatgpt_gold_folders || this.getDefaultFolders();
        console.log('ChatGPT Gold: Folders loaded via direct storage');
      } catch (directError) {
        console.warn('ChatGPT Gold: Direct storage failed, trying background script:', directError);
        
        // Fallback to background script
        const response = await chrome.runtime.sendMessage({
          type: 'STORAGE_GET',
          keys: ['chatgpt_gold_folders']
        });
        
        if (response && response.success) {
          this.folders = response.data.chatgpt_gold_folders || this.getDefaultFolders();
          console.log('ChatGPT Gold: Folders loaded via background script');
        } else {
          throw new Error(response ? response.error : 'No response from background script');
        }
      }
    } catch (error) {
      console.error('ChatGPT Gold: Failed to load folders from chrome storage, trying localStorage fallback:', error);
      
      // Try localStorage fallback
      try {
        const backup = localStorage.getItem('chatgpt_gold_folders_backup');
        if (backup) {
          this.folders = JSON.parse(backup);
          console.log('ChatGPT Gold: Folders loaded from localStorage fallback');
        } else {
          this.folders = this.getDefaultFolders();
          console.log('ChatGPT Gold: Using default folders');
        }
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        this.folders = this.getDefaultFolders();
      }
    }
  }

  async loadConversations() {
    try {
      // First try direct chrome.storage.local.get
      try {
        const result = await chrome.storage.local.get(['chatgpt_gold_conversations']);
        this.conversations = result.chatgpt_gold_conversations || [];
        console.log('ChatGPT Gold: Conversations loaded via direct storage:', this.conversations.length);
      } catch (directError) {
        console.warn('ChatGPT Gold: Direct storage failed, trying background script:', directError);
        
        // Fallback to background script
        const response = await chrome.runtime.sendMessage({
          type: 'STORAGE_GET',
          keys: ['chatgpt_gold_conversations']
        });
        
        if (response && response.success) {
          this.conversations = response.data.chatgpt_gold_conversations || [];
          console.log('ChatGPT Gold: Conversations loaded via background script');
        } else {
          throw new Error(response ? response.error : 'No response from background script');
        }
      }
    } catch (error) {
      console.error('ChatGPT Gold: Failed to load conversations from chrome storage, trying localStorage fallback:', error);
      
      // Try localStorage fallback
      try {
        const backup = localStorage.getItem('chatgpt_gold_conversations_backup');
        if (backup) {
          this.conversations = JSON.parse(backup);
          console.log('ChatGPT Gold: Conversations loaded from localStorage fallback:', this.conversations.length);
        } else {
          this.conversations = [];
          console.log('ChatGPT Gold: Using empty conversations array');
        }
      } catch (localError) {
        console.error('ChatGPT Gold: localStorage fallback failed:', localError);
        this.conversations = [];
      }
    }
  }

  getDefaultFolders() {
    return [
      { id: 'folder_work', name: 'Work', icon: '💼', color: '#10a37f', parentId: null, expanded: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'folder_personal', name: 'Personal', icon: '👤', color: '#3b82f6', parentId: null, expanded: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'folder_learning', name: 'Learning', icon: '🎓', color: '#8b5cf6', parentId: null, expanded: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'folder_archive', name: 'Archive', icon: '📦', color: '#6b7280', parentId: null, expanded: false, createdAt: Date.now(), updatedAt: Date.now() }
    ];
  }

  async saveFolders(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000;
    
    try {
      console.log('ChatGPT Gold: Saving folders, attempt', retryCount + 1);
      
      // First try direct chrome.storage.local.set
      try {
        await chrome.storage.local.set({ chatgpt_gold_folders: this.folders });
        console.log('ChatGPT Gold: Folders saved successfully via direct storage');
        
        // Also save to localStorage as backup
        localStorage.setItem('chatgpt_gold_folders_backup', JSON.stringify(this.folders));
        return; // Success
      } catch (directError) {
        console.warn('ChatGPT Gold: Direct storage failed, trying background script:', directError);
        
        // Fallback to background script
        const response = await chrome.runtime.sendMessage({
          type: 'STORAGE_SET',
          data: { chatgpt_gold_folders: this.folders }
        });
        
        if (!response || !response.success) {
          throw new Error(response ? response.error : 'No response from background script');
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('chatgpt_gold_folders_backup', JSON.stringify(this.folders));
        console.log('ChatGPT Gold: Folders saved successfully via background script');
        return; // Success
      }
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to save via chrome storage, using localStorage fallback:', error);
      
      // Check for extension context issues
      const isExtensionContextError = error.message && (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('chrome.runtime.sendMessage') ||
        error.message.includes('chrome.storage')
      );
      
      if (isExtensionContextError || retryCount >= maxRetries) {
        // Fallback to localStorage
        try {
          localStorage.setItem('chatgpt_gold_folders_backup', JSON.stringify(this.folders));
          console.log('ChatGPT Gold: Folders saved to localStorage fallback');
          return; // Success via fallback
        } catch (localError) {
          console.error('ChatGPT Gold: localStorage fallback failed:', localError);
          throw localError;
        }
      }
      
      if (retryCount < maxRetries) {
        console.log('ChatGPT Gold: Retrying save operation in', retryDelay, 'ms');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.saveFolders(retryCount + 1);
      } else {
        console.error('ChatGPT Gold: All save attempts failed');
        throw error;
      }
    }
  }

  async saveConversations(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000;
    
    try {
      console.log('ChatGPT Gold: Saving conversations, attempt', retryCount + 1, 'conversations:', this.conversations.length);
      
      // First try direct chrome.storage.local.set
      try {
        await chrome.storage.local.set({ chatgpt_gold_conversations: this.conversations });
        console.log('ChatGPT Gold: Conversations saved successfully via direct storage');
        
        // Also save to localStorage as backup
        localStorage.setItem('chatgpt_gold_conversations_backup', JSON.stringify(this.conversations));
        return; // Success
      } catch (directError) {
        console.warn('ChatGPT Gold: Direct storage failed, trying background script:', directError);
        
        // Fallback to background script
        const response = await chrome.runtime.sendMessage({
          type: 'STORAGE_SET',
          data: { chatgpt_gold_conversations: this.conversations }
        });
        
        if (!response || !response.success) {
          throw new Error(response ? response.error : 'No response from background script');
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('chatgpt_gold_conversations_backup', JSON.stringify(this.conversations));
        console.log('ChatGPT Gold: Conversations saved successfully via background script');
        return; // Success
      }
    } catch (error) {
      console.warn('ChatGPT Gold: Failed to save via chrome storage, using localStorage fallback:', error);
      
      // Check for extension context issues
      const isExtensionContextError = error.message && (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('chrome.runtime.sendMessage') ||
        error.message.includes('chrome.storage')
      );
      
      if (isExtensionContextError || retryCount >= maxRetries) {
        // Fallback to localStorage
        try {
          localStorage.setItem('chatgpt_gold_conversations_backup', JSON.stringify(this.conversations));
          console.log('ChatGPT Gold: Conversations saved to localStorage fallback');
          return; // Success via fallback
        } catch (localError) {
          console.error('ChatGPT Gold: localStorage fallback failed:', localError);
          throw localError;
        }
      }
      
      if (retryCount < maxRetries) {
        console.log('ChatGPT Gold: Retrying save operation in', retryDelay, 'ms');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.saveConversations(retryCount + 1);
      } else {
        console.error('ChatGPT Gold: All save attempts failed');
        throw error;
      }
    }
  }

  async createFolder(folderData) {
    const folder = {
      id: 'folder_' + Date.now(),
      name: folderData.name,
      icon: folderData.icon || '📁',
      color: folderData.color || '#6b7280',
      parentId: folderData.parentId || null,
      expanded: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.folders.push(folder);
    await this.saveFolders();
    this.renderFolders();
    
    // Refresh search data in parent
    if (this.parent.refreshSearchData) {
      this.parent.refreshSearchData();
    }
    
    this.parent.showToast(`Folder "${folder.name}" created successfully`);
    return folder;
  }

  async editFolder(folderId, folderData) {
    const index = this.folders.findIndex(f => f.id === folderId);
    if (index === -1) throw new Error('Folder not found');
    this.folders[index] = { ...this.folders[index], ...folderData, updatedAt: Date.now() };
    await this.saveFolders();
    this.renderFolders();
    this.parent.showToast(`Folder "${folderData.name}" updated successfully`);
    return this.folders[index];
  }

  async deleteFolder(folderId) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');

    this.conversations.filter(c => c.folderId === folderId).forEach(conv => {
      conv.folderId = null;
      conv.updatedAt = Date.now();
    });

    const subfolders = this.folders.filter(f => f.parentId === folderId);
    for (const subfolder of subfolders) {
      await this.deleteFolder(subfolder.id);
    }

    this.folders = this.folders.filter(f => f.id !== folderId);
    await this.saveFolders();
    await this.saveConversations();
    this.renderFolders();
    this.updateConversationIndicators();
    this.parent.showToast(`Folder "${folder.name}" deleted`);
  }

  async addCurrentChatToFolder(folderId) {
    const currentChat = await this.extractCurrentConversation();
    if (!currentChat) {
      this.parent.showToast('No active conversation found');
      return;
    }

    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) {
      this.parent.showToast('Folder not found');
      return;
    }

    console.log('ChatGPT Gold: Adding chat to folder:', {
      chatId: currentChat.id,
      chatTitle: currentChat.title,
      folderId: folderId,
      folderName: folder.name
    });

    const existingConv = this.conversations.find(c => c.id === currentChat.id);
    if (existingConv) {
      console.log('ChatGPT Gold: Updating existing conversation');
      existingConv.folderId = folderId;
      existingConv.title = currentChat.title;
      existingConv.lastMessage = currentChat.lastMessage;
      existingConv.updatedAt = Date.now();
    } else {
      console.log('ChatGPT Gold: Creating new conversation entry');
      const conversation = {
        id: currentChat.id,
        title: currentChat.title,
        url: currentChat.url,
        folderId: folderId,
        lastMessage: currentChat.lastMessage,
        messageCount: currentChat.messageCount,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.conversations.push(conversation);
    }

    try {
      await this.saveConversations();
      this.renderFolders();
      this.updateConversationIndicators();
      
      // Refresh search data in parent
      if (this.parent.refreshSearchData) {
        this.parent.refreshSearchData();
      }
      
      this.parent.showToast(`Chat added to "${folder.name}"`);
    } catch (error) {
      console.error('ChatGPT Gold: Error in addCurrentChatToFolder:', error);
      this.parent.showToast(`Failed to add chat to "${folder.name}"`);
    }
  }

  async moveConversationToFolder(conversationId, newFolderId) {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      this.parent.showToast('Conversation not found');
      return;
    }

    const oldFolder = this.folders.find(f => f.id === conversation.folderId);
    const newFolder = this.folders.find(f => f.id === newFolderId);
    const oldFolderId = conversation.folderId; // Store original value for potential revert

    try {
      conversation.folderId = newFolderId;
      conversation.updatedAt = Date.now();

      await this.saveConversations();
      this.renderFolders();
      this.updateConversationIndicators();

      // Refresh search data in parent
      if (this.parent.refreshSearchData) {
        this.parent.refreshSearchData();
      }

      const oldFolderName = oldFolder ? oldFolder.name : 'Uncategorized';
      const newFolderName = newFolder ? newFolder.name : 'Uncategorized';
      this.parent.showToast(`Moved chat from "${oldFolderName}" to "${newFolderName}"`);
    } catch (error) {
      console.error('ChatGPT Gold: Failed to move conversation:', error);
      
      // Check for extension context issues
      const isExtensionContextError = error.message && (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('chrome.runtime.sendMessage')
      );
      
      if (isExtensionContextError) {
        console.log('ChatGPT Gold: Extension context invalidated, but move may have been saved locally');
        const oldFolderName = oldFolder ? oldFolder.name : 'Uncategorized';
        const newFolderName = newFolder ? newFolder.name : 'Uncategorized';
        this.parent.showToast(`Moved chat from "${oldFolderName}" to "${newFolderName}" (saved locally)`);
        this.renderFolders();
        this.updateConversationIndicators();
      } else {
        // Revert the change for other errors
        conversation.folderId = oldFolderId;
        this.parent.showToast('Failed to move conversation. Please try again.');
        this.renderFolders();
        this.updateConversationIndicators();
      }
    }
  }

  async clearFolderConversations(folderId) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) {
      this.parent.showToast('Folder not found');
      return;
    }

    const conversationsInFolder = this.conversations.filter(c => c.folderId === folderId);
    if (conversationsInFolder.length === 0) {
      this.parent.showToast(`Folder "${folder.name}" is already empty`);
      return;
    }

    this.showClearFolderConfirmDialog(folder, conversationsInFolder);
  }

  async extractCurrentConversation() {
    try {
      const url = window.location.href;
      const conversationId = this.getConversationIdFromUrl(url);
      const title = await this.extractChatTitle(conversationId);
      const lastMessage = this.extractLastMessage();
      const messageCount = this.countMessages();

      if (!conversationId) {
        return null; // Not in a valid conversation
      }

      return {
        id: conversationId,
        title: title || 'Untitled Chat',
        url: url,
        lastMessage: lastMessage,
        messageCount: messageCount
      };
    } catch (error) {
      console.error('Failed to extract conversation:', error);
      return null;
    }
  }

  getConversationIdFromUrl(url) {
    const match = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  async extractChatTitle(conversationId) {
    const chatLink = document.querySelector(`a[href*="${conversationId}"]`);
    if (chatLink && chatLink.textContent.trim()) {
      return chatLink.textContent.trim();
    }

    try {
      const titleElement = await this.waitForElement('h1[class*="title"]', 2000);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    } catch (error) {
      // Fallback if title doesn't appear quickly
    }

    const firstUserMessage = document.querySelector('[data-message-author-role="user"]');
    if (firstUserMessage) {
      const text = firstUserMessage.textContent.trim();
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }

    return `Conversation ${conversationId.substring(0, 8)}...`;
  }

  extractLastMessage() {
    const messages = document.querySelectorAll('[data-message-author-role]');
    if (messages.length === 0) return null;
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage.textContent.trim();
    const author = lastMessage.getAttribute('data-message-author-role');
    return { text: text.length > 100 ? text.substring(0, 100) + '...' : text, author: author, timestamp: Date.now() };
  }

  countMessages() {
    return document.querySelectorAll('[data-message-author-role]').length;
  }

  showFolderDialog(folder = null) {
    const isEdit = !!folder;
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-folder-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">${isEdit ? 'Edit' : 'Create'} Folder</h3>
          <button class="cg-modal-close" data-action="close-folder-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <form id="cg-folder-form">
            <div class="cg-form-group">
              <label class="cg-form-label">Folder Name *</label>
              <input type="text" class="cg-form-input" name="name" value="${folder?.name || ''}" placeholder="Enter folder name..." required>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Icon</label>
              <div id="cg-folder-icon-picker"></div>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Color</label>
              <div class="cg-color-picker">
                <input type="color" class="cg-form-input" name="color" value="${folder?.color || '#6b7280'}">
                <div class="cg-color-suggestions">
                  <button type="button" class="cg-color-btn" data-color="#10a37f" style="background: #10a37f"></button>
                  <button type="button" class="cg-color-btn" data-color="#3b82f6" style="background: #3b82f6"></button>
                  <button type="button" class="cg-color-btn" data-color="#8b5cf6" style="background: #8b5cf6"></button>
                  <button type="button" class="cg-color-btn" data-color="#f59e0b" style="background: #f59e0b"></button>
                  <button type="button" class="cg-color-btn" data-color="#ef4444" style="background: #ef4444"></button>
                  <button type="button" class="cg-color-btn" data-color="#6b7280" style="background: #6b7280"></button>
                </div>
              </div>
            </div>
            <div class="cg-form-actions">
              <button type="submit" class="cg-btn cg-btn-primary">
                ${isEdit ? 'Update' : 'Create'} Folder
              </button>
              <button type="button" class="cg-btn cg-btn-secondary" data-action="close-folder-modal">
                Cancel
              </button>
              ${isEdit ? `
                <button type="button" class="cg-btn cg-btn-danger" data-action="delete-folder" data-folder-id="${folder.id}">
                  Delete
                </button>
              ` : ''}
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Setup emoji picker for folder icon
    const folderIconPickerContainer = modal.querySelector('#cg-folder-icon-picker');
    if (folderIconPickerContainer) {
      const folderEmojiPicker = this.createEmojiPicker(folder?.icon || '📁');
      folderIconPickerContainer.appendChild(folderEmojiPicker);
    }

    modal.querySelectorAll('.cg-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelector('input[name="color"]').value = btn.dataset.color;
      });
    });

    const form = modal.querySelector('#cg-folder-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const folderEmojiPicker = folderIconPickerContainer?.querySelector('.cg-emoji-picker');
      const folderIcon = folderEmojiPicker ? this.getSelectedEmoji(folderEmojiPicker) : (folder?.icon || '📁');
      const folderData = { name: formData.get('name'), icon: folderIcon, color: formData.get('color') };
      try {
        if (isEdit) await this.editFolder(folder.id, folderData);
        else await this.createFolder(folderData);
        modal.remove();
      } catch (error) {
        console.error('Failed to save folder:', error);
        this.parent.showToast('Failed to save folder');
      }
    });

    modal.addEventListener('click', async (e) => {
      if (e.target.dataset.action === 'delete-folder') {
        modal.remove();
        this.showDeleteFolderConfirmDialog(folder);
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-folder-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });

    setTimeout(() => { modal.querySelector('input[name="name"]')?.focus(); }, 100);
  }

  showClearFolderConfirmDialog(folder, conversationsInFolder) {
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-clear-confirm-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Clear Folder</h3>
          <button class="cg-modal-close" data-action="close-clear-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-delete-warning">
            <div class="cg-warning-icon">⚠️</div>
            <div class="cg-warning-content">
              <p class="cg-warning-title">Are you sure you want to clear this folder?</p>
              <p class="cg-warning-description">
                <strong>${conversationsInFolder.length} conversations</strong> will be removed from <strong>"${folder.name}"</strong> and moved to Uncategorized.
              </p>
            </div>
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-danger" data-action="confirm-clear">Clear Folder</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-clear-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm-clear') {
        try {
          conversationsInFolder.forEach(conv => {
            conv.folderId = null;
            conv.updatedAt = Date.now();
          });

          await this.saveConversations();
          this.renderFolders();
          this.updateConversationIndicators();
          this.parent.showToast(`Cleared ${conversationsInFolder.length} conversations from "${folder.name}"`);
          modal.remove();
        } catch (error) {
          console.error('Failed to clear folder:', error);
          this.parent.showToast('Failed to clear folder');
        }
      } else if (action === 'close-clear-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        modal.remove();
      }
    });

    // Focus the cancel button by default for safety
    setTimeout(() => { modal.querySelector('[data-action="close-clear-modal"]')?.focus(); }, 100);
  }

  showDeleteFolderConfirmDialog(folder) {
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-delete-confirm-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Delete Folder</h3>
          <button class="cg-modal-close" data-action="close-delete-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-delete-warning">
            <div class="cg-warning-icon">⚠️</div>
            <div class="cg-warning-content">
              <p class="cg-warning-title">Are you sure you want to delete this folder?</p>
              <p class="cg-warning-description">
                <strong>"${folder.name}"</strong> will be permanently deleted.<br>
                All conversations will be moved to Uncategorized.
              </p>
            </div>
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-danger" data-action="confirm-delete">Delete Folder</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-delete-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm-delete') {
        try {
          await this.deleteFolder(folder.id);
          this.parent.showToast(`Folder "${folder.name}" deleted successfully`);
          modal.remove();
        } catch (error) {
          console.error('Failed to delete folder:', error);
          this.parent.showToast('Failed to delete folder');
        }
      } else if (action === 'close-delete-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        modal.remove();
      }
    });

    // Focus the cancel button by default for safety
    setTimeout(() => { modal.querySelector('[data-action="close-delete-modal"]')?.focus(); }, 100);
  }

  showMoveConversationDialog(conversationId) {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-move-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Move Conversation</h3>
          <button class="cg-modal-close" data-action="close-move-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <p class="cg-modal-description">Move "${conversation.title}" to:</p>
          <div class="cg-folder-list">
            <div class="cg-folder-option ${!conversation.folderId ? 'selected' : ''}" data-folder-id="">
              <span class="cg-folder-icon">📂</span>
              <span class="cg-folder-name">Uncategorized</span>
            </div>
            ${this.folders.map(folder => `
              <div class="cg-folder-option ${folder.id === conversation.folderId ? 'selected' : ''}" 
                   data-folder-id="${folder.id}">
                <span class="cg-folder-icon">${folder.icon}</span>
                <span class="cg-folder-name">${folder.name}</span>
              </div>
            `).join('')}
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-primary" id="cg-move-confirm">Move</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-move-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let selectedFolderId = conversation.folderId;
    modal.querySelectorAll('.cg-folder-option').forEach(option => {
      if (!option) return;
      option.addEventListener('click', () => {
        if (!modal || !option) return;
        const allOptions = modal.querySelectorAll('.cg-folder-option');
        if (allOptions) {
          allOptions.forEach(opt => {
            if (opt) opt.classList.remove('selected');
          });
        }
        if (option) {
          option.classList.add('selected');
          selectedFolderId = option.dataset?.folderId || null;
        }
      });
    });

    modal.querySelector('#cg-move-confirm').addEventListener('click', async () => {
      try {
        await this.moveConversationToFolder(conversationId, selectedFolderId);
        modal.remove();
      } catch (error) {
        console.error('Failed to move conversation:', error);
        this.parent.showToast('Failed to move conversation');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-move-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });
  }

  async showAddCurrentChatDialog() {
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-add-chat-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Add Current Chat to Folder</h3>
          <button class="cg-modal-close" data-action="close-add-chat-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <p class="cg-modal-description">Select a folder for the current conversation:</p>
          <div class="cg-folder-list">
            ${this.folders.map(folder => `
              <div class="cg-folder-option" data-folder-id="${folder.id}">
                <span class="cg-folder-icon">${folder.icon}</span>
                <span class="cg-folder-name">${folder.name}</span>
                <span class="cg-folder-count">(${this.getConversationCount(folder.id)})</span>
              </div>
            `).join('')}
          </div>
          
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-primary" id="cg-add-chat-confirm">Add to Folder</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-add-chat-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let selectedFolderId = null;

    // Folder selection
    modal.querySelectorAll('.cg-folder-option').forEach(option => {
      if (!option) return;
      option.addEventListener('click', () => {
        if (!modal || !option) return;
        const allOptions = modal.querySelectorAll('.cg-folder-option');
        if (allOptions) {
          allOptions.forEach(opt => {
            if (opt) opt.classList.remove('selected');
          });
        }
        if (option) {
          option.classList.add('selected');
          selectedFolderId = option.dataset?.folderId;
        }
      });
    });

    modal.querySelector('#cg-add-chat-confirm').addEventListener('click', async () => {
      if (!selectedFolderId) {
        this.parent.showToast('Please select a folder');
        return;
      }
      try {
        await this.addCurrentChatToFolder(selectedFolderId);
        modal.remove();
      } catch (error) {
        console.error('Failed to add chat to folder:', error);
        this.parent.showToast('Failed to add chat to folder');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-add-chat-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });
  }



  getConversationCount(folderId) {
    return this.conversations.filter(conv => conv.folderId === folderId).length;
  }

  getConversationsForFolder(folderId) {
    return this.conversations.filter(conv => conv.folderId === folderId);
  }

  searchConversations(query) {
    if (!query) return this.conversations;
    const lowerQuery = query.toLowerCase();
    return this.conversations.filter(conv => 
      conv.title.toLowerCase().includes(lowerQuery) ||
      (conv.lastMessage && conv.lastMessage.text.toLowerCase().includes(lowerQuery))
    );
  }

  async toggleFolder(folderId) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return;

    folder.expanded = !folder.expanded;
    await this.saveFolders();

    // Update DOM directly instead of re-rendering entire list
    const folderElement = document.querySelector(`.cg-folder-item[data-folder-id="${folderId}"]`);
    if (folderElement) {
      folderElement.classList.toggle('expanded', folder.expanded);
      
      const conversationsDiv = folderElement.querySelector('.cg-folder-conversations');
      if (conversationsDiv) {
        conversationsDiv.style.display = folder.expanded ? 'block' : 'none';
      }
      
      const toggleIcon = folderElement.querySelector('.cg-folder-toggle span');
      if (toggleIcon) {
        toggleIcon.textContent = folder.expanded ? '▼' : '▶';
      }
    }
    
    console.log('ChatGPT Gold: Toggled folder', folder.name, 'expanded:', folder.expanded);
  }

  getAllExpandedState() {
    return this.folders.every(folder => folder.expanded);
  }

  async toggleAllFolders() {
    const allExpanded = this.getAllExpandedState();
    const newState = !allExpanded;
    
    this.folders.forEach(folder => {
      folder.expanded = newState;
    });
    
    await this.saveFolders();
    this.renderFolders();
    
    this.parent.showToast(newState ? 'All folders expanded' : 'All folders collapsed');
  }

  renderFolders() {
    const container = document.getElementById('cg-conversations-list');
    if (!container) {
      console.log('ChatGPT Gold: Could not find conversations list container');
      return;
    }
    
    const uncategorizedConversations = this.conversations.filter(conv => !conv.folderId);

    container.innerHTML = `
      <div class="cg-toolbar">
        <div class="cg-toolbar-left">
          <div class="cg-sort-controls">
            <select class="cg-sort-dropdown" id="cg-sort-type-folders">
              <option value="custom" ${this.sortState.currentSort === 'custom' ? 'selected' : ''}>Custom Order</option>
              <option value="name" ${this.sortState.currentSort === 'name' ? 'selected' : ''}>Alphabetical</option>
              <option value="date" ${this.sortState.currentSort === 'date' ? 'selected' : ''}>Date</option>
            </select>
            <div class="cg-sort-direction" ${this.sortState.currentSort === 'custom' ? 'style="display: none;"' : ''}>
              <button class="cg-direction-btn ${this.sortState.direction === 'asc' ? 'active' : ''}" data-direction="asc" title="Ascending">
                ↑
              </button>
              <button class="cg-direction-btn ${this.sortState.direction === 'desc' ? 'active' : ''}" data-direction="desc" title="Descending">
                ↓
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="cg-expand-controls">
        <button class="cg-expand-btn" id="cg-toggle-all-folders">${this.getAllExpandedState() ? 'Collapse All Folders' : 'Expand All Folders'}</button>
      </div>
      ${this.getSortedFolders().map((folder, index) => `
        <div class="cg-folder-item ${folder.expanded ? 'expanded' : ''}" data-folder-id="${folder.id}" data-folder-index="${index}">
          <div class="cg-folder-header" style="border-left: 3px solid ${folder.color}">
            <div class="cg-drag-handle" draggable="true" data-action="drag-folder" data-folder-id="${folder.id}" data-folder-index="${index}" title="Drag to reorder">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor"></path>
              </svg>
            </div>
            <button class="cg-folder-toggle" data-action="toggle-folder" data-folder-id="${folder.id}" type="button">
              <span data-action="toggle-folder" data-folder-id="${folder.id}">${folder.expanded ? '▼' : '▶'}</span>
            </button>
            <span class="cg-folder-icon">${folder.icon}</span>
            <span class="cg-folder-name">${folder.name}</span>
            <span class="cg-folder-count">(${this.getConversationCount(folder.id)})</span>
            <div class="cg-folder-controls">
              <button class="cg-folder-btn" data-action="edit-folder" data-folder-id="${folder.id}" title="Edit folder">✏️</button>
              <button class="cg-folder-btn" data-action="add-current-chat" data-folder-id="${folder.id}" title="Add current chat">➕</button>
              <button class="cg-folder-btn" data-action="clear-folder" data-folder-id="${folder.id}" title="Clear all conversations from folder">🗑️</button>
            </div>
          </div>
          <div class="cg-folder-conversations" style="display: ${folder.expanded ? 'block' : 'none'}">
            ${this.getSortedConversations(folder.id).map((conv, convIndex) => `
              <div class="cg-conversation-item" data-conversation-id="${conv.id}" data-conversation-index="${convIndex}">
                <div class="cg-conversation-main">
                  <div class="cg-conversation-drag-handle" draggable="true" data-action="drag-conversation" data-conversation-id="${conv.id}" data-conversation-index="${convIndex}" title="Drag to reorder">
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor"></path>
                    </svg>
                  </div>
                  <span class="cg-conversation-title">${conv.title}</span>
                  <div class="cg-conversation-controls">
                    <button class="cg-conversation-btn" data-action="move-conversation" data-conversation-id="${conv.id}" title="Move to another folder">📁</button>
                    <button class="cg-conversation-btn" data-action="open-conversation" data-url="${conv.url}" title="Open conversation">🔗</button>
                    <button class="cg-conversation-btn cg-delete-btn" data-action="delete-conversation" data-conversation-id="${conv.id}" title="Delete conversation">🗑️</button>
                  </div>
                </div>
                <div class="cg-conversation-meta">
                  <span class="cg-conversation-date">${this.formatDate(conv.updatedAt)}</span>
                  <span class="cg-conversation-messages">${conv.messageCount} messages</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      
      ${uncategorizedConversations.length > 0 ? `
        <div class="cg-folder-item expanded">
          <div class="cg-folder-header">
            <span class="cg-folder-icon">📂</span>
            <span class="cg-folder-name">Uncategorized</span>
            <span class="cg-folder-count">(${uncategorizedConversations.length})</span>
          </div>
          <div class="cg-folder-conversations">
            ${this.getSortedConversations(null).map((conv, convIndex) => `
              <div class="cg-conversation-item" data-conversation-id="${conv.id}" data-conversation-index="${convIndex}">
                <div class="cg-conversation-main">
                  <div class="cg-conversation-drag-handle" draggable="true" data-action="drag-conversation" data-conversation-id="${conv.id}" data-conversation-index="${convIndex}" title="Drag to reorder">
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM9 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM14 15a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor"></path>
                    </svg>
                  </div>
                  <span class="cg-conversation-title">${conv.title}</span>
                  <div class="cg-conversation-controls">
                    <button class="cg-conversation-btn" data-action="move-conversation" data-conversation-id="${conv.id}" title="Move to folder">📁</button>
                    <button class="cg-conversation-btn" data-action="open-conversation" data-url="${conv.url}" title="Open conversation">🔗</button>
                    <button class="cg-conversation-btn cg-delete-btn" data-action="delete-conversation" data-conversation-id="${conv.id}" title="Delete conversation">🗑️</button>
                  </div>
                </div>
                <div class="cg-conversation-meta">
                  <span class="cg-conversation-date">${this.formatDate(conv.updatedAt)}</span>
                  <span class="cg-conversation-messages">${conv.messageCount} messages</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // Re-attach sort event listeners after rendering
    this.setupSortEventListeners(container);
    
    // Re-attach toggle all button listener after rendering
    this.setupToggleAllListener(container);
  }

  setupFolderEventListeners() {
    const container = document.getElementById('cg-conversations-list');
    if (!container || container.dataset.listenersAttached) return;

    // Drag and drop event listeners
    container.addEventListener('dragstart', this.handleDragStart.bind(this));
    container.addEventListener('dragover', this.handleDragOver.bind(this));
    container.addEventListener('dragenter', this.handleDragEnter.bind(this));
    container.addEventListener('dragleave', this.handleDragLeave.bind(this));
    container.addEventListener('drop', this.handleDrop.bind(this));
    container.addEventListener('dragend', this.handleDragEnd.bind(this));

    // Sort controls event listeners
    this.setupSortEventListeners(container);

    container.addEventListener('click', async (e) => {
      if (!e.target) return;
      const action = e.target.dataset?.action;
      const folderId = e.target.dataset?.folderId;
      const conversationId = e.target.dataset?.conversationId;

      switch (action) {
        case 'toggle-folder':
          if (!e.target.closest('.cg-folder-controls')) {
            e.preventDefault();
            e.stopPropagation();
            await this.toggleFolder(folderId);
          }
          break;
        case 'edit-folder':
          e.preventDefault();
          e.stopPropagation();
          const folder = this.folders.find(f => f.id === folderId);
          if (folder) this.showFolderDialog(folder);
          break;
        case 'add-current-chat':
          e.preventDefault();
          e.stopPropagation();
          await this.addCurrentChatToFolder(folderId);
          break;
        case 'clear-folder':
          e.preventDefault();
          e.stopPropagation();
          await this.clearFolderConversations(folderId);
          break;
        case 'move-conversation':
          this.showMoveConversationDialog(conversationId);
          break;
        case 'open-conversation':
          const url = e.target.dataset.url;
          if (url) window.location.href = url;
          break;
        case 'delete-conversation':
          const convToDelete = this.conversations.find(c => c.id === conversationId);
          if (convToDelete) {
            this.showDeleteConversationDialog(convToDelete);
          }
          break;
      }
    });

    // Toggle all button listener moved to setupToggleAllListener method

    container.dataset.listenersAttached = 'true';
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  injectConversationIndicators() {
    const conversationSelectors = [
      '[data-testid*="conversation"]',
      '[role="menuitem"]',
      'nav a[href*="/c/"]',
      'nav a[href*="chat.openai.com"]',
      'nav a[href*="chatgpt.com"]',
      '.conversation-item',
      '[class*="conversation"]',
      'nav li a',
      'nav ol li a'
    ];

    conversationSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => this.addIndicatorToConversation(element));
    });

    this.setupConversationObserver();
  }

  addIndicatorToConversation(conversationElement) {
    if (!conversationElement || conversationElement.querySelector('.cg-folder-indicator')) return;

    const href = conversationElement.getAttribute('href');
    if (!href) return;

    const conversationId = this.getConversationIdFromUrl(href);
    if (!conversationId) return;

    const conversation = this.conversations.find(c => c.id === conversationId);

    if (conversation) {
      const folder = this.folders.find(f => f.id === conversation.folderId);
      if (folder) {
        const indicator = document.createElement('span');
        indicator.className = 'cg-folder-indicator';
        indicator.innerHTML = folder.icon;
        indicator.style.cssText = `
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          font-size: 10px;
          background: ${folder.color};
          color: white;
          border-radius: 50%;
          margin-right: 6px;
          margin-left: 12px;
          border: 1px solid rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          flex-shrink: 0;
          position: relative;
          vertical-align: middle;
          z-index: 10;
        `;
        indicator.title = `In folder: ${folder.name} (click to manage)`;
        
        indicator.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showMoveConversationFromIndicator(conversation.id, indicator);
        });

        // Insert at the beginning of the conversation element for better alignment
        if (conversationElement.firstChild) {
          conversationElement.insertBefore(indicator, conversationElement.firstChild);
        } else {
          conversationElement.appendChild(indicator);
        }
        
        // Add hover effect but with consistent transform
        indicator.addEventListener('mouseenter', () => {
          indicator.style.transform = 'scale(1.15)';
          indicator.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
        });
        
        indicator.addEventListener('mouseleave', () => {
          indicator.style.transform = 'none';
          indicator.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        });
      }
    }
  }

  setupConversationObserver() {
    if (this.conversationObserver) this.conversationObserver.disconnect();

    this.conversationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.matches && (
              node.matches('[data-testid*="conversation"]') ||
              node.matches('[role="menuitem"]') ||
              node.matches('nav a[href*="/c/"]') ||
              node.querySelector('a[href*="/c/"]')
            )) {
              setTimeout(() => this.addIndicatorToConversation(node), 100);
            }

            const conversationElements = node.querySelectorAll && node.querySelectorAll([
              '[data-testid*="conversation"]',
              '[role="menuitem"]',
              'nav a[href*="/c/"]'
            ].join(','));

            if (conversationElements) {
              conversationElements.forEach(element => {
                setTimeout(() => this.addIndicatorToConversation(element), 100);
              });
            }
          }
        });
      });
    });

    this.conversationObserver.observe(document.body, { childList: true, subtree: true });
  }

  updateConversationIndicators() {
    document.querySelectorAll('.cg-folder-indicator').forEach(indicator => { indicator.remove(); });
    
    // Wait for ChatGPT layout to stabilize, especially after page refresh
    this.waitForStableLayout(() => {
      this.injectConversationIndicators();
      // Force immediate layout recalculation
      this.forceIndicatorAlignment();
    });
  }

  waitForStableLayout(callback) {
    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = 100;

    const checkStability = () => {
      const conversations = document.querySelectorAll('nav a[href*="/c/"], nav li a');
      const hasConversations = conversations.length > 0;
      
      // Check if conversations are properly rendered (have actual dimensions)
      const hasStableDimensions = Array.from(conversations).some(conv => 
        conv.offsetWidth > 0 && conv.offsetHeight > 0
      );

      if (hasConversations && hasStableDimensions) {
        // Wait one more frame to ensure complete stability
        requestAnimationFrame(() => {
          setTimeout(callback, 50);
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkStability, checkInterval);
      } else {
        // Fallback: proceed anyway
        callback();
      }
    };

    checkStability();
  }

  forceIndicatorAlignment() {
    requestAnimationFrame(() => {
      const indicators = document.querySelectorAll('.cg-folder-indicator');
      indicators.forEach(indicator => {
        // Force immediate reflow
        indicator.offsetHeight;
        
        // Trigger a micro-adjustment to force proper positioning
        const parent = indicator.parentElement;
        if (parent) {
          const computedStyle = window.getComputedStyle(parent);
          const currentDisplay = computedStyle.display;
          
          // Micro-toggle to force layout recalculation
          parent.style.display = 'none';
          parent.offsetHeight; // Force reflow
          parent.style.display = currentDisplay;
        }
      });
    });
  }

  refreshIndicators() {
    console.log('ChatGPT Gold: Manually refreshing folder indicators...');
    this.updateConversationIndicators();
  }

  async deleteConversation(conversationId) {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      this.parent.showToast('Conversation not found');
      return;
    }

    this.conversations = this.conversations.filter(c => c.id !== conversationId);
    await this.saveConversations();
    this.renderFolders();
    this.updateConversationIndicators();
    this.parent.showToast(`Conversation "${conversation.title}" deleted`);
  }

  showDeleteConversationDialog(conversation) {
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-delete-confirm-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Delete Conversation</h3>
          <button class="cg-modal-close" data-action="close-delete-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <div class="cg-delete-warning">
            <div class="cg-warning-icon">⚠️</div>
            <div class="cg-warning-content">
              <p class="cg-warning-title">Are you sure you want to delete this conversation?</p>
              <p class="cg-warning-description">
                <strong>"${conversation.title}"</strong><br>
                This will remove it from your ChatGPT Gold organization. The actual ChatGPT conversation will remain in your ChatGPT account.
              </p>
            </div>
          </div>
          <div class="cg-form-actions">
            <button type="button" class="cg-btn cg-btn-danger" data-action="confirm-delete">Remove from Organization</button>
            <button type="button" class="cg-btn cg-btn-secondary" data-action="close-delete-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm-delete') {
        try {
          await this.deleteConversation(conversation.id);
          modal.remove();
        } catch (error) {
          console.error('Failed to delete conversation:', error);
          this.parent.showToast('Failed to delete conversation');
        }
      } else if (action === 'close-delete-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });

    // Add Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    });

    setTimeout(() => { modal.querySelector('[data-action="close-delete-modal"]')?.focus(); }, 100);
  }

  showMoveConversationFromIndicator(conversationId, indicatorElement) {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'cg-indicator-dropdown';
    dropdown.innerHTML = `
      <div class="cg-indicator-dropdown-header">
        <strong>Manage Conversation</strong>
        <div class="cg-conversation-title">"${conversation.title.substring(0, 35)}${conversation.title.length > 35 ? '...' : ''}"</div>
      </div>
      <div class="cg-indicator-dropdown-section">
        <div class="cg-section-label">Move to folder:</div>
        <div class="cg-indicator-dropdown-options">
          <div class="cg-folder-option ${!conversation.folderId ? 'selected' : ''}" data-folder-id="" data-action="move">
            <span class="cg-folder-icon">📂</span>
            <span class="cg-folder-name">Uncategorized</span>
          </div>
          ${this.folders.map(folder => `
            <div class="cg-folder-option ${folder.id === conversation.folderId ? 'selected' : ''}" 
                 data-folder-id="${folder.id}" data-action="move">
              <span class="cg-folder-icon">${folder.icon}</span>
              <span class="cg-folder-name">${folder.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="cg-indicator-dropdown-section">
        <div class="cg-section-label">Actions:</div>
        <div class="cg-indicator-dropdown-actions">
          <div class="cg-action-option" data-action="remove">
            <span class="cg-action-icon">🗑️</span>
            <span class="cg-action-name">Remove from folder</span>
          </div>
          <div class="cg-action-option" data-action="open">
            <span class="cg-action-icon">🔗</span>
            <span class="cg-action-name">Open conversation</span>
          </div>
        </div>
      </div>
    `;

    const rect = indicatorElement.getBoundingClientRect();
    dropdown.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 5}px;
      left: ${rect.left}px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 250px;
      max-width: 300px;
      font-size: 14px;
      color: #374151;
    `;

    document.body.appendChild(dropdown);

    dropdown.addEventListener('click', async (e) => {
      const option = e.target.closest('.cg-folder-option');
      const action = e.target.closest('[data-action]');
      
      if (option && action?.dataset?.action === 'move') {
        const newFolderId = option.dataset?.folderId || null;
        try {
          await this.moveConversationToFolder(conversationId, newFolderId);
          dropdown.remove();
        } catch (error) {
          console.error('Failed to move conversation:', error);
          this.parent.showToast('Failed to move conversation');
        }
      } else if (action) {
        switch (action.dataset.action) {
          case 'remove':
            try {
              await this.moveConversationToFolder(conversationId, null);
              dropdown.remove();
            } catch (error) {
              console.error('Failed to remove conversation from folder:', error);
              this.parent.showToast('Failed to remove conversation from folder');
            }
            break;
          case 'open':
            if (conversation.url) {
              window.location.href = conversation.url;
              dropdown.remove();
            }
            break;
        }
      }
    });

    setTimeout(() => {
      const closeHandler = (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        return resolve(element);
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      if (timeout) {
        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element not found: ${selector}`));
        }, timeout);
      }
    });
  }

  // Sorting Methods
  setupSortEventListeners(container) {
    // Remove any existing sort listeners to avoid duplicates
    const existingSortDropdown = container.querySelector('#cg-sort-type-folders');
    const existingDirectionBtns = container.querySelectorAll('.cg-direction-btn');
    
    if (existingSortDropdown && existingSortDropdown._sortListener) {
      existingSortDropdown.removeEventListener('change', existingSortDropdown._sortListener);
    }
    
    existingDirectionBtns.forEach(btn => {
      if (btn._directionListener) {
        btn.removeEventListener('click', btn._directionListener);
      }
    });

    // Sort dropdown
    const sortDropdown = container.querySelector('#cg-sort-type-folders');
    if (sortDropdown) {
      const dropdownListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSortTypeChange(e.target.value);
      };
      sortDropdown._sortListener = dropdownListener;
      sortDropdown.addEventListener('change', dropdownListener);
    }

    // Direction buttons
    container.querySelectorAll('.cg-direction-btn').forEach(btn => {
      const directionListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleDirectionChange(btn.dataset.direction);
      };
      btn._directionListener = directionListener;
      btn.addEventListener('click', directionListener);
    });
  }

  setupToggleAllListener(container) {
    const toggleAllButton = container.querySelector('#cg-toggle-all-folders');
    if (toggleAllButton) {
      // Remove existing listener if any
      if (toggleAllButton._toggleListener) {
        toggleAllButton.removeEventListener('click', toggleAllButton._toggleListener);
      }
      
      const toggleListener = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.toggleAllFolders();
      };
      
      toggleAllButton._toggleListener = toggleListener;
      toggleAllButton.addEventListener('click', toggleListener);
    }
  }

  handleSortTypeChange(sortType) {
    if (this.sortState.currentSort !== sortType) {
      this.sortState.previousState = {
        currentSort: this.sortState.currentSort,
        direction: this.sortState.direction
      };
      this.sortState.currentSort = sortType;
      this.sortState.direction = 'asc';
      this.renderFolders();
    }
  }

  handleDirectionChange(direction) {
    if (this.sortState.direction !== direction) {
      this.sortState.direction = direction;
      this.renderFolders();
    }
  }

  handleSortChange(sortType) {
    if (this.sortState.currentSort !== sortType) {
      this.sortState.previousState = {
        currentSort: this.sortState.currentSort,
        direction: this.sortState.direction
      };
      this.sortState.currentSort = sortType;
      this.sortState.direction = 'asc';
    } else {
      this.toggleSortDirection();
    }
    this.renderFolders();
  }

  toggleSortDirection() {
    this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    this.renderFolders();
  }

  async saveSortState() {
    // Convert current sort to permanent order
    if (this.sortState.currentSort === 'name' || this.sortState.currentSort === 'date') {
      // Save folder order
      const sortedFolders = this.getSortedFolders();
      this.folders = [...sortedFolders];
      
      // Save conversation order for each folder (including uncategorized)
      const folderIds = [null, ...this.folders.map(f => f.id)]; // null for uncategorized
      
      folderIds.forEach(folderId => {
        const sortedConversations = this.getSortedConversations(folderId);
        sortedConversations.forEach((conv, index) => {
          conv.order = (index + 1) * 1000; // Large gaps for future insertions
        });
      });
      
      await Promise.all([this.saveFolders(), this.saveConversations()]);
      
      this.sortState.currentSort = 'custom';
      this.sortState.previousState = null;
      this.renderFolders();
      this.parent.showToast('Sort order saved permanently');
    }
  }

  undoSort() {
    if (this.sortState.previousState) {
      this.sortState.currentSort = this.sortState.previousState.currentSort;
      this.sortState.direction = this.sortState.previousState.direction;
      this.sortState.previousState = null;
      this.renderFolders();
      this.parent.showToast('Sort undone');
    }
  }

  getSortedFolders() {
    let sortedFolders = [...this.folders];
    
    if (this.sortState.currentSort === 'name') {
      sortedFolders.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        return this.sortState.direction === 'asc' ? 
          aName.localeCompare(bName) : 
          bName.localeCompare(aName);
      });
    } else if (this.sortState.currentSort === 'date') {
      sortedFolders.sort((a, b) => {
        return this.sortState.direction === 'asc' ? 
          a.updatedAt - b.updatedAt : 
          b.updatedAt - a.updatedAt;
      });
    }
    
    return sortedFolders;
  }

  getSortedConversations(folderId) {
    let conversations;
    if (folderId === null) {
      // Get uncategorized conversations
      conversations = [...this.conversations.filter(conv => !conv.folderId)];
    } else {
      conversations = [...this.getConversationsForFolder(folderId)];
    }
    
    if (this.sortState.currentSort === 'name') {
      conversations.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        return this.sortState.direction === 'asc' ? 
          aTitle.localeCompare(bTitle) : 
          bTitle.localeCompare(aTitle);
      });
    } else if (this.sortState.currentSort === 'date') {
      conversations.sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.updatedAt || b.createdAt || 0);
        return this.sortState.direction === 'asc' ? 
          aDate - bDate : 
          bDate - aDate;
      });
    } else if (this.sortState.currentSort === 'custom') {
      // For custom order, sort by the order property, fallback to creation order
      conversations.sort((a, b) => {
        const aOrder = a.order !== undefined ? a.order : (a.createdAt || 0);
        const bOrder = b.order !== undefined ? b.order : (b.createdAt || 0);
        return aOrder - bOrder;
      });
    }
    
    return conversations;
  }

  showSaveViewDialog() {
    const modal = document.createElement('div');
    modal.className = 'cg-modal cg-save-view-modal';
    modal.innerHTML = `
      <div class="cg-modal-backdrop"></div>
      <div class="cg-modal-content">
        <div class="cg-modal-header">
          <h3 class="cg-modal-title">Save View</h3>
          <button class="cg-modal-close" data-action="close-save-view-modal">×</button>
        </div>
        <div class="cg-modal-body">
          <form id="cg-save-view-form">
            <div class="cg-form-group">
              <label class="cg-form-label">View Name *</label>
              <input type="text" class="cg-form-input" name="name" placeholder="Enter view name..." required>
            </div>
            <div class="cg-form-group">
              <label class="cg-form-label">Current Settings:</label>
              <div class="cg-view-preview">
                <p><strong>Sort:</strong> ${this.sortState.currentSort} (${this.sortState.direction})</p>
                <p><strong>Folders:</strong> ${this.folders.length} items</p>
                <p><strong>Conversations:</strong> ${this.conversations.length} items</p>
              </div>
            </div>
            <div class="cg-form-actions">
              <button type="submit" class="cg-btn cg-btn-primary">Save View</button>
              <button type="button" class="cg-btn cg-btn-secondary" data-action="close-save-view-modal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector('#cg-save-view-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const viewName = formData.get('name');
      
      if (viewName) {
        await this.saveView(viewName);
        modal.remove();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-save-view-modal' || e.target.classList.contains('cg-modal-backdrop')) {
        modal.remove();
      }
    });

    setTimeout(() => { modal.querySelector('input[name="name"]')?.focus(); }, 100);
  }

  async saveView(name) {
    const view = {
      id: 'view_' + Date.now(),
      name: name,
      sortState: { ...this.sortState },
      folderOrder: this.folders.map(f => f.id),
      createdAt: Date.now()
    };

    this.savedViews.push(view);
    // Note: In a real implementation, you'd save this to chrome.storage
    // await this.saveSavedViews();
    
    this.parent.showToast(`View "${name}" saved successfully`);
  }

  // Drag and Drop Event Handlers
  handleDragStart(e) {
    const dragHandle = e.target.closest('.cg-drag-handle, .cg-conversation-drag-handle');
    if (!dragHandle) return;

    e.stopPropagation();
    
    const action = dragHandle.dataset.action;
    const isDragFolder = action === 'drag-folder';
    const isDragConversation = action === 'drag-conversation';
    
    if (!isDragFolder && !isDragConversation) return;

    this.dragState.isDragging = true;
    
    if (isDragFolder) {
      const folderId = dragHandle.dataset?.folderId;
      const folderIndex = parseInt(dragHandle.dataset?.folderIndex || '0');
      this.dragState.draggedElement = document.querySelector(`[data-folder-id="${folderId}"]`);
      this.dragState.draggedIndex = folderIndex;
      this.dragState.dragType = 'folder';
      this.dragState.draggedId = folderId;
      
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'folder',
        id: folderId,
        index: folderIndex
      }));
    } else if (isDragConversation) {
      const conversationId = dragHandle.dataset.conversationId;
      const conversationIndex = parseInt(dragHandle.dataset.conversationIndex);
      this.dragState.draggedElement = document.querySelector(`[data-conversation-id="${conversationId}"]`);
      this.dragState.draggedIndex = conversationIndex;
      this.dragState.dragType = 'conversation';
      this.dragState.draggedId = conversationId;
      
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'conversation',
        id: conversationId,
        index: conversationIndex
      }));
    }

    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image that follows the cursor
    const dragImage = this.dragState.draggedElement.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '-1000px';
    dragImage.style.zIndex = '9999';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
    document.body.appendChild(dragImage);
    
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    
    // Add visual feedback to original element
    if (this.dragState.draggedElement) {
      this.dragState.draggedElement.style.opacity = '0.3';
      this.dragState.draggedElement.classList.add('cg-dragging');
    }
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      if (dragImage && dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage);
      }
    }, 100);
  }

  handleDragOver(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = this.getDropTarget(e);
    if (target && target !== this.dragState.dropTarget) {
      this.clearDropTargetHighlight();
      this.dragState.dropTarget = target;
      this.highlightDropTarget(target);
    }
  }

  handleDragEnter(e) {
    if (!this.dragState.isDragging) return;
    e.preventDefault();
  }

  handleDragLeave(e) {
    if (!this.dragState.isDragging) return;
    
    // Only clear highlight if we're actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.clearDropTargetHighlight();
      this.dragState.dropTarget = null;
    }
  }

  handleDrop(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const dropTarget = this.getDropTarget(e);
      
      if (dropTarget && dragData) {
        this.performDrop(dragData, dropTarget, e);
      }
    } catch (error) {
      console.error('ChatGPT Gold: Error handling drop:', error);
    }
    
    this.resetDragState();
  }

  handleDragEnd(e) {
    this.resetDragState();
  }

  getDropTarget(e) {
    const target = e.target;
    
    if (this.dragState.dragType === 'folder') {
      // For folder reordering, find the folder item we're hovering over
      const folderItem = target.closest('.cg-folder-item');
      if (folderItem && folderItem !== this.dragState.draggedElement) {
        return folderItem;
      }
    } else if (this.dragState.dragType === 'conversation') {
      // For conversation reordering, prioritize conversation items first
      const conversationItem = target.closest('.cg-conversation-item');
      
      // Only accept conversations that are different from the dragged one
      if (conversationItem && conversationItem !== this.dragState.draggedElement) {
        return conversationItem;
      }
      
      // If not over a conversation, check if we're over a folder (for moving between folders)
      const folderItem = target.closest('.cg-folder-item');
      const folderConversations = folderItem ? folderItem.querySelector('.cg-folder-conversations') : null;
      
      // Only return folder if we're specifically over the conversations area and not over another conversation
      if (folderItem && folderConversations && folderConversations.contains(target)) {
        return folderItem;
      }
    }
    
    return null;
  }

  highlightDropTarget(target) {
    if (target) {
      target.classList.add('cg-drop-target');
    }
  }

  clearDropTargetHighlight() {
    document.querySelectorAll('.cg-drop-target').forEach(el => {
      el.classList.remove('cg-drop-target');
    });
  }

  async performDrop(dragData, dropTarget, e) {
    if (dragData.type === 'folder') {
      await this.reorderFolder(dragData, dropTarget);
    } else if (dragData.type === 'conversation') {
      await this.reorderConversation(dragData, dropTarget, e);
    }
  }

  async reorderFolder(dragData, dropTarget) {
    const draggedFolderId = dragData.id;
    const targetFolderId = dropTarget.dataset?.folderId;
    
    if (draggedFolderId === targetFolderId) return;
    
    const draggedIndex = this.folders.findIndex(f => f.id === draggedFolderId);
    const targetIndex = this.folders.findIndex(f => f.id === targetFolderId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Reorder folders array
    const draggedFolder = this.folders.splice(draggedIndex, 1)[0];
    this.folders.splice(targetIndex, 0, draggedFolder);
    
    // Save and re-render
    await this.saveFolders();
    this.renderFolders();
    this.parent.showToast('Folders reordered successfully');
  }

  async reorderConversation(dragData, dropTarget, e) {
    const draggedConversationId = dragData.id;
    const draggedConversation = this.conversations.find(c => c.id === draggedConversationId);
    
    if (!draggedConversation) return;
    
    if (dropTarget.classList.contains('cg-folder-item')) {
      // Moving to a different folder
      const targetFolderId = dropTarget.dataset?.folderId || null;
      await this.moveConversationToFolder(draggedConversationId, targetFolderId);
    } else if (dropTarget.classList.contains('cg-conversation-item')) {
      // Reordering within the same folder
      const targetConversationId = dropTarget.dataset.conversationId;
      const targetConversation = this.conversations.find(c => c.id === targetConversationId);
      
      if (targetConversation && draggedConversation.folderId === targetConversation.folderId) {
        // Get all conversations in this folder and sort by current order
        const folderConversations = this.conversations
          .filter(c => c.folderId === draggedConversation.folderId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Initialize order if needed
        if (folderConversations.some(c => c.order === undefined)) {
          folderConversations.forEach((conv, index) => {
            conv.order = (index + 1) * 1000; // Large gaps
          });
        }
        
        // Find current positions after sorting
        const currentDraggedIndex = folderConversations.findIndex(c => c.id === draggedConversationId);
        const currentTargetIndex = folderConversations.findIndex(c => c.id === targetConversationId);
        
        if (currentDraggedIndex !== -1 && currentTargetIndex !== -1 && currentDraggedIndex !== currentTargetIndex) {
          // Remove dragged item from array
          const [movedItem] = folderConversations.splice(currentDraggedIndex, 1);
          
          // Insert at target position
          folderConversations.splice(currentTargetIndex, 0, movedItem);
          
          // Reassign order values
          folderConversations.forEach((conv, index) => {
            conv.order = (index + 1) * 1000;
          });
          
          await this.saveConversations();
          this.renderFolders();
          this.parent.showToast('Conversation moved successfully');
        }
      }
    }
  }

  resetDragState() {
    if (this.dragState.draggedElement) {
      this.dragState.draggedElement.style.opacity = '';
      this.dragState.draggedElement.style.transform = '';
      this.dragState.draggedElement.classList.remove('cg-dragging');
    }
    
    this.clearDropTargetHighlight();
    
    // Clean up any remaining drag images
    document.querySelectorAll('*[style*="position: absolute"][style*="top: -1000px"]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      draggedIndex: null,
      dropTarget: null,
      dragType: null,
      draggedId: null
    };
  }

  // Emoji Data and Picker Methods (shared with PromptManager)
  getEmojiData() {
    return {
      'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
      'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦣', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦔', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦫'],
      'Food & Drink': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯'],
      'Activity': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼', '🤸‍♀️', '🤸', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾', '🏌️‍♀️', '🏌️', '🧘‍♀️', '🧘', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🪘', '🥁', '🪗', '🎷', '🎺', '🪕', '🎸', '🪈', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎯', '🎳'],
      'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🎢', '🎡', '🎠', '🎪', '🚢', '🛥️', '🚤', '⛵', '🛶', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋'],
      'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧴', '🧷', '🧸', '🧵', '🧶', '🪡', '🪢', '🧽', '🪣', '🧼', '🪥', '🪒', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛏️', '🛋️', '🪞', '🪟', '🚽', '🚿', '🛁', '🪣', '🧴', '🧼', '🧽', '🧹', '🧺', '🧻'],
      'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    };
  }

  createEmojiPicker(selectedEmoji = '📁') {
    const picker = document.createElement('div');
    picker.className = 'cg-emoji-picker';
    
    picker.innerHTML = `
      <button type="button" class="cg-emoji-button" data-selected-emoji="${selectedEmoji}">
        ${selectedEmoji}
      </button>
      <div class="cg-emoji-dropdown">
        <input type="text" class="cg-emoji-search" placeholder="Search emojis..." />
        <div class="cg-emoji-categories">
          <button type="button" class="cg-emoji-category-btn active" data-category="Smileys & People">😀</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Animals & Nature">🐶</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Food & Drink">🍎</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Activity">⚽</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Travel & Places">🚗</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Objects">⌚</button>
          <button type="button" class="cg-emoji-category-btn" data-category="Symbols">❤️</button>
        </div>
        <div class="cg-emoji-grid"></div>
      </div>
    `;

    this.setupEmojiPickerEvents(picker);
    return picker;
  }

  setupEmojiPickerEvents(picker) {
    const button = picker.querySelector('.cg-emoji-button');
    const dropdown = picker.querySelector('.cg-emoji-dropdown');
    const searchInput = picker.querySelector('.cg-emoji-search');
    const categoryBtns = picker.querySelectorAll('.cg-emoji-category-btn');
    const grid = picker.querySelector('.cg-emoji-grid');

    let currentCategory = 'Smileys & People';
    let isOpen = false;

    // Toggle dropdown
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen = !isOpen;
      dropdown.classList.toggle('show', isOpen);
      
      if (isOpen) {
        this.renderEmojiGrid(grid, currentCategory);
        searchInput.focus();
        // Close other open pickers
        document.querySelectorAll('.cg-emoji-dropdown.show').forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('show');
          }
        });
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!picker.contains(e.target)) {
        dropdown.classList.remove('show');
        isOpen = false;
      }
    });

    // Category switching
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        this.renderEmojiGrid(grid, currentCategory);
      });
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query) {
        this.renderEmojiSearch(grid, query);
      } else {
        this.renderEmojiGrid(grid, currentCategory);
      }
    });

    // Emoji selection
    grid.addEventListener('click', (e) => {
      if (e.target.classList.contains('cg-emoji-item')) {
        const selectedEmoji = e.target.textContent;
        button.textContent = selectedEmoji;
        button.dataset.selectedEmoji = selectedEmoji;
        dropdown.classList.remove('show');
        isOpen = false;
        
        // Dispatch custom event for emoji selection
        picker.dispatchEvent(new CustomEvent('emoji-selected', {
          detail: { emoji: selectedEmoji }
        }));
      }
    });
  }

  renderEmojiGrid(grid, category) {
    const emojis = this.emojiData[category] || [];
    grid.innerHTML = emojis.map(emoji => 
      `<button type="button" class="cg-emoji-item">${emoji}</button>`
    ).join('');
  }

  renderEmojiSearch(grid, query) {
    const allEmojis = [];
    Object.values(this.emojiData).forEach(categoryEmojis => {
      allEmojis.push(...categoryEmojis);
    });

    // Simple search with common terms
    const filteredEmojis = allEmojis.filter(emoji => {
      const commonTerms = {
        'happy': ['😀', '😃', '😄', '😁', '😊', '🙂', '😎'],
        'sad': ['😔', '😞', '😢', '😭', '😟'],
        'love': ['❤️', '💕', '💖', '💗', '💝', '😍', '🥰'],
        'fire': ['🔥'],
        'star': ['⭐', '🌟', '✨', '🌠'],
        'heart': ['❤️', '💕', '💖', '💗', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎'],
        'work': ['💻', '⚙️', '🔧', '🔨', '📊', '📈', '📋'],
        'money': ['💰', '💵', '💸', '🤑'],
        'food': ['🍕', '🍔', '🍟', '🍎', '🥑', '🍇', '🍓'],
        'animal': ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼'],
        'folder': ['📁', '📂', '🗂️', '🗃️', '📋', '📄', '📑']
      };
      
      if (commonTerms[query]) {
        return commonTerms[query].includes(emoji);
      }
      
      return allEmojis.includes(emoji);
    });

    grid.innerHTML = (filteredEmojis.length > 0 ? filteredEmojis : allEmojis)
      .slice(0, 64) // Limit results
      .map(emoji => `<button type="button" class="cg-emoji-item">${emoji}</button>`)
      .join('');
  }

  getSelectedEmoji(picker) {
    const button = picker.querySelector('.cg-emoji-button');
    return button.dataset.selectedEmoji || button.textContent;
  }
}

window.FolderManager = FolderManager;
