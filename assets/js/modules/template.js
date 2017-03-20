var template = (function() {
	// Array of data that will be used as input for the rendering of the application
	var data = [
		{
			template: 'detail',
			title: 'Over de woning'
		},
		{
			template: 'resultaten',
			title: 'Resultaten',
			noResults: 'Geen resultaten gevonden.'
		},
		{
			template: 'favorieten',
			title: 'Favoriete woningen',
			clearFavButton: 'Verwijder alles',
			noFavorites: 'Je hebt geen favorieten toegevoegd.'
		}
	];

	// Stores every page-title, set as template, in an array
	var navigation = data.map(function(page) {
		return page.template;
	});

	var render = {
		// Renders content on pages
		pages: function(pagelist) {
			// Renders menu with navigation links
			render.menu(navigation);

			// Render favorites page if user has added any favorites
			if (localStorage.favoritesID) {
				search.get.favorites(storage.favorites.type(), storage.favorites.id());
			}

			data.map(function(page) {
				var section = document.querySelector('#' + page.template);

				switch (page.template) {
					case 'resultaten':
						section.querySelector('h2').textContent = page.title;
						section.querySelector('#noResults').textContent = page.noResults;
					break;

					case 'favorieten':
						section.querySelector('h2').textContent = page.title;
						section.querySelector('#noFavorites').textContent = page.noFavorites;
						section.querySelector('#clearFavButton').textContent = page.clearFavButton;
						section.querySelector('#clearFavButton').addEventListener('click', function() {
							// Removes all favorites
							storage.clear();
						});
					break;
				}
			});
		},

		// Renders list-item for each result given in parameter
		result: function(list, results) {
			var resultList = document.querySelector(list);

			// Clear list before adding data, except for the favorites list
			if (list !== '#favorites') {
				utils.clearList(resultList);
			}

			results.map(function(result) {
				var resultBlock = document.createElement('li');

				var img = document.createElement('img');
				var fav = document.createElement('input');
				var favLabel = document.createElement('label');
				var address = document.createElement('h3');
				var addressLink = document.createElement('a');
				var zipCity = document.createElement('p');
				var price = document.createElement('p');
				var area = document.createElement('p');
				var added = document.createElement('span');

				var data = {
					type: function() {
						if (result.Prijs.Koopprijs) {
							return 'koop';
						} else {
							return 'huur';
						}
					},
					address: result.Adres,
					price: function() {
						if (result.Prijs.Koopprijs && !result.Prijs.Huurprijs) {
							return '<strong>€ ' + utils.numberWithPeriods(result.Prijs.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
						} else {
							return '<strong>€ ' + utils.numberWithPeriods(result.Prijs.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
						}
					},
					added: result.AangebodenSindsTekst
				};

				// Sets data object properties for multiple request possibilities
				if (list === '#favorites') {
					data.id = result.InternalId;
					data.img = result.HoofdFoto;
					data.zipCity = result.Postcode + ', ' + result.Plaats
					data.area = function() {
						if (result.PerceelOppervlakte) {
							return result.WoonOppervlakte + 'm² / ' + result.PerceelOppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
						} else {
							return result.WoonOppervlakte + 'm² ' + ' • ' + result.AantalKamers + ' kamers';
						}
					};
				} else {
					data.id = result.Id;
					data.img = result.FotoLarge;
					data.zipCity = result.Postcode + ', ' + result.Woonplaats;
					data.area = function() {
						if (result.Perceeloppervlakte) {
							return result.Woonoppervlakte + 'm² / ' + result.Perceeloppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
						} else {
							return result.Woonoppervlakte + 'm² ' + ' • ' + result.AantalKamers + ' kamers';
						}
					};
				}

				// Sets content and interaction for new elements
				img.src = data.img;
				img.alt = 'Foto van ' + data.address;

				fav.type = 'checkbox';
				fav.id = data.id;
				fav.className = 'fav';
				fav.checked = storage.check(data.id);
				fav.addEventListener('change', function() {
					// Set item in local storage
					storage.set(data.type(), this);

					// Sets item on favorites page
					if (localStorage.favoritesID) {
						search.get.favorites(storage.favorites.type(), storage.favorites.id());
					}
				});
				favLabel.setAttribute('for', data.id);
				favLabel.className = 'fav-label';

				addressLink.setAttribute('data-id', data.id);
				addressLink.href = '#'; // Set empty link, for functionality without navigating
				addressLink.textContent = data.address;
				addressLink.addEventListener('click', function() {
					// Sets breadcrumbs for detail-pages
					if (list === '#favorites') {
						search.get.breadCrumbs('favorieten', data.address);
					}
					else {
						search.get.breadCrumbs('resultaten', data.address);
					}

					// Sets detail data and navigates to detail page
					search.get.details(data.type(), data.id);
				});
				address.appendChild(addressLink);

				zipCity.textContent = data.zipCity;

				price.insertAdjacentHTML('afterbegin', data.price());

				area.textContent = data.area();

				added.insertAdjacentHTML('afterbegin', data.added);

				// Appends new elements to each result
				resultBlock.appendChild(img);
				resultBlock.appendChild(fav);
				resultBlock.appendChild(favLabel);
				resultBlock.appendChild(address);
				resultBlock.appendChild(zipCity);
				resultBlock.appendChild(price);
				resultBlock.appendChild(area);
				resultBlock.appendChild(added);

				// Appends content to list items
				resultList.appendChild(resultBlock);
			});
		},

		// Renders content for detail page
		detail: function(data) {
			var detailPage = document.querySelector('#detail');
			var title = detailPage.querySelector('h2');
			var subTitle = detailPage.querySelector('h3');
			var img = detailPage.querySelector('img');
			var fav = detailPage.querySelector('input');
			var favLabel = detailPage.querySelector('label');
			var price = detailPage.querySelector('#detailPrice');
			var desc = detailPage.querySelector('article');

			var detail = {
				id: data.InternalId,
				address: data.Adres,
				zipCity: data.Postcode + ', ' + data.Plaats,
				img: data.HoofdFoto,
				type: function() {
					if (data.Koopprijs && !data.Huurprijs) {
						return 'koop';
					} else {
						return 'huur';
					}
				},
				price: function() {
					if (data.Koopprijs && !data.Huurprijs) {
						return '<strong>€ ' + utils.numberWithPeriods(data.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
					} else {
						return '<strong>€ ' + utils.numberWithPeriods(data.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
					}
				},
				text: function() {
					return {
						paragraphs: data.VolledigeOmschrijving.split('\n')
					};
				}
			};

			title.textContent = detail.address;

			subTitle.textContent = detail.zipCity;

			img.src = data.HoofdFoto;
			img.alt = 'Foto van ' + detail.address;

			fav.type = 'checkbox';
			fav.id = detail.id;
			fav.className = 'fav';
			fav.checked = storage.check(detail.id);
			fav.addEventListener('change', function() {
				// Set item in local storage
				storage.set(detail.type(), this);

				// Sets item on favorites page
				if (localStorage.favoritesID) {
					search.get.favorites(storage.favorites.type(), storage.favorites.id());
				}
			});
			favLabel.setAttribute('for', detail.id);
			favLabel.className = 'fav-label';

			// Clears HTML before rendering new
			price.innerHTML = '';
			price.insertAdjacentHTML('afterbegin', detail.price());

			detail.text().paragraphs.map(function(paragraph) {
				var p = document.createElement('p');
				p.textContent = paragraph;

				desc.appendChild(p);
			});
		},

		// Renders menu based on data array with content declarations
		menu: function(pagelist) {
			var nav = document.querySelector('nav');
			var ul = document.createElement('ul');

			pagelist.map(function(link) {
				var li = document.createElement('li');
				var anchor = document.createElement('a');

				// Early exit to prevent detail-page from being rendered in the navigation
				if (link === 'detail') {
					return false;
				}

				// Set empty link, for functionality without navigating
				anchor.href = '#';

				anchor.textContent = link;
				anchor.setAttribute('data-anchor', link);
				anchor.setAttribute('role', 'link');

				anchor.addEventListener('click', function() {
					router.navigate(link);
				});

				li.appendChild(anchor);
				ul.appendChild(li);
				nav.appendChild(ul);
			});
		},

		// Renders mosaic for homepage
		mosaic: function() {
			var city = 'limmen';
			utils.request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + config.apiKey + '/?type=koop&zo=/' + city + '/&page=' + 1 + '&pagesize=' + 24,
				function(data) {
					var results = data.Objects;
					var mosaic = document.querySelector('#mosaic');

					results.map(function(result) {
						var tile = document.createElement('li');
						var photo = document.createElement('img');

						photo.src = result.FotoMedium;

						tile.appendChild(photo);
						mosaic.appendChild(tile);
					});
				});
		}
	};

	return {
		navigation: navigation,
		render: render
	};

}) ();
