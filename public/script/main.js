if ('serviceWorker' in navigator) {
	window.addEventListener('load', function() {
		navigator.serviceWorker.register('/sw.js')
			.then(function(registration) {
				console.log('ServiceWorker registration succesful with scope: ', registration);
			})
			.catch(function(err) {
				console.error('ServiceWorker registration failed: ', err);
			});
	});
}