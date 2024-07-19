(function() {
  let modal;
  let shadowRoot;
  let shadowHost;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showModal") {
      showModal();
    }
  });

  function createModal() {
    // Check if modal already exists
    if (document.getElementById('bookmark-saver-shadow-host')) {
      return;
    }

    shadowHost = document.createElement('div');
    shadowHost.id = 'bookmark-saver-shadow-host';
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({mode: 'closed'});

    modal = document.createElement('div');
    modal.className = 'bookmark-saver-modal';

    // Load external CSS
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    linkElem.setAttribute('href', chrome.runtime.getURL('modal.css'));
    shadowRoot.appendChild(linkElem);
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bookmark-saver-modal-content';
    
    modalContent.innerHTML = `
      <h1>Save Bookmark</h1>
      <button id="closeButton">&times;</button>
      <div id="apiKeyContainer"></div>
      <div class="input-group">
        <label for="title">Title</label>
        <input type="text" id="title" placeholder="Enter title">
      </div>
      <div class="input-group">
        <label for="description">Description</label>
        <textarea id="description" placeholder="Enter description"></textarea>
      </div>
      <div class="input-group">
        <label for="tags">Tags</label>
        <input type="text" id="tags" placeholder="Enter tags (comma-separated)">
      </div>
      <button id="saveButton">Save Bookmark</button>
    `;
    
    modal.appendChild(modalContent);
    shadowRoot.appendChild(modal);

    shadowRoot.getElementById('saveButton').addEventListener('click', saveBookmark);
    shadowRoot.getElementById('closeButton').addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal();
      }
    });
  }

  function showModal() {
    createModal();
    if (modal) {
      modal.style.display = 'flex';
      populateFields();
      checkApiKey();
      document.addEventListener('keydown', disableHotkeys, true);
    }
  }

  function hideModal() {
    if (modal) {
      modal.style.display = 'none';
      document.removeEventListener('keydown', disableHotkeys, true);
    }
  }

  function disableHotkeys(event) {
    event.stopPropagation();
  }

  function populateFields() {
    shadowRoot.getElementById('title').value = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    shadowRoot.getElementById('description').value = metaDescription ? metaDescription.getAttribute('content') : '';
  }

  function checkApiKey() {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (!result.apiKey) {
        promptForApiKey();
      }
    });
  }

  function promptForApiKey() {
    const apiKeyContainer = shadowRoot.getElementById('apiKeyContainer');
    if (apiKeyContainer.children.length > 0) {
      return; // API key prompt already shown
    }

    const apiKeyDiv = document.createElement('div');
    apiKeyDiv.innerHTML = `
      <input type="text" id="apiKeyInput" placeholder="Enter your API key">
      <button id="setApiKey">Set</button>
    `;
    apiKeyContainer.appendChild(apiKeyDiv);

    shadowRoot.getElementById('setApiKey').addEventListener('click', function() {
      const apiKey = shadowRoot.getElementById('apiKeyInput').value;
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

  async function saveBookmark() {
    const url = window.location.href;
    const title = shadowRoot.getElementById('title').value;
    const description = shadowRoot.getElementById('description').value;
    const tags = shadowRoot.getElementById('tags').value.split(',').map(tag => tag.trim());

    const apiUrl = 'https://saves.huntsyea.com/api/bookmarks';
    
    try {
      const result = await new Promise(resolve => chrome.storage.sync.get(['apiKey'], resolve));
      const apiKey = result.apiKey;

      if (!apiKey) {
        alert('API Key not set. Please set your API Key.');
        promptForApiKey();
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ url, title, description, tags }),
      });

      if (response.ok) {
        // Simply close the modal without showing an alert
        hideModal();
      } else {
        const errorData = await response.json();
        alert(`Failed to save bookmark: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      alert('An error occurred while saving the bookmark.');
    }
  }
})();