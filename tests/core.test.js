import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCookies, sitePattern, impact } from '../core.js';
import { audit } from '../background.js';
const cookie = (overrides={}) => ({domain:'.example.com',storeId:'0',session:false,secure:true,httpOnly:true,expirationDate:2000000000,name:'secret-name',path:'/secret-path',value:'SYNTHETIC_SECRET',...overrides});
test('report strips secrets and preserves separate partition/store contexts',()=>{
  const rows = summarizeCookies([cookie(),cookie({session:true,expirationDate:undefined}),cookie({partitionKey:{topLevelSite:'https://other.test',hasCrossSiteAncestor:true}}),cookie({storeId:'1'})]);
  assert.equal(rows.length,3);
  const first = rows.find(r=>r.storeId==='0' && !r.partition);
  assert.equal(first.cookieCount,2);
  assert.equal(first.sessionCookies,1);
  assert.equal(first.earliestExpiry,2000000000);
  assert.equal(first.httpOnlyCookies,2);
  const json = JSON.stringify(rows);
  for(const secret of ['SYNTHETIC_SECRET','secret-name','secret-path','"value"','"name"','"path"']) assert.ok(!json.includes(secret));
});
test('cross-site ancestor partitions do not merge',()=>{
  assert.equal(summarizeCookies([cookie({partitionKey:{topLevelSite:'https://other.test',hasCrossSiteAncestor:true}}),cookie({partitionKey:{topLevelSite:'https://other.test',hasCrossSiteAncestor:false}})]).length,2);
});
test('site grants reject nonweb origins and embedded credentials',()=>{
  assert.equal(sitePattern('example.com'),'https://example.com/*');
  assert.equal(sitePattern('http://example.com/path'),'http://example.com/*');
  for(const input of ['https://*','https://*.example.com','chrome://settings','file:///tmp/test','https://user:pass@example.com','https://example.com:8443']) assert.throws(()=>sitePattern(input));
});
test('scanner asks for partition coverage and returns sanitized results',async()=>{
  const calls=[];
  const api={cookies:{getAllCookieStores:async()=>[{id:'0'}],getAll:async query=>{calls.push(query);return [cookie()];}},browsingData:{settings:async()=>({dataToRemove:{cache:true,cookies:false},options:{since:0}})},permissions:{getAll:async()=>({origins:['https://example.com/*']})}};
  const result = await audit(api);
  assert.deepEqual(calls,[{storeId:'0',partitionKey:{}}]);
  assert.equal(result.rows.length,1);
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SECRET'));
  assert.equal(result.errors.length,0);
});
test('failed stores yield partial coverage errors without leaking raw exception data',async()=>{
  const api={cookies:{getAllCookieStores:async()=>[{id:'0'},{id:'1'}],getAll:async query=>{if(query.storeId==='1') throw new Error('SYNTHETIC_SECRET');return [cookie()];}},browsingData:{settings:async()=>{throw new Error('SYNTHETIC_SECRET');}},permissions:{getAll:async()=>({})}};
  const result = await audit(api);
  assert.equal(result.rows.length,1);
  assert.equal(result.errors.length,2);
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SECRET'));
});
test('impact does not promise session revocation or cache logout',()=>{
  assert.match(impact('cache'),/usually preserves/);
  assert.match(impact('site'),/not necessarily revoked/);
  assert.match(impact('selected'),/exact affected-session list is unavailable/);
});
