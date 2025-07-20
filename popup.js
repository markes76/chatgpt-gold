// ChatGPT Gold - Popup Script

class PopupDashboard {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadStatistics();
    this.setupEventListeners();
    this.updateUsageInfo();
  }

  async loadStatistics() {
    try {
      // Get data from Chrome storage
      const result = await chrome.storage.local.get([
        'chatgpt_gold_folders',
        'chatgpt_gold_conversations', 
        'chatgpt_gold_prompts',
        'chatgpt_gold_install_date'
      ]);

      // Calculate statistics
      const folders = result.chatgpt_gold_folders || [];
      const conversations = result.chatgpt_gold_conversations || [];
      const prompts = result.chatgpt_gold_prompts || [];

      // Update UI
      this.updateStat('folders-count', folders.length);
      this.updateStat('conversations-count', conversations.length);
      this.updateStat('prompts-count', prompts.length);

      // Calculate days active
      const installDate = result.chatgpt_gold_install_date || Date.now();
      const daysActive = Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
      this.updateStat('days-active', Math.max(1, daysActive));

    } catch (error) {
      console.error('Failed to load statistics:', error);
      // Show error state
      document.querySelectorAll('.stat-number').forEach(el => {
        el.textContent = '?';
      });
    }
  }

  updateStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      // Add loading state
      element.classList.add('loading');
      
      // Simulate loading delay for smooth UX
      setTimeout(() => {
        element.classList.remove('loading');
        element.textContent = value;
      }, 200 + Math.random() * 300);
    }
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('open-settings')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Advanced Search button  
    document.getElementById('open-search')?.addEventListener('click', () => {
      this.openAdvancedSearch();
    });

    // Export data button
    document.getElementById('export-data')?.addEventListener('click', () => {
      this.exportAllData();
    });

    // Import data button
    document.getElementById('import-data')?.addEventListener('click', () => {
      this.importData();
    });

  }

  async openAdvancedSearch() {
    // Inject search overlay into ChatGPT page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com'))) {
      // Inject search overlay into current ChatGPT tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Trigger Cmd+K if not already active
          if (!document.querySelector('[data-headlessui-state="open"]')) {
            // Simulate Cmd+K to open ChatGPT's search
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: true,
              bubbles: true
            }));
          }
          
          // Trigger enhanced search mode
          window.postMessage({ type: 'CHATGPT_GOLD_ENABLE_SEARCH' }, '*');
        }
      });
      
      // Close popup
      window.close();
    } else {
      // If not on ChatGPT, open in new tab
      chrome.tabs.create({ url: 'https://chat.openai.com' });
      window.close();
    }
  }

  async exportAllData() {
    try {
      const result = await chrome.storage.local.get([
        'chatgpt_gold_folders',
        'chatgpt_gold_conversations',
        'chatgpt_gold_prompts'
      ]);

      const exportData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        ...result
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: `chatgpt-gold-export-${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
      });

      this.showToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed. Please try again.');
    }
  }

  importData() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validate data structure
        if (!data.version) {
          throw new Error('Invalid backup file');
        }

        // Import data
        await chrome.storage.local.set({
          chatgpt_gold_folders: data.chatgpt_gold_folders || [],
          chatgpt_gold_conversations: data.chatgpt_gold_conversations || [],
          chatgpt_gold_prompts: data.chatgpt_gold_prompts || []
        });

        this.showToast('Data imported successfully!');
        await this.loadStatistics(); // Refresh stats

      } catch (error) {
        console.error('Import failed:', error);
        this.showToast('Import failed. Please check the file format.');
      }
    };
    
    input.click();
  }

  showOnboarding() {
    // Open onboarding in a new popup window
    chrome.windows.create({
      url: chrome.runtime.getURL('onboarding.html'),
      type: 'popup',
      width: 900,
      height: 700,
      focused: true
    });
  }

  updateUsageInfo() {
    // This will be populated by loadStatistics
    // Just ensuring the elements exist
    const usageText = document.getElementById('usage-text');
    if (usageText) {
      usageText.innerHTML = 'Active for <strong id="days-active">-</strong> days';
    }
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--popup-primary);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupDashboard();
});

// Store install date if not set
chrome.storage.local.get(['chatgpt_gold_install_date'], (result) => {
  if (!result.chatgpt_gold_install_date) {
    chrome.storage.local.set({
      chatgpt_gold_install_date: Date.now()
    });
  }
});
