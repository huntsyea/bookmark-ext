function getPageInfo() {
    return {
        title: document.title,
        description: getMetaDescription()
    };
}

function getMetaDescription() {
    const metaDescription = document.querySelector('meta[name="description"]');
    return metaDescription ? metaDescription.getAttribute('content') : '';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageInfo") {
        sendResponse(getPageInfo());
    }
});