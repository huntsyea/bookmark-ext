document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');
  const saveButton = document.getElementById('saveButton');
  const titleInput = document.getElementById('title');
  const descriptionInput = document.getElementById('description');
  const tagsInput = document.getElementById('tags');

  // Get the current tab's info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    console.log('Current tab:', currentTab);

    titleInput.value = currentTab.title || '';

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: getPageInfo
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script injection failed:', chrome.runtime.lastError);
        return;
      }

      if (results && results[0]) {
        const pageInfo = results[0].result;
        descriptionInput.value = pageInfo.description || '';
      }
    });
  });

  // Load API key from storage
  chrome.storage.sync.get(['apiKey'], function(result) {
    console.log('API Key from storage:', result.apiKey ? 'exists' : 'not set');
    if (!result.apiKey) {
      promptForApiKey();
    }
  });

  saveButton.addEventListener('click', function() {
    console.log('Save button clicked');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      const title = titleInput.value;
      const description = descriptionInput.value;
      const tags = tagsInput.value.split(',').map(tag => tag.trim());

      console.log('Saving bookmark:', { url, title, description, tags });
      saveBookmark(url, title, description, tags);
    });
  });
});

function getPageInfo() {
  const metaDescription = document.querySelector('meta[name="description"]');
  return {
    description: metaDescription ? metaDescription.getAttribute('content') : ''
  };
}

function promptForApiKey() {
  const apiKeyDiv = document.createElement('div');
  apiKeyDiv.innerHTML = `
    <input type="text" id="apiKeyInput" placeholder="Enter your API key">
    <button id="setApiKey">Set</button>
  `;
  document.getElementById('apiKeyContainer').appendChild(apiKeyDiv);

  document.getElementById('setApiKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKeyInput').value;
    if (apiKey) {
      chrome.storage.sync.set({apiKey: apiKey}, function() {
        console.log('New API Key set');
        alert('API Key set successfully. You can now save bookmarks.');
        apiKeyDiv.remove();
      });
    } else {
      alert('API Key is required to save bookmarks. Please enter a valid key.');
    }
  });
}

async function saveBookmark(url, title, description, tags) {
  console.log('saveBookmark function called');
  const apiUrl = 'https://saves.huntsyea.com/api/bookmarks';
  
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['apiKey']);
    const apiKey = result.apiKey;

    console.log('API Key retrieved:', apiKey ? 'exists' : 'not set');

    if (!apiKey) {
      alert('API Key not set. Please set your API Key.');
      promptForApiKey();
      return;
    }

    console.log('Sending request to:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ url, title, description, tags }),
    });

    console.log('Response received:', response.status);

    if (response.ok) {
      alert('Bookmark saved successfully!');
      window.close(); // Close the popup after successful save
    } else {
      const errorData = await response.json();
      console.error('Error data:', errorData);
      alert(`Failed to save bookmark: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error saving bookmark:', error);
    alert('An error occurred while saving the bookmark.');
  }
}