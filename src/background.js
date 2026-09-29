// Araç çubuğu simgesine ya da e-Devlet sayfasındaki düğmeye basılınca soy ağacı sekmesini açar (açıksa öne getirir).
async function openViewer() {
  const url = chrome.runtime.getURL('viewer.html');
  try {
    const tabs = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
    if (tabs.length && tabs[0].tabId >= 0) {
      await chrome.tabs.update(tabs[0].tabId, { active: true });
      if (tabs[0].windowId >= 0) await chrome.windows.update(tabs[0].windowId, { focused: true });
      return;
    }
  } catch (e) { /* eski Chrome sürümleri: yeni sekme aç */ }
  await chrome.tabs.create({ url });
}

chrome.action.onClicked.addListener(() => openViewer());
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'open-viewer') openViewer();
});
