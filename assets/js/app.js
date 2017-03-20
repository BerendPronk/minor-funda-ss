var app = (function() {
	var init = function(data) {
		template.render.pages();
		router.init(template.navigation);
		search.init();
		storage.init();
	};

	return {
		init: init
	};

})();

app.init(config);
