(function() {
  let modal;
  let shadowRoot;
  let shadowHost;

  // Create and inject the tab with Lucide bookmark icon
  function createTab() {
    const tab = document.createElement('div');
    tab.id = 'bookmark-saver-tab';
    tab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
    `;
    tab.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background-color: rgba(2, 60, 182, 0.8); /* 80% opacity */
      color: white;
      padding: 10px;
      cursor: pointer;
      border-radius: 4px 0 0 4px;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s ease;
    `;

    tab.addEventListener('mouseenter', () => {
      tab.style.backgroundColor = 'rgba(2, 60, 182, 1)'; /* Full opacity on hover */
    });

    tab.addEventListener('mouseleave', () => {
      tab.style.backgroundColor = 'rgba(2, 60, 182, 0.8)'; /* Back to 80% opacity */
    });

    tab.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "showModal" });
    });

    document.body.appendChild(tab);
  }

  // Create the tab immediately
  createTab();

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
      <div class="modal-header">
        <h2>Save Bookmark</h2>
        <button id="closeButton" aria-label="Close">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        </button>
      </div>
      <div id="bookmarkForm">
        <div class="input-group">
          <label for="title">Title</label>
          <input type="text" id="title" placeholder="Enter title">
        </div>
        <div class="input-group">
          <label for="description">Description</label>
          <textarea id="description" placeholder="Enter description"></textarea>
        </div>
        <button id="saveButton">Save Bookmark</button>
      </div>
      <div id="successMessage">
        <svg width="50" height="50" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        <p>Bookmark Saved!</p>
      </div>
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

    const apiUrl = 'https://saves.huntsyea.com/api/bookmarks';
    
    try {
      const result = await new Promise(resolve => chrome.storage.sync.get(['apiKey'], resolve));
      const apiKey = result.apiKey;

      if (!apiKey) {
        alert('API Key not set. Please set your API Key.');
        promptForApiKey();
        return;
      }

      const requestBody = JSON.stringify({ url, title, description, tags: [] });
      console.log('Request body:', requestBody);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: requestBody,
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        showSuccessMessage();
      } else {
        alert(`Failed to save bookmark: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      alert('An error occurred while saving the bookmark.');
    }
  }

  function showSuccessMessage() {
    const bookmarkForm = shadowRoot.getElementById('bookmarkForm');
    const successMessage = shadowRoot.getElementById('successMessage');
    
    bookmarkForm.style.display = 'none';
    successMessage.style.display = 'block';
    
    // Automatically close the modal after 2 seconds
    setTimeout(() => {
      hideModal();
      // Reset the form for next use
      bookmarkForm.style.display = 'block';
      successMessage.style.display = 'none';
    }, 2000);
  }
})();