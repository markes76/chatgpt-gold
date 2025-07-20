/**
 * ChatGPT Gold - Minimal Popup Script
 */

// Simple popup functionality
document.addEventListener('DOMContentLoaded', () => {
  // Open Settings button
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open ChatGPT button
  document.getElementById('openChatGPT').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chat.openai.com' });
    window.close();
  });

  // Reload Extension button
  document.getElementById('reloadExtension').addEventListener('click', () => {
    chrome.runtime.reload();
  });

  // Set extension status
  document.getElementById('extensionStatus').textContent = 'Ready';
  
  console.log('ChatGPT Gold popup loaded');
});