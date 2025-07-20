/**
 * ChatGPT Gold - Working Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('ChatGPT Gold popup loaded');
  
  // Initialize status
  updateExtensionStatus();
  await checkChatGPTTab();
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Toggle sidebar
  document.getElementById('toggleSidebar').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && (tab.url?.includes('chat.openai.com') || tab.url?.includes('chatgpt.com'))) {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
        showFeedback('Sidebar toggled');
      } else {
        showFeedback('Please open ChatGPT first');
      }
    } catch (error) {
      console.error('Toggle sidebar error:', error);
      showFeedback('Error: Make sure you\'re on ChatGPT');
    }
  });

  // Open ChatGPT
  document.getElementById('openChatGPT').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && (tab.url?.includes('chat.openai.com') || tab.url?.includes('chatgpt.com'))) {
        // Already on ChatGPT, just close popup
        window.close();
      } else {
        // Open new ChatGPT tab
        await chrome.tabs.create({ url: 'https://chatgpt.com' });
        window.close();
      }
    } catch (error) {
      console.error('Open ChatGPT error:', error);
    }
  });

  // Open settings
  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function updateExtensionStatus() {
  const statusElement = document.getElementById('extensionStatus');
  const indicatorElement = document.getElementById('extensionIndicator');
  
  // Test extension functionality
  try {
    chrome.runtime.getManifest();
    statusElement.textContent = 'Active';
    indicatorElement.classList.add('active');
  } catch (error) {
    statusElement.textContent = 'Error';
    indicatorElement.classList.add('inactive');
  }
}

async function checkChatGPTTab() {
  const statusElement = document.getElementById('chatgptStatus');
  const indicatorElement = document.getElementById('chatgptIndicator');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && (tab.url?.includes('chat.openai.com') || tab.url?.includes('chatgpt.com'))) {
      statusElement.textContent = 'Connected';
      indicatorElement.classList.add('active');
      
      // Try to check if content script is loaded
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        document.getElementById('sidebarStatus').textContent = 'Ready';
        document.getElementById('sidebarIndicator').classList.add('active');
      } catch (error) {
        document.getElementById('sidebarStatus').textContent = 'Loading...';
        document.getElementById('sidebarIndicator').classList.add('inactive');
      }
    } else {
      statusElement.textContent = 'Not on ChatGPT';
      indicatorElement.classList.add('inactive');
      document.getElementById('sidebarStatus').textContent = 'N/A';
      document.getElementById('sidebarIndicator').classList.add('inactive');
    }
  } catch (error) {
    statusElement.textContent = 'Error';
    indicatorElement.classList.add('inactive');
  }
}

function showFeedback(message) {
  // Create temporary feedback element
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #10a37f;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    z-index: 1000;
  `;
  feedback.textContent = message;
  
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.remove();
    }
  }, 2000);
}