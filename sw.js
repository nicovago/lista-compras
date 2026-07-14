const CACHE='compras-v15-offline';
const LOCAL_ASSETS=['./','./index.html','./styles.css?v=15','./theme-v2.css?v=15','./app.js?v=15','./manifest.json','./icon-192.png','./icon-512.png'];
const FIREBASE_ASSETS=[
  'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      await cache.addAll(LOCAL_ASSETS);
      await Promise.all(FIREBASE_ASSETS.map(async url=>{
        try{await cache.add(new Request(url,{mode:'cors'}));}
        catch(error){console.warn('No se pudo precargar',url,error);}
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isFirebaseModule=url.origin==='https://www.gstatic.com'&&url.pathname.startsWith('/firebasejs/11.10.0/');

  if(isFirebaseModule){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));
    return;
  }

  if(url.origin!==self.location.origin)return;
  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})
      .catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
  );
});
