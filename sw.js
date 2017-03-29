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