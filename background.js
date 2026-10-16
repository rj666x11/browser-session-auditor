import { summarizeCookies } from './core.js';
// No cookie mutation, network calls, persisted audits, or raw-object logging.
export async function audit(api = chrome) {
  const stores = await api.cookies.getAllCookieStores();
  const rows = [];
  const errors = [];
  for (const store of stores) {
    try {
      // Empty partition key includes partitioned and unpartitioned cookie contexts.
      const cookies = await api.cookies.getAll({storeId:store.id, partitionKey:{}});
      rows.push(...summarizeCookies(cookies));
    } catch { errors.push(`Cookie store ${store.id} could not be scanned.`); }
  }
  let settings = null;
  try { settings = await api.browsingData.settings(); } catch { errors.push('Chrome clearing selections are unavailable.'); }
  const permissions = await api.permissions.getAll();
  return {rows, errors, settings, origins:permissions.origins || [], scannedAt:Date.now()};
}
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if(sender.id !== chrome.runtime.id || message?.type !== 'AUDIT') return;
    audit().then(data=>respond({ok:true,data})).catch(()=>respond({ok:false,error:'Audit unavailable. Please retry.'}));
    return true;
  });
}
