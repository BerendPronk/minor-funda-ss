var storage = (function() {
	var interestsList = document.querySelector('#interests');
	var favoritesList = document.querySelector('#favorites');
	var favControlBlock = document.querySelector('#favorieten .btn-block');
	var noFavorites = document.querySelector('#noFavorites');

	// Toggles DOM Elements to provice user with feedback
	var init = function() {
		if (localStorage.favoritesID) {
			favControls(true);
		} else {
			favControls(false);
		}
	};

	// Checks if result is already in favorites
	var check = function(id) {
		if (localStorage.favoritesID) {
			return utils.checkArray(id, favorites.id()) != -1;
		}
	};

	// Sets item in favorites
	var set = function(itemType, item) {
		// Toggles item in favorites
		if (item.checked) {
			favControls(true);

			// Checks if favorites list exists
			if (localStorage.favoritesID && (utils.checkArray(item.id, favorites.id()) === -1)) {
				var currentFavType = localStorage.favoritesType;
				var currentFavID = localStorage.favoritesID;

				localStorage.favoritesType = currentFavType + ',' + itemType;
				localStorage.favoritesID = currentFavID + ',' + item.id;
			} else {
				localStorage.favoritesType = itemType;
				localStorage.favoritesID = item.id;
			}
		} else {
			storage.remove(item.id);
		}
	};

	// Removes item from favorites
	var remove = function(id) {
		if (utils.checkArray(id, favorites.id()) != -1) {
			var newTypeStorage = favorites.type();
			var newIDStorage = favorites.id();

			// Removes selected item from localStorage
			newTypeStorage.splice(utils.checkArray(id, favorites.id()), 1);
			newIDStorage.splice(utils.checkArray(id, favorites.type()), 1);

			localStorage.favoritesType = newTypeStorage.join(',');
			localStorage.favoritesID = newIDStorage.join(',');
		}

		// Flushes favorite storage if localStorage string is empty
		if (localStorage.favoritesID == '') {
			clear();
			return false;
		}

		// Clears list before new input comes in
		utils.clearList(favoritesList);

		// Checks if favorites are empty
		if (favorites.id().length === 0) {
			favControls(false);
		}
	};

	// Removes every favorite
	var clear = function() {
		var hearts = document.querySelectorAll('.fav');

		localStorage.clear();

		interestsList.classList.add('hidden');
		utils.clearList(favoritesList);

		favControls(false);

		// Switches checkbox of set favorites to false
		utils.convertToArray(hearts).map(function(checkbox) {
			checkbox.checked = false;
		});
	};

	// Toggles DOM Elements to provide user with feedback
	var favControls = function(state) {
		if (state === true) {
			favControlBlock.classList.remove('hidden');
			noFavorites.classList.add('hidden');
		} else {
			favControlBlock.classList.add('hidden');
			noFavorites.classList.remove('hidden');
		}
	}

	// Returns array of favorites string
	var favorites = {
		type: function() {
			return localStorage.favoritesType.split(',');
		},

		id: function() {
			return localStorage.favoritesID.split(',');
		}
	};

	var filters = function(item) {
		// Object containing values that can be filtered with
		var opt = {
			buyPrice: function() {
				if (item.Koopprijs && !item.Huurprijs) {
					return item.Koopprijs;
				} else {
					return null;
				}
			},
			rentPrice: function() {
				if (item.Huurprijs && !item.Koopprijs) {
					return item.Huurprijs;
				} else {
					return null;
				}
			},
			area: item.WoonOppervlakte,
			rooms: item.AantalKamers
		};

		var filterTypes = ['area', 'rooms', 'buyPrice', 'rentPrice'];
		var filterValues = [opt.area, opt.rooms, opt.buyPrice(), opt.rentPrice()];

		var newTypes = '';
		var newValues = '';

		filterTypes.map(function(type, index) {
			if (newTypes.length !== 0) {
				newTypes += ',' + type;
				newValues += ',' + filterValues[index];
			} else {
				newTypes = type;
				newValues = filterValues[index];
			}
		});

		if (localStorage.filterTypes) {
			localStorage.filterTypes += ',' + newTypes;
			localStorage.filterValues += ',' + newValues;
		} else {
			localStorage.filterTypes = newTypes;
			localStorage.filterValues = newValues;
		}
	};

	return {
		init: init,
		check: check,
		set: set,
		remove: remove,
		clear: clear,
		favorites: favorites,
		filters: filters
	};

}) ();
