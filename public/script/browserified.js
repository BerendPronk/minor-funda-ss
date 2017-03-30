(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
var loadCSS = require('./loadcss.js');

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

var stylesheet = loadCSS('/static/style/main.min.css');
},{"./loadcss.js":1}]},{},[2]);
