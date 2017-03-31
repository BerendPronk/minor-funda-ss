// Requirements
var loadCSS = require('./loadcss.js');
var setPeriods = require('./setperiods.js');

// Set asynchronous stylesheet loading
var stylesheet = loadCSS('/static/style/main.min.css');

var feedback = document.querySelector('#feedback');
var priceInputs = document.querySelectorAll('.filter-price input');

// Adds a close-icon to negative feedback messages
if (feedback && feedback.classList.contains('negative')) {
	var body = document.querySelector('body');
	var closeIcon = document.createElement('span');

	closeIcon.textContent = '×';
	closeIcon.classList.add('close');
	closeIcon.addEventListener('click', function() {
		body.style.transform = 'translateY(-' + feedback.offsetHeight + 'px)';
	});

	feedback.appendChild(closeIcon);
}

// Sets periods for a correct thousands-notation
priceInputs.forEach(function(input) {
	input.addEventListener('input', function() {
		setPeriods(input, event.target.value);
	});
})

// Service worker registration
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