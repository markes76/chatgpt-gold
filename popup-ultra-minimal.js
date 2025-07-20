// Ultra minimal popup script
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('settings').onclick = function() {
    chrome.runtime.openOptionsPage();
  };
  
  document.getElementById('chatgpt').onclick = function() {
    chrome.tabs.create({url: 'https://chat.openai.com'});
    window.close();
  };
});