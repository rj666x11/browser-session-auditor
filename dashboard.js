import { impact, sitePattern } from './core.js';
const $ = s => document.querySelector(s);
let report = null;
const say = text => { $('#status').textContent = text; };
function cell(row, text) { const td = document.createElement('td'); td.textContent = text; row.append(td); }
function render() {
  $('#impact').textContent = impact($('#mode').value);
  $('#rows').replaceChildren();
  const visible = (report?.rows || []).filter(r=>r.domain.includes($('#filter').value.trim().toLowerCase()));
  for(const r of visible) {
    const tr = document.createElement('tr');
    cell(tr, `${r.domain} · store ${r.storeId}${r.partition ? ` · partition ${r.partition} · cross-site ancestor ${r.ancestor ?? 'unknown'}` : ' · unpartitioned'}`);
    cell(tr, 'Site data present · login unknown');
    cell(tr, `${r.cookieCount} total · ${r.sessionCookies} session · ${r.persistentCookies} persistent · ${r.secureCookies} Secure · ${r.httpOnlyCookies} HttpOnly`);
    cell(tr, r.earliestExpiry ? new Date(r.earliestExpiry*1000).toLocaleString() : 'No persistent expiry');
    cell(tr, $('#mode').value === 'site' ? 'Local evidence may be removed; logout possible' : $('#mode').value === 'cache' ? 'Usually preserved' : 'Depends on selected categories and time range');
    $('#rows').append(tr);
  }
  $('#empty').hidden = visible.length > 0;
  $('#empty').textContent = report?.rows.length ? 'No domains match this filter.' : 'No cookies visible within granted access. This does not prove there are no active logins. Storage-only logins are not inventoried.';
}
async function refresh() {
  $('#refresh').disabled = true;
  say('Scanning permitted sites…');
  try {
    const result = await chrome.runtime.sendMessage({type:'AUDIT'});
    if(!result?.ok) throw new Error(result?.error || 'Audit unavailable.');
    report = result.data;
    $('#coverage').textContent = `Granted access: ${report.origins.join(', ') || 'none'}. Coverage is limited to these permissions and accessible cookie stores.`;
    $('#summary').textContent = `${report.rows.length} site/context rows · ${report.rows.reduce((n,r)=>n+r.cookieCount,0)} cookies · scanned ${new Date(report.scannedAt).toLocaleString()}`;
    const s = report.settings;
    const types = Object.entries(s?.dataToRemove || {}).filter(([,enabled])=>enabled).map(([name])=>name);
    $('#settings').textContent = s ? `Chrome currently selects: ${types.join(', ') || 'no categories'}. Since: ${s.options?.since ? new Date(s.options.since).toLocaleString() : 'all time / unavailable'}.` : 'Chrome clearing selections unavailable.';
    $('#export').disabled = false;
    say(report.errors.length ? report.errors.join(' ') : 'Audit complete. Login validity has not been checked.');
    await showObservation();
    render();
  } catch { say('Unable to scan. Reload the extension and retry.'); }
  finally { $('#refresh').disabled = false; }
}
async function showObservation() {
  const {observation:o} = await chrome.storage.session.get('observation');
  $('#observation').textContent = o ? `${o.domain}: ${o.logoutControl ? 'visible logout control observed; possible signed-in interface' : 'no visible logout control found; login unknown'}. Local storage entries: ${o.localStorage ?? 'unavailable'}; session storage entries: ${o.sessionStorage ?? 'unavailable'}. Observed ${new Date(o.observedAt).toLocaleString()}.` : 'Use “Check this page” from the toolbar popup on an HTTP(S) page to inspect visible logout controls and storage counts.';
}
$('#grant-form').addEventListener('submit',async e=>{
  e.preventDefault();
  try {
    const origins = [sitePattern($('#site').value.trim())];
    const granted = await chrome.permissions.request({origins});
    if(granted) await refresh(); else say('Website access was not granted.');
  } catch(e) { say(e.message); }
});
$('#grant-all').addEventListener('click',async()=>{
  const granted = await chrome.permissions.request({origins:['http://*/*','https://*/*']});
  if(granted) await refresh(); else say('Website access was not granted.');
});
$('#revoke').addEventListener('click',async()=>{
  const permissions = await chrome.permissions.getAll();
  if(permissions.origins?.length) await chrome.permissions.remove({origins:permissions.origins});
  await refresh();
});
$('#forget').addEventListener('click',async()=>{ await chrome.storage.session.remove('observation'); await showObservation(); });
$('#refresh').addEventListener('click',refresh);
$('#mode').addEventListener('change',render);
$('#filter').addEventListener('input',render);
$('#export').addEventListener('click',()=>{
  if(!report) return;
  const blob = new Blob([JSON.stringify({schemaVersion:1,...report},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'session-audit.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
if(typeof chrome !== 'undefined' && chrome.runtime?.id) refresh();
else {
  for (const selector of ['#refresh','#grant-form button','#grant-all','#revoke','#forget']) {
    for (const button of document.querySelectorAll(selector)) button.disabled = true;
  }
  say('Preview mode. Install as an unpacked Chrome extension to scan your profile.'); render();
}
