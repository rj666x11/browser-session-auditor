// Only aggregate allowlisted fields. Cookie names, paths and values never enter reports.
export function summarizeCookies(cookies) {
  const groups = new Map();
  for (const c of cookies) {
    const domain = c.domain.replace(/^\./, '');
    const partition = c.partitionKey?.topLevelSite || '';
    const ancestor = c.partitionKey?.hasCrossSiteAncestor ?? null;
    const key = JSON.stringify([domain, c.storeId, partition, ancestor]);
    if (!groups.has(key)) groups.set(key, {domain, storeId:c.storeId, partition, ancestor,
      cookieCount:0, sessionCookies:0, persistentCookies:0, secureCookies:0,
      httpOnlyCookies:0, earliestExpiry:null});
    const r = groups.get(key);
    r.cookieCount++;
    c.session ? r.sessionCookies++ : r.persistentCookies++;
    if(c.secure) r.secureCookies++;
    if(c.httpOnly) r.httpOnlyCookies++;
    if(Number.isFinite(c.expirationDate)) r.earliestExpiry = Math.min(r.earliestExpiry ?? Infinity, c.expirationDate);
  }
  return [...groups.values()].sort((a,b)=>a.domain.localeCompare(b.domain));
}
export function impact(mode) {
  if(mode === 'site') return 'Cookies and site storage may be removed. You may need to sign in again. Server-side sessions are not necessarily revoked.';
  if(mode === 'selected') return 'Chrome selections are shown above. Impact depends on those categories and the selected time range; an exact affected-session list is unavailable.';
  return 'Cache-only clearing usually preserves cookies, saved passwords, and logins. Application behavior can vary.';
}
export function sitePattern(input) {
  const u = new URL(input.includes('://') ? input : `https://${input}`);
  if(!['https:','http:'].includes(u.protocol) || u.username || u.password || !u.hostname || u.hostname.includes('*') || u.port) throw new Error('Enter an HTTP(S) hostname without credentials or a port.');
  return `${u.protocol}//${u.hostname}/*`;
}
