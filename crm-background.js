// Run both product workers in the same CRM Flow service worker.
import "./background.js";
import "./instagram/src/pages/background/index.js";

// Updating an unpacked extension invalidates its old isolated-world context,
// but Chrome does not rerun manifest content scripts in tabs that are already
// open. Restore the relationship badge without navigating or reloading the
// user's Instagram tab.
async function restoreInstagramContentScripts() {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  await Promise.allSettled(tabs
    .filter(tab => Number.isInteger(tab.id))
    .map(tab => chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "instagram/src/pages/content/index.js",
        "instagram/src/pages/content/follows-you-recovery.js",
        "instagram/src/pages/content/contact-loader.js"
      ]
    })));
}

chrome.runtime.onInstalled.addListener(() => {
  restoreInstagramContentScripts().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  restoreInstagramContentScripts().catch(() => {});
});

restoreInstagramContentScripts().catch(() => {});
