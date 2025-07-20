/**
 * ChatGPT Gold - Background Service Worker
 * 
 * This script runs in the background and handles tasks such as:
 * - Intercepting API calls (for multi-model support)
 * - Managing extension state and settings
 * - Handling messages from content scripts and popup
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Gold: Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
  } else if (request.type === 'OPEN_DATABASE_SETUP') {
    // Handle database setup page opening
    chrome.tabs.create({ url: request.url })
      .then(() => {
        console.log('Database setup tab created successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Failed to create database setup tab:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.type === 'STORAGE_GET') {
    // Handle Chrome storage get requests from content scripts
    chrome.storage.local.get(request.keys)
      .then((result) => {
        console.log('[ChatGPT Gold] Background: Storage get result:', result);
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error('[ChatGPT Gold] Background: Storage get failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.type === 'STORAGE_SET') {
    // Handle Chrome storage set requests from content scripts
    chrome.storage.local.set(request.data)
      .then(() => {
        console.log('[ChatGPT Gold] Background: Storage set successful');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[ChatGPT Gold] Background: Storage set failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.type === 'STORAGE_CLEAR') {
    // Handle Chrome storage clear requests from content scripts
    chrome.storage.local.clear()
      .then(() => {
        console.log('[ChatGPT Gold] Background: Storage cleared');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[ChatGPT Gold] Background: Storage clear failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.type === 'STORAGE_REMOVE') {
    // Handle Chrome storage remove requests from content scripts
    chrome.storage.local.remove(request.keys)
      .then(() => {
        console.log('[ChatGPT Gold] Background: Storage keys removed:', request.keys);
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[ChatGPT Gold] Background: Storage remove failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});
