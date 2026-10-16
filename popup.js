const message = document.querySelector('#message');
const open = () => chrome.tabs.create({url:chrome.runtime.getURL('index.html')});
document.querySelector('#open').addEventListener('click', open);
document.querySelector('#inspect').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab.url);
    if(!['http:','https:'].includes(url.protocol)) throw new Error();
    const results = await chrome.scripting.executeScript({target:{tabId:tab.id},func:() => {
      // Read labels only; never inspect form inputs or storage values.
      const logoutControl = [...document.querySelectorAll('a,button,[role="button"]')].some(el => {
        const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
        return el.getClientRects().length > 0 && /^(sign out|log out|logout)$/i.test(label);
      });
      const counts = {localStorage:null,sessionStorage:null};
      for (const key of Object.keys(counts)) {
        try { counts[key] = window[key].length; } catch {}
      }
      return {logoutControl,...counts};
    }});
    await chrome.storage.session.set({observation:{domain:url.hostname,origin:url.origin,
      tabId:tab.id,observedAt:Date.now(),...results[0].result}});
    await open();
  } catch { message.textContent = 'Unable to inspect this page. Try a normal HTTP(S) tab and click the extension again.'; }
});
