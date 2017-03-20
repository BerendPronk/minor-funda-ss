var utils = (function() {
	// Sets splash screen if parameter is set to true
	var splashScreen = function(state) {
		var splashSections = ['header', 'footer'];
		splashSections.map(function(section) {
			var element = document.querySelector(section);

			if (state === true) {
				// Renders mosaic background
				template.render.mosaic(template.navigation);

				element.classList.add('splash');
			} else {
				element.classList.remove('splash');
			}
		});
	};

	// Makes an API-request with fetch
	var request = function(url, callback) {
		fetch(url)
			.then(function(response) {
				if (response.status !== 200) {
					console.error('There was an error with status code: ' + response.status);
					return;
				}

				// Examine the text in the response
				response.json().then(function(data) {
					callback(data);
				});
			})
			.catch(function(err) {
				console.error('Fetch Error: ', err);
			});
	};

	// JSONP request for CORS API-requests
	var JSONP = (function() {
		var send = function(url, settings) {
			var head = document.querySelector('head');
			var timeoutTrigger = window.setTimeout(function() {
				settings.onTimeout();
			}, settings.timeout);

			window['callback'] = function(data){
				window.clearTimeout(timeoutTrigger);
				settings.onSuccess(data);
			}

			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = true;
			script.src = url;
			head.appendChild(script);
		}

		return {
			send: send
		};

	}) ();

	// Checks index of item in chosen array
	var checkArray = function(item, arr) {
		return arr.indexOf(item);
	};

	// Converts nodelist to array
	var convertToArray = function(arr) {
		return Array.prototype.slice.call(arr);
	};

	// Removes every child of selected element
	var clearList = function(list) {
		while (list.firstChild) {
			list.removeChild(list.firstChild);
		}
	};

	// Converts number to thousand notation
	var numberWithPeriods = function(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	};

	// Sets periods on number input
	var setPeriods = function(input, value) {
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

	// Provides user with feedback
	var feedback = function(msg, state) {
		var label = document.querySelector('#feedback');

		label.textContent = msg;
		label.className = '';
		label.classList.add(state);
		label.classList.add('active');

		setTimeout(function() {
			label.classList.remove('active');
		}, 2500);
	};

	return {
		splashScreen: splashScreen,
		request: request,
		JSONP: JSONP,
		checkArray: checkArray,
		convertToArray: convertToArray,
		clearList: clearList,
		numberWithPeriods: numberWithPeriods,
		setPeriods: setPeriods,
		feedback: feedback
	};

}) ();
