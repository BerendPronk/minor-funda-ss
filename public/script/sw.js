console.log('Ready for use');

var swConfig = {
	name: 'funda-cache-v1',
	urls: [
		'/',
		'/static/style/main.css'
	]
};

self.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open(swConfig.name)
			.then(function(cache) {
				console.log('Opened cache');
				return cache.addAll(swConfig.urls);
			})
	);
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.match(event.request)
			.then(function(response) {
				if (response) {
					return response;
				}

				var fetchRequest = event.request.clone();

				return fetch(fetchRequest)
					.then(function(response) {
						if(!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}

						var responseToCache = response.clone();

						caches.open(swConfig.name)
							.then(function(cache) {
								cache.put(event.request, responseToCache);
							});

						return response;
					}
				);
			})
		);
});

self.addEventListener('activate', function(event) {
	var cacheWhiteList = ['funda-cache-v1']

	event.waitUntil(
		caches.keys()
			.then(function(cacheNames) {
				return Promise.all(
					cacheNames.map(function(cacheName) {
						if (cacheWhiteList.indexOf(cacheName) === 1) {
							return caches.delete(cacheName);
						}
					})
				);
			})
	);
});