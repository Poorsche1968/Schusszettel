const V='sz-v22-visible-viewport',F=['./','index.html','style.css','core.js','vision.js','extras.js','app.js','manifest.json','icon.svg','icon-180.png','icon-192.png','icon-512.png','icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('sz-')&&x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
e.respondWith(caches.open(V).then(async cache=>{
const cached=await cache.match(e.request);if(cached)return cached;
try{const r=await fetch(e.request);if(r.ok)await cache.put(e.request,r.clone());return r;}
catch(err){if(e.request.mode==='navigate')return cache.match('index.html');throw err;}
}));
});
