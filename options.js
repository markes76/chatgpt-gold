/**
 * ChatGPT Gold - Settings Page
 * Comprehensive settings management with theme customization
 */

class SettingsManager {
  constructor() {
    this.settings = {};
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    this.defaultSettings = {
      theme: 'auto',
      primaryColor: '#10a37f',
      extensionTitle: 'ChatGPT Gold',
      sidebarDefaultOpen: true,
      sidebarWidth: 350,
      fontFamily: 'system',
      fontSize: 14,
      autoSaveConversations: false,
      defaultFolder: '',
      searchContent: true,
      searchPrompts: true,
      showNotifications: true,
      notificationDuration: 3,
      enableShortcuts: true,
      autoBackup: false,
      optimizePerformance: true,
      maxConversations: 1000,
      debugMode: false
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.populateFolders();
    this.applySettings();
    this.updateShortcutsForPlatform();
    console.log('Settings Manager initialized');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['chatgpt_gold_settings']);
      this.settings = { ...this.defaultSettings, ...(result.chatgpt_gold_settings || {}) };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ chatgpt_gold_settings: this.settings });
      this.showSaveIndicator();
      
      // Apply CSS variables immediately
      this.applyCSSVariables();
      
      // Send settings to all ChatGPT tabs
      this.updateExtensionTheme();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }


  setupEventListeners() {
    // Theme selection
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.settings.theme = radio.value;
        this.saveSettings();
        this.applyTheme();
      });
    });

    // Color selection
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.primaryColor = btn.dataset.color;
        this.saveSettings();
      });
    });

    // Custom color picker
    document.getElementById('custom-color')?.addEventListener('change', (e) => {
      document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      this.settings.primaryColor = e.target.value;
      this.saveSettings();
    });

    // Checkbox settings
    this.setupCheckboxSetting('sidebar-default-open', 'sidebarDefaultOpen');
    this.setupCheckboxSetting('auto-save-conversations', 'autoSaveConversations');
    this.setupCheckboxSetting('search-content', 'searchContent');
    this.setupCheckboxSetting('search-prompts', 'searchPrompts');
    this.setupCheckboxSetting('show-notifications', 'showNotifications');
    this.setupCheckboxSetting('enable-shortcuts', 'enableShortcuts');
    this.setupCheckboxSetting('auto-backup', 'autoBackup');
    this.setupCheckboxSetting('optimize-performance', 'optimizePerformance');
    this.setupCheckboxSetting('debug-mode', 'debugMode');

    // Range sliders
    this.setupSliderSetting('sidebar-width', 'sidebarWidth', 'px');
    this.setupSliderSetting('font-size', 'fontSize', 'px');
    this.setupSliderSetting('notification-duration', 'notificationDuration', ' seconds');
    this.setupSliderSetting('max-conversations', 'maxConversations', '');

    // Select settings
    this.setupSelectSetting('font-family', 'fontFamily');
    this.setupSelectSetting('default-folder', 'defaultFolder');

    // Text input settings
    this.setupTextSetting('extension-title', 'extensionTitle');

    // Action buttons
    
    // ZIP export/import
    document.getElementById('export-zip')?.addEventListener('click', () => this.exportZip());
    document.getElementById('import-zip')?.addEventListener('click', () => this.importZip());
    
    // Granular export/import
    document.getElementById('export-prompts-only')?.addEventListener('click', () => this.exportPromptsOnly());
    document.getElementById('import-prompts-only')?.addEventListener('click', () => this.importPromptsOnly());
    document.getElementById('export-folders-only')?.addEventListener('click', () => this.exportFoldersOnly());
    document.getElementById('import-folders-only')?.addEventListener('click', () => this.importFoldersOnly());
    document.getElementById('export-settings-only')?.addEventListener('click', () => this.exportSettingsOnly());
    document.getElementById('import-settings-only')?.addEventListener('click', () => this.importSettingsOnly());
    
    document.getElementById('clear-all-data')?.addEventListener('click', () => this.clearAllData());
    document.getElementById('reset-settings')?.addEventListener('click', () => this.resetSettings());
    document.getElementById('show-changelog')?.addEventListener('click', () => this.showChangelog());
    document.getElementById('back-to-chatgpt')?.addEventListener('click', () => this.backToChatGPT());
  }

  setupCheckboxSetting(elementId, settingKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.checked = this.settings[settingKey];
    element.addEventListener('change', () => {
      this.settings[settingKey] = element.checked;
      this.saveSettings();
    });
  }

  setupSliderSetting(elementId, settingKey, unit = '') {
    const slider = document.getElementById(elementId);
    const valueDisplay = slider?.parentElement.querySelector('.slider-value');
    
    if (!slider || !valueDisplay) return;

    slider.value = this.settings[settingKey];
    valueDisplay.textContent = this.settings[settingKey] + unit;

    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      valueDisplay.textContent = value + unit;
      this.settings[settingKey] = value;
      this.saveSettings();
    });
  }

  setupSelectSetting(elementId, settingKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.value = this.settings[settingKey];
    element.addEventListener('change', () => {
      this.settings[settingKey] = element.value;
      this.saveSettings();
    });
  }

  setupTextSetting(elementId, settingKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.value = this.settings[settingKey];
    element.addEventListener('input', () => {
      this.settings[settingKey] = element.value;
      this.saveSettings();
    });
  }

  async updateExtensionTheme() {
    try {
      // Query all ChatGPT tabs
      const tabs = await chrome.tabs.query({ url: ['*://chatgpt.com/*', '*://*.chatgpt.com/*'] });
      
      // Send theme update message to each tab
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CHATGPT_GOLD_UPDATE_THEME',
          settings: this.settings
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script
        });
      });
    } catch (error) {
      console.error('Failed to update extension theme:', error);
    }
  }

  async populateFolders() {
    try {
      const result = await chrome.storage.local.get(['chatgpt_gold_folders']);
      const folders = result.chatgpt_gold_folders || [];
      
      const select = document.getElementById('default-folder');
      if (!select) return;

      // Clear existing options except the first one
      while (select.children.length > 1) {
        select.removeChild(select.lastChild);
      }

      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `${folder.icon} ${folder.name}`;
        select.appendChild(option);
      });

      select.value = this.settings.defaultFolder;
    } catch (error) {
      console.error('Failed to populate folders:', error);
    }
  }

  applySettings() {
    // Apply theme
    document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`).checked = true;
    this.applyTheme();

    // Apply color
    const colorBtn = document.querySelector(`[data-color="${this.settings.primaryColor}"]`);
    if (colorBtn) {
      document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      colorBtn.classList.add('active');
    } else {
      // Custom color
      document.getElementById('custom-color').value = this.settings.primaryColor;
    }

    this.applyCSSVariables();
  }

  applyTheme() {
    const theme = this.settings.theme;
    
    if (theme === 'auto') {
      // Remove any forced theme classes
      document.documentElement.classList.remove('force-light', 'force-dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('force-dark');
      document.documentElement.classList.add('force-light');
    } else if (theme === 'dark') {
      document.documentElement.classList.remove('force-light');
      document.documentElement.classList.add('force-dark');
    }
  }

  applyCSSVariables() {
    const root = document.documentElement;
    
    // Primary color
    root.style.setProperty('--settings-primary', this.settings.primaryColor);
    
    // Calculate hover color (slightly darker)
    const hoverColor = this.adjustColorBrightness(this.settings.primaryColor, -20);
    root.style.setProperty('--settings-primary-hover', hoverColor);

    // Font family
    if (this.settings.fontFamily !== 'system') {
      const fontMap = {
        'inter': 'Inter, sans-serif',
        'roboto': 'Roboto, sans-serif',
        'open-sans': 'Open Sans, sans-serif',
        'lato': 'Lato, sans-serif'
      };
      root.style.setProperty('--settings-font-family', fontMap[this.settings.fontFamily] || 'inherit');
    }

    // Sidebar width (for future use)
    root.style.setProperty('--settings-sidebar-width', this.settings.sidebarWidth + 'px');
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

  updateShortcutsForPlatform() {
    const cmdKey = this.isMac ? 'Cmd' : 'Ctrl';
    
    // Update all keyboard shortcut displays
    document.querySelectorAll('.shortcut-keys').forEach(shortcutDiv => {
      const kbdElements = shortcutDiv.querySelectorAll('kbd');
      kbdElements.forEach(kbd => {
        if (kbd.textContent === 'Ctrl' && this.isMac) {
          kbd.textContent = 'Cmd';
        } else if (kbd.textContent === 'Cmd' && !this.isMac) {
          kbd.textContent = 'Ctrl';
        }
      });
    });
  }


  // ZIP Export/Import Functions
  async exportZip() {
    try {
      // Get all data
      const result = await chrome.storage.local.get([
        'chatgpt_gold_folders',
        'chatgpt_gold_conversations',
        'chatgpt_gold_prompts',
        'chatgpt_gold_settings'
      ]);

      // Create individual JSON files
      const files = {
        'prompts.json': JSON.stringify(result.chatgpt_gold_prompts || [], null, 2),
        'folders.json': JSON.stringify(result.chatgpt_gold_folders || [], null, 2),
        'conversations.json': JSON.stringify(result.chatgpt_gold_conversations || [], null, 2),
        'settings.json': JSON.stringify(this.settings, null, 2),
        'metadata.json': JSON.stringify({
          version: '2.0.9',
          timestamp: new Date().toISOString(),
          description: 'ChatGPT Gold Complete Backup'
        }, null, 2)
      };

      // Create ZIP content manually (simple ZIP format)
      const bundleContent = await this.createSimpleZip(files);
      
      const blob = new Blob([bundleContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-gold-complete-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Complete backup exported successfully!');
    } catch (error) {
      console.error('ZIP export failed:', error);
      this.showToast('ZIP export failed. Please try again.', 'error');
    }
  }

  importZip() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.zip';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (error) {
          this.showToast('Invalid file format. Please select a valid ChatGPT Gold backup file.', 'error');
          return;
        }
        
        // Check if it's our complete backup format
        if (data.type === 'chatgpt_gold_complete_backup' && data.files) {
          await this.importCompleteBackup(data.files);
          this.showToast('Complete backup imported successfully!', 'success');
        } else if (data.type === 'complete' || (data.prompts && data.folders && data.conversations && data.settings)) {
          // Legacy complete backup format - convert to individual imports
          if (data.chatgpt_gold_prompts) {
            await chrome.storage.local.set({ chatgpt_gold_prompts: data.chatgpt_gold_prompts });
          }
          if (data.chatgpt_gold_folders) {
            await chrome.storage.local.set({ chatgpt_gold_folders: data.chatgpt_gold_folders });
          }
          if (data.chatgpt_gold_conversations) {
            await chrome.storage.local.set({ chatgpt_gold_conversations: data.chatgpt_gold_conversations });
          }
          if (data.chatgpt_gold_settings || data.settings) {
            await chrome.storage.local.set({ chatgpt_gold_settings: data.chatgpt_gold_settings || data.settings });
            await this.loadSettings();
            this.applySettings();
          }
          this.showToast('Legacy backup imported successfully!', 'success');
        } else {
          this.showZipImportInstructions();
        }
      } catch (error) {
        console.error('Import failed:', error);
        this.showToast('Import failed. Please check the file format.', 'error');
      }
    };
    
    input.click();
  }

  showZipImportInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
      <div style="
        background: var(--settings-bg);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: var(--settings-shadow-lg);
        border: 1px solid var(--settings-border);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="
            width: 64px;
            height: 64px;
            background: #dbeafe;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 32px;
          ">📦</div>
          <h3 style="
            margin: 0 0 8px;
            color: var(--settings-text);
            font-size: 20px;
            font-weight: 600;
          ">Complete Backup Import Instructions</h3>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="color: var(--settings-text-secondary); margin-bottom: 16px;">
            The file you selected appears to be in an older format. To import your backup:
          </p>
          <ol style="color: var(--settings-text-secondary); padding-left: 20px; line-height: 1.6;">
            <li>Extract the ZIP file on your computer</li>
            <li>Use the granular import options below to import each file:
              <ul style="margin-top: 8px; padding-left: 20px;">
                <li><strong>prompts.json</strong> → Import Prompts</li>
                <li><strong>folders.json + conversations.json</strong> → Import Folders</li>
                <li><strong>settings.json</strong> → Import Settings</li>
              </ul>
            </li>
            <li>Alternatively, combine all data into one JSON and use "Import All Data"</li>
          </ol>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            padding: 10px 20px;
            background: var(--settings-primary);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
          ">Got it</button>
        </div>
      </div>
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
  }

  // Create proper ZIP file using JSZip-like implementation
  async createSimpleZip(files) {
    // Since we can't include external libraries, we'll create a proper JSON bundle
    // formatted for easy import, but save it as a .json file instead of .zip
    const zipBundle = {
      type: 'chatgpt_gold_complete_backup',
      version: '3.0.4',
      timestamp: new Date().toISOString(),
      files: files
    };
    
    return JSON.stringify(zipBundle, null, 2);
  }

  async importCompleteBackup(files) {
    try {
      // Import each file type
      if (files['prompts.json']) {
        const promptsData = JSON.parse(files['prompts.json']);
        await chrome.storage.local.set({ chatgpt_gold_prompts: promptsData });
      }
      
      if (files['folders.json']) {
        const foldersData = JSON.parse(files['folders.json']);
        await chrome.storage.local.set({ chatgpt_gold_folders: foldersData });
      }
      
      if (files['conversations.json']) {
        const conversationsData = JSON.parse(files['conversations.json']);
        await chrome.storage.local.set({ chatgpt_gold_conversations: conversationsData });
      }
      
      if (files['settings.json']) {
        const settingsData = JSON.parse(files['settings.json']);
        await chrome.storage.local.set({ chatgpt_gold_settings: settingsData });
        // Reload settings
        await this.loadSettings();
        this.applySettings();
      }
      
      if (files['metadata.json']) {
        const metadataData = JSON.parse(files['metadata.json']);
        await chrome.storage.local.set({ chatgpt_gold_metadata: metadataData });
      }
    } catch (error) {
      console.error('Failed to import complete backup:', error);
      throw error;
    }
  }

  // Granular Export/Import Functions
  async exportPromptsOnly() {
    try {
      const result = await chrome.storage.local.get(['chatgpt_gold_prompts']);
      const prompts = result.chatgpt_gold_prompts || [];
      
      const exportData = {
        type: 'prompts',
        version: '2.0.9',
        timestamp: new Date().toISOString(),
        data: prompts
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-gold-prompts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Prompts exported successfully!');
    } catch (error) {
      console.error('Prompts export failed:', error);
      this.showToast('Prompts export failed. Please try again.', 'error');
    }
  }

  importPromptsOnly() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        let prompts = [];
        
        // Handle different formats
        if (importData.type === 'prompts' && importData.data) {
          prompts = importData.data;
        } else if (Array.isArray(importData)) {
          prompts = importData;
        } else {
          throw new Error('Invalid prompts file format');
        }

        // Import prompts
        await chrome.storage.local.set({
          chatgpt_gold_prompts: prompts
        });

        this.showToast(`${prompts.length} prompts imported successfully!`);
      } catch (error) {
        console.error('Prompts import failed:', error);
        this.showToast('Prompts import failed. Please check the file format.', 'error');
      }
    };
    
    input.click();
  }

  async exportFoldersOnly() {
    try {
      const result = await chrome.storage.local.get([
        'chatgpt_gold_folders',
        'chatgpt_gold_conversations'
      ]);
      
      const exportData = {
        type: 'folders',
        version: '2.0.9',
        timestamp: new Date().toISOString(),
        data: {
          folders: result.chatgpt_gold_folders || [],
          conversations: result.chatgpt_gold_conversations || []
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-gold-folders-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Folders and conversations exported successfully!');
    } catch (error) {
      console.error('Folders export failed:', error);
      this.showToast('Folders export failed. Please try again.', 'error');
    }
  }

  importFoldersOnly() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        let folders = [];
        let conversations = [];
        
        // Handle different formats
        if (importData.type === 'folders' && importData.data) {
          folders = importData.data.folders || [];
          conversations = importData.data.conversations || [];
        } else if (importData.chatgpt_gold_folders) {
          folders = importData.chatgpt_gold_folders;
          conversations = importData.chatgpt_gold_conversations || [];
        } else {
          throw new Error('Invalid folders file format');
        }

        // Import folders and conversations
        await chrome.storage.local.set({
          chatgpt_gold_folders: folders,
          chatgpt_gold_conversations: conversations
        });

        this.showToast(`${folders.length} folders and ${conversations.length} conversations imported successfully!`);
      } catch (error) {
        console.error('Folders import failed:', error);
        this.showToast('Folders import failed. Please check the file format.', 'error');
      }
    };
    
    input.click();
  }

  async exportSettingsOnly() {
    try {
      const exportData = {
        type: 'settings',
        version: '2.0.9',
        timestamp: new Date().toISOString(),
        data: this.settings
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-gold-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Settings exported successfully!');
    } catch (error) {
      console.error('Settings export failed:', error);
      this.showToast('Settings export failed. Please try again.', 'error');
    }
  }

  importSettingsOnly() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        let settings = {};
        
        // Handle different formats
        if (importData.type === 'settings' && importData.data) {
          settings = importData.data;
        } else if (importData.chatgpt_gold_settings) {
          settings = importData.chatgpt_gold_settings;
        } else {
          throw new Error('Invalid settings file format');
        }

        // Merge with default settings
        this.settings = { ...this.defaultSettings, ...settings };
        
        // Save and apply settings
        await this.saveSettings();
        this.applySettings();
        this.populateFolders();

        this.showToast('Settings imported successfully!');
      } catch (error) {
        console.error('Settings import failed:', error);
        this.showToast('Settings import failed. Please check the file format.', 'error');
      }
    };
    
    input.click();
  }

  clearAllData() {
    this.showClearDataModal();
  }

  showClearDataModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
      <div style="
        background: var(--settings-bg);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: var(--settings-shadow-lg);
        border: 1px solid var(--settings-border);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="
            width: 64px;
            height: 64px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 32px;
          ">⚠️</div>
          <h3 style="
            margin: 0 0 8px;
            color: var(--settings-text);
            font-size: 20px;
            font-weight: 600;
          ">Clear All Data</h3>
          <p style="
            margin: 0;
            color: var(--settings-text-secondary);
            font-size: 14px;
            line-height: 1.4;
          ">This will permanently delete all your ChatGPT Gold data</p>
        </div>
        
        <div style="
          background: var(--settings-bg-secondary);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid var(--settings-border);
        ">
          <h4 style="
            margin: 0 0 12px;
            color: var(--settings-text);
            font-size: 16px;
            font-weight: 600;
          ">The following will be deleted:</h4>
          <ul style="
            margin: 0;
            padding-left: 20px;
            color: var(--settings-text-secondary);
            font-size: 14px;
            line-height: 1.6;
          ">
            <li>All conversations and folders</li>
            <li>All saved prompts and favorites</li>
            <li>All extension settings and preferences</li>
            <li>Theme customizations and shortcuts</li>
          </ul>
        </div>
        
        <div style="
          background: #fef3cd;
          border: 1px solid #f6e05e;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 24px;
        ">
          <p style="
            margin: 0;
            color: #975a16;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span>⚠️</span>
            This action cannot be undone. Consider exporting your data first.
          </p>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <button id="cancel-clear-data" style="
            padding: 10px 20px;
            background: var(--settings-bg-tertiary);
            color: var(--settings-text);
            border: 1px solid var(--settings-border);
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
          ">Cancel</button>
          <button id="confirm-clear-data" style="
            padding: 10px 20px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
          ">Clear All Data</button>
        </div>
      </div>
    `;
    
    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    modal.querySelector('#cancel-clear-data').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('#confirm-clear-data').addEventListener('click', async () => {
      modal.remove();
      await this.performClearAllData();
    });
    
    document.body.appendChild(modal);
  }

  async performClearAllData() {
    try {
      // Clear all Chrome storage
      await chrome.storage.local.clear();
      
      // Reset settings to defaults
      this.settings = { ...this.defaultSettings };
      
      // Apply default settings
      this.applySettings();
      this.populateFolders();
      
      // Reset all form elements to defaults
      document.querySelectorAll('input, select').forEach(element => {
        if (element.type === 'checkbox') {
          const settingKey = element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          element.checked = this.defaultSettings[settingKey] || false;
        } else if (element.type === 'range') {
          const settingKey = element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          element.value = this.defaultSettings[settingKey] || element.min;
          const valueDisplay = element.parentElement?.querySelector('.slider-value');
          if (valueDisplay) {
            const unit = valueDisplay.textContent.replace(/\d+/g, '');
            valueDisplay.textContent = element.value + unit;
          }
        } else if (element.tagName === 'SELECT') {
          const settingKey = element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          element.value = this.defaultSettings[settingKey] || '';
        } else if (element.type === 'text') {
          const settingKey = element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          element.value = this.defaultSettings[settingKey] || '';
        }
      });
      
      // Reset theme selection
      document.querySelector('input[name="theme"][value="auto"]').checked = true;
      
      // Reset color selection
      document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-color="#10a37f"]').classList.add('active');
      
      this.showToast('All data cleared and settings reset to defaults!');
    } catch (error) {
      console.error('Clear data failed:', error);
      this.showToast('Failed to clear data. Please try again.', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    this.settings = { ...this.defaultSettings };
    await this.saveSettings();
    this.applySettings();
    
    // Reset all form elements
    document.querySelectorAll('input, select').forEach(element => {
      if (element.type === 'checkbox') {
        element.checked = this.defaultSettings[element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase())];
      } else if (element.type === 'range') {
        element.value = this.defaultSettings[element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase())];
        const valueDisplay = element.parentElement?.querySelector('.slider-value');
        if (valueDisplay) {
          const unit = valueDisplay.textContent.replace(/\d+/g, '');
          valueDisplay.textContent = element.value + unit;
        }
      } else if (element.tagName === 'SELECT') {
        element.value = this.defaultSettings[element.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase())];
      }
    });

    this.showToast('Settings reset to defaults!');
  }

  showChangelog() {
    // Simple changelog modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
      <div style="
        background: var(--settings-bg);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: var(--settings-shadow-lg);
      ">
        <h3 style="margin-bottom: 16px; color: var(--settings-text);">Changelog - Version 2.0.0</h3>
        <div style="color: var(--settings-text-secondary); line-height: 1.6;">
          <h4 style="color: var(--settings-text); margin: 12px 0 8px;">✨ New Features</h4>
          <ul style="margin-left: 20px; margin-bottom: 16px;">
            <li>Advanced search with filtering system</li>
            <li>Comprehensive settings with theme customization</li>
            <li>Enhanced conversation management</li>
            <li>Improved prompt library with collapsible previews</li>
            <li>Professional confirmation modals</li>
          </ul>
          
          <h4 style="color: var(--settings-text); margin: 12px 0 8px;">🐛 Bug Fixes</h4>
          <ul style="margin-left: 20px; margin-bottom: 16px;">
            <li>Fixed sidebar toggle positioning issues</li>
            <li>Resolved folder icon alignment problems</li>
            <li>Improved modal closing behavior</li>
            <li>Enhanced event listener management</li>
          </ul>
          
          <h4 style="color: var(--settings-text); margin: 12px 0 8px;">🎨 UI Improvements</h4>
          <ul style="margin-left: 20px;">
            <li>Modern dashboard design</li>
            <li>Better responsive layouts</li>
            <li>Improved dark mode support</li>
            <li>Enhanced accessibility</li>
          </ul>
        </div>
        <button onclick="this.closest('div').remove()" style="
          margin-top: 20px;
          padding: 8px 16px;
          background: var(--settings-primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        ">Close</button>
      </div>
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
  }

  backToChatGPT() {
    chrome.tabs.create({ url: 'https://chatgpt.com' });
  }

  showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;

    indicator.classList.add('show');
    
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? 'var(--settings-danger)' : 'var(--settings-success)'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1001;
      box-shadow: var(--settings-shadow-lg);
      animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Add slide in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  /* Force theme classes */
  .force-light {
    --settings-bg: #ffffff;
    --settings-bg-secondary: #f8fafc;
    --settings-bg-tertiary: #f1f5f9;
    --settings-text: #1a1a1a;
    --settings-text-secondary: #64748b;
    --settings-border: #e2e8f0;
  }
  
  .force-dark {
    --settings-bg: #1e293b;
    --settings-bg-secondary: #334155;
    --settings-bg-tertiary: #475569;
    --settings-text: #f8fafc;
    --settings-text-secondary: #94a3b8;
    --settings-border: #475569;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});