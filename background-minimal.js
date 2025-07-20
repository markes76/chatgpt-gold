/**
 * ChatGPT Gold - Minimal Background Script
 * Lightweight service worker for basic functionality
 */

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ChatGPT Gold installed:', details.reason);
  
  // Set default settings
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      chatgpt_gold_settings: {
        sidebarEnabled: true,
        toolbarEnabled: true,
        theme: 'auto'
      }
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'openSettings':
      try {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true, message: 'Settings opened' });
      } catch (error) {
        console.error('Failed to open settings:', error);
        sendResponse({ success: false, error: error.message });
      }
      break;
    
    default:
      sendResponse({ success: true, message: 'Background script working' });
  }
  
  return true; // Keep message channel open
});

console.log('ChatGPT Gold background script loaded');