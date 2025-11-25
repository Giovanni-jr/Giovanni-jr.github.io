// AUMENTAR LA VERSIÓN DEL CACHÉ PARA FORZAR LA ACTUALIZACIÓN
const CACHE_NAME = 'bytecraft-v2';
const urlsToCache = [
    './',
    'index.html',
    'manifest.json',
    'style.css',
    'script.js',
    // --- NUEVOS ARCHIVOS A CACHEAR ---
    'database.js', // Tu nuevo archivo de la base de datos
    'https://unpkg.com/pouchdb@8.0.1/dist/pouchdb.min.js', // La librería PouchDB
    // ---------------------------------
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    // URLs de iconos (debes tener la carpeta icons)
    'icons/icon-192x192.png',
    'icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    // Almacena todos los assets necesarios en el caché.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Sirve el contenido desde el caché si está disponible
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    // Limpia las cachés antiguas
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});