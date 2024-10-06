// Keep track of tabs where the content script has been injected
let injectedTabs = new Set();

chrome.action.onClicked.addListener((tab) => {
  if (injectedTabs.has(tab.id)) {
    // Content script already injected, just show the modal
    chrome.tabs.sendMessage(tab.id, { action: "showModal" });
  } else {
    // Inject the content script
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      // After injection, show the modal and mark the tab
      chrome.tabs.sendMessage(tab.id, { action: "showModal" });
      injectedTabs.add(tab.id);
    });
  }
});

// Clean up injectedTabs when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Handle tab updates (e.g., when navigating to a new page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    injectedTabs.delete(tabId);
  }
});

// New: Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showModal") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "showModal" });
  }
});