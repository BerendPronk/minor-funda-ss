var router = (function() {
	var init = function(pagelist) {
		// Sets splashscreen
		utils.splashScreen(true);

		// Navigates to result page
		navigate(pagelist[1]);
	};

	// Sets classes on page-switch
	var navigate = function(path) {
		var menulinks = utils.convertToArray(document.querySelectorAll('nav a'));
		var sectionList = document.querySelector('#pages');

		menulinks.map(function(anchor) {
			if (anchor.getAttribute('data-anchor') === path) {
				anchor.classList.add('current');
			} else {
				anchor.classList.remove('current');
			}
		});

		sectionList.className = path.toLowerCase();
	};

	return {
		init: init,
		navigate: navigate
	};

}) ();
