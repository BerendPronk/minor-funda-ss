(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Asynchronous loading of stylesheets

/*
	Source: Martin Wolf
	(https://martinwolf.org/blog/2014/12/load-css-asynchronously-with-loadcss)
*/
module.exports = function(href, before, media){
    var ss = window.document.createElement('link');
    var ref = before || window.document.getElementsByTagName('script')[0];
    var sheets = window.document.styleSheets;
    ss.rel =  'stylesheet';
    ss.href = href;
    ss.media = 'only x';
    ref.parentNode.insertBefore(ss, ref);
    function toggleMedia() {
        var defined;
        for (var i = 0; i < sheets.length; i++) {
            if (sheets[i].href && sheets[i].href.indexOf(href) > -1) {
                defined = true;
            }
        }
        if (defined) {
            ss.media = media || 'all';
        }
        else {
            setTimeout(toggleMedia);
        }
    }
    toggleMedia();
    return ss;
}
},{}],2:[function(require,module,exports){
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
},{"./loadcss.js":1,"./setperiods.js":3}],3:[function(require,module,exports){
// Sets periods for a correct thousands-notation

module.exports = function(input, value) {
	var numbers = value.split("").reverse();
	var periods = [];

	for (var index = 1; index <= numbers.length; index++) {
		periods.push(numbers[index - 1]);
		if (index % 3 === 0 && index != numbers.length) {
			periods.push('.');
		}
	}

	var val = periods.reverse().join("");
	input.parentNode.setAttribute('period-value', val);
};

},{}]},{},[2]);
