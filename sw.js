// Service-worker config
var swConfig = {
    genCache: 'funda-cache-v1',
    pageCache: 'funda-page-cache-v1',
    urls: [
        '/offline/',
        '/static/img/favicon.ico',
        '/static/img/apple-touch-icon.png',
        '/static/components/funda-logo.html',
        '/static/style/main.min.css',
        '/static/script/bundle.js'
    ]
};

/*
    Source: Jasper Moelker - De Voorhoede
    (https://github.com/jbmoelker/workshop-cmd-pwa)
*/
self.addEventListener('install', event => event.waitUntil(
    caches.open(swConfig.genCache)
        .then(cache => cache.addAll(swConfig.urls))
        .then(self.skipWaiting())
));

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => cachePage(request, response))
                .catch(err => getCachedPage(request))
                .catch(err => fetchCoreFile('/offline/'))
        );
    } else {
        event.respondWith(
            fetch(request)
                .catch(err => fetchCoreFile(request.url))
                .catch(err => fetchCoreFile('/offline/'))
        );
    }
});

function fetchCoreFile(url) {
    return caches.open(swConfig.genCache)
        .then(cache => cache.match(url))
        .then(response => response ? response : Promise.reject());
}

function getCachedPage(request) {
    return caches.open(swConfig.pageCache)
        .then(cache => cache.match(request))
        .then(response => response ? response : Promise.reject());
}

function cachePage(request, response) {
    const clonedResponse = response.clone();
    caches.open(swConfig.pageCache)
        .then(cache => cache.put(request, clonedResponse));
    return response;
}