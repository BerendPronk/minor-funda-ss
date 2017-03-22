'use strict';

var path = require('path');
var request = require('request');
var express = require('express');
var app = express();

require('dotenv').config();

var apiKey = process.env.FUNDA_API_KEY;

if (!apiKey) {
    throw new Error('No `FUNDA_API_KEY` found in .env');
}

var splash;

app
    .use('/static', express.static(path.join(__dirname, 'public')))
    .get('/', function(req, res) {
        getSplash(true);
        respond(res, {
            page: 'splash'
        });
    })
    .get('/results/*', function(req, res) {
        getSplash(false);
        // Makes a request to the funda API
        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/' + req.query.zo + '/&type=' + req.query.type + '&pagesize=25', function (error, response, body) {
            respond(res, {
                page: 'results',
                data: response
            });
        });
    })
    .get('/detail/:type/:id', function(req, res) {
        getSplash(false);

        // Makes a request to the funda API
        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + req.params.type + '/' + req.params.id + '/', function (error, response, body) {
            respond(res, {
                page: 'detail',
                data: response
            });
        });
    });

function respond(res, settings, err) {
    res.set('Content-Type', 'text/html');
    res.end([
        '<!doctype html>',
        '<html lang="nl">',
            '<head>',
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width">',
                '<title>Funda SPA Prototype</title>',
                '<link rel="import" href="/static/components/funda-logo.html" />',
                '<script src="https://use.typekit.net/pnh6wsp.js"></script>',
                '<script>try{Typekit.load({ async: true });}catch(e){}</script>',
                '<link rel="stylesheet" type="text/css" href="/static/style/main.css">',
            '</head>',
            '<header ' + splash + '>',
                    '<section>',
                        '<funda-logo></funda-logo>',
                        '<span id="feedback"></span>',
                    '</section>',
                    '<form method="GET" action="/results/?type&zo">',
                            '<fieldset>',
                                '<label for="search">Zoek woningen</label>',
                                '<input id="search" name="zo" type="text" placeholder="Plaats, buurt, adres, et cetera">',
                                '<ul id="suggestions"></ul>',
                            '</fieldset>',
                            '<fieldset id="filter">',
                                '<section class="filter-main">',
                                    '<section class="filter-radio">',
                                        '<input id="filterTypeBuy" type="radio" name="type" value="koop" checked>',
                                        '<label for="filterTypeBuy" data-input="radio">',
                                            'Koop',
                                        '</label>',
                                        '<input id="filterTypeRent" type="radio" name="type" value="huur">',
                                        '<label for="filterTypeRent"  data-input="radio">',
                                            'Huur',
                                        '</label>',
                                    '</section>',
                                    '<input id="filterToggle" type="checkbox">',
                                    '<label for="filterToggle" data-input="checkbox">',
                                        'Prijs',
                                    '</label>',
                                '</section>',
                                '<section class="filter-advanced">',
                                    '<section class="filter-text">',
                                        '<label for="filterPriceFrom">Prijs van</label>',
                                        '<section class="filter-text-input">',
                                            '<input id="filterPriceFrom" type="number" step="1000">',
                                        '</section>',
                                    '</section>',
                                    '<section class="filter-text">',
                                            '<label for="filterPriceTo">Prijs tot</label>',
                                            '<section class="filter-text-input">',
                                                '<input id="filterPriceTo" type="number" step="1000">',
                                            '</section>',
                                    '</section>',
                                '</section>',
                            '</fieldset>',
                            '<fieldset>',
                                '<button id="submit">Verzenden</button>',
                            '</fieldset>',
                    '</form>',
                '<nav></nav>',
            '</header>',
            getReqPage(settings.page, settings.data),
            '<footer role="presentation"' + splash + '>',
                getMosaic(),
            '</footer>',
        '</body>',
        '</html>',
        ''
    ].join('\n')); // join on every new line
};

function getSplash(state) {
    if (state !== false) {
        splash = 'class="splash"';
    } else {
        splash = '';
    }
}

function getReqPage(page, data) {
    switch (page) {
        case 'results':
            return getResults(data);
        break;
        case 'detail':
            return getDetail(data);
        break;
    }
}

function getResults(data) {
    // Checks if there are results to be rendered
    if (data) {
        var results = JSON.parse(data.body).Objects;

        // Will contain the DOM-structure of every result
        var resultList = [];

        results.map(function(result) {
            // Gets buy / rental price
            function getPrice() {
                if (result.Prijs.Koopprijs && !result.Prijs.Huurprijs) {
                    return '<strong>€ ' + numberWithPeriods(result.Prijs.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
                } else {
                    return '<strong>€ ' + numberWithPeriods(result.Prijs.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
                }
            }

            // Checks if property-area should be included
            function getArea() {
                if (result.Perceeloppervlakte) {
                    return result.Woonoppervlakte + 'm² / ' + result.Perceeloppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
                } else {
                    return result.Woonoppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
                }
            }

            function getType() {
                if (result.Koopprijs && !result.Huurprijs) {
                    return 'koop';
                } else {
                    return 'huur';
                }
            }

            // Pushes DOM-structure to resultList
            resultList.push([
                '<li>',
                    '<img src="' + result.FotoLarge + '" alt="Foto van ' + result.Adres + '">',
                    '<input type="checkbox" id="' + result.Id + '" class="fav">',
                    '<label for="' + result.Id + '" class="fav-label"></label>',
                    '<h3>',
                        '<a data-id="' + result.Id + '" href="/detail/' + getType() + '/' + result.Id + '">' + result.Adres + '</a>',
                    '</h3>',
                    '<p>' + result.Postcode + ', ' + result.Woonplaats + '</p>',
                    '<p>' + getPrice() + '</p>',
                    '<p>' + getArea() + '</p>',
                    '<span>' + result.AangebodenSindsTekst + '</span>',
                '</li>'
            ].join('\n')); // join on every new line
        });

        // Adds every result together, by joining the HTML on new lines
        var getList = function() {
            return resultList.join('\n');
        };

        // Returns entire result page with results
        return [
            '<section id="resultaten">',
                '<h2>Resultaten</h2>',
                '<p id="resultAmount">25 - 1894</p>',
                '<ul id="interests" class="hidden"></ul>',
                '<ul id="results">',
                    getList(),
                '</ul>',
                '<p id="noResults"></p>',
            '</section>'
            ].join('\n');
    } else {
        // Returns entire result page without any results
        return [
            '<section id="resultaten">',
                '<h2>Resultaten</h2>',
                '<p>',
                    'Er zijn geen resultaten gevonden.',
                '</p>',
            '</section>',
        ].join('\n');
    }
}

function getDetail(data) {

    if (data) {
        var result = JSON.parse(data.body);

        var detail = {
            id: result.InternalId,
            address: result.Adres,
            zipCity: result.Postcode + ', ' + result.Plaats,
            img: result.HoofdFoto,
            type: function() {
                if (result.Koopprijs && !result.Huurprijs) {
                    return 'koop';
                } else {
                    return 'huur';
                }
            },
            price: function() {
                if (result.Koopprijs && !result.Huurprijs) {
                    return '<strong>€ ' + numberWithPeriods(result.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
                } else {
                    return '<strong>€ ' + numberWithPeriods(result.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
                }
            },
            text: {
                paragraphs: result.VolledigeOmschrijving.split('\n'),
                combined: function() {
                    var total = '';

                    detail.text.paragraphs.map(function(paragraph) {
                        total += '<p>' + paragraph + '</p>';
                    });

                    return total;
                }
            }
        };

        function getBreadcrumbs() {
            return [
                '<li>',
                    '<a href="javascript:history.back()">',
                        'Resultaten',
                    '</a>',
                '</li>',
                '<li>',
                    detail.address,
                '</li>'
            ].join('\n');;
        }

        return [
            '<section id="detail">',
                '<ul id="breadcrumbs">',
                    getBreadcrumbs(),
                '</ul>',
                '<h2>' + detail.address + '</h2>',
                '<h3>' + detail.zipCity + '</h3>',
                '<section class="img-block">',
                    '<img src="' + detail.img + '" alt="Foto van ' + detail.address + '">',
                    '<input id="' + detail.id + '" type="checkbox" class="fav">',
                    '<label for="' + detail.id + '" class="fav-label"></label>',
                    '<p id="detailPrice">' + detail.price() + '</p>',
                '</section>',
                '<article>',
                    detail.text.combined(),
                '</article>',
            '</section>',
        ].join('\n');
    } else {
        return [
            '<section id="detail">',
                '<h2>Details</h2>',
                '<p>',
                    'Voor dit resultaat zijn geen gegevens bekend.',
                '</p>',
            '</section>',
        ].join('\n');
    }
}

function getFavorites(data) {

    /*
        Favorites from cache!
    */

    return [
        '<section id="favorieten">',
            '<h2></h2>',
            '<section class="btn-block">',
                '<button id="clearFavButton"></button>',
            '</section>',
            '<ul id="favorites"></ul>',
            '<p id="noFavorites"></p>',
        '</section>',
    ].join('\n');
}

function getMosaic() {

    var getTiles = function() {
        var tileList = [];

        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=//&type=koop&pagesize=24', function (error, response, body) {
            var results = JSON.parse(response.body).Objects;

            results.map(function(tile) {
                tileList.push([
                    '<li>',
                        '<img src="' + tile.FotoMedium + '>',
                    '</li>'
                ].join('\n'));
            });
        });

        return tileList.join('\n');
    };

    return [
        '<ul id="mosaic">',
            getTiles(),
        '</ul>'
    ].join('\n');
}

function numberWithPeriods(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

app.listen(2000, function() {
    console.log('App started!');
});
