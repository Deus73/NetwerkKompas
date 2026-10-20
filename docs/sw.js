'use strict';
const CACHE='netwerkkompas-shell-v2';
const ASSETS=['./','./index.html','./style.css','./app.js','./plus.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('netwerkkompas-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.endsWith('/probe.json')||u.search)return;const path=u.pathname;const allowed=ASSETS.some(asset=>new URL(asset,self.registration.scope).pathname===path);if(!allowed)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request).then(r=>r||Response.error())));});
