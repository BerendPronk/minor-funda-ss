'use strict';

var path = require('path');
var request = require('request');
var express = require('express');
var app = express();

require('dotenv').config();

var key = process.env.FUNDA_API_KEY;

if (!key) {
    throw new Error('No `FUNDA_API_KEY` found in .env');
}

app
    .use('/static', express.static(path.join(__dirname, 'public')))
    .get('/', function(req, res) {
        respond(res);
    })
    .get('/results/', function(req, res) {
        // Makes a request to the funda API
        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + key + '/?zo=/' + req.query.zo + '/&type=' + req.query.type + '&pagesize=25', function (error, response, body) {
            respond(res, response);
        });
    });

var respond = function(res, data, err) {
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
            '<header>',
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
            '<ul id="pages">',
                getDetail(data),
                getResults(data),
                getFavorites(data),
            '</ul>',
            '<footer role="presentation">',
                '<ul id="mosaic"></ul>',
            '</footer>',
        '</body>',
        '</html>',
        ''
    ].join('\n')); // join on every new line
};

var getResults = function(data) {
    // Checks if there are results to be rendered
    if (data) {
        var results = JSON.parse(data.body).Objects;

        // Will contain the DOM-structure of every result
        var resultList = [];

        results.map(function(result) {
            var numberWithPeriods = function(number) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            };

            // Gets buy / rental price
            var getPrice = function() {
                if (result.Prijs.Koopprijs && !result.Prijs.Huurprijs) {
                    return '<strong>€ ' + numberWithPeriods(result.Prijs.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
                } else {
                    return '<strong>€ ' + numberWithPeriods(result.Prijs.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
                }
            };

            // Checks if property-area should be included
            var getArea = function() {
                if (result.Perceeloppervlakte) {
                    return result.Woonoppervlakte + 'm² / ' + result.Perceeloppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
                } else {
                    return result.Woonoppervlakte + 'm² • ' + result.AantalKamers + ' kamers';
                }
            };

            // Pushes DOM-structure to resultList
            resultList.push([
                '<li>',
                    '<img src="' + result.FotoLarge + '" alt="Foto van ' + result.Adres + '">',
                    '<input type="checkbox" id="' + result.Id + '" class="fav">',
                    '<label for="' + result.Id + '" class="fav-label"></label>',
                    '<h3>',
                        '<a data-id="' + result.Id + '" href="#">' + result.Adres + '</a>',
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
        '<li>',
            '<section id="resultaten">',
            '<h2>Resultaten</h2>',
            '<p id="resultAmount">25 - 1894</p>',
            '<ul id="interests" class="hidden"></ul>',
            '<ul id="results">',
                getList(),
            '</ul>',
            '<p id="noResults"></p>',
            '</section>',
        '</li>'].join('\n');
    } else {
        // Returns entire result page without any results
        return [
        '<li>',
            '<section id="resultaten">',
            '<h2>Resultaten</h2>',
            '<p>',
                "Er zijn geen resultaten gevonden.",
            '</p>',
            '</section>',
        '</li>'].join('\n');
    }
};

var getDetail = function(data) {

    /*
        New request when clicked on result
    */

    return [
        '<li>',
            '<section id="detail">',
                '<ul id="breadcrumbs"></ul>',
                '<h2></h2>',
                '<h3></h3>',
                '<section class="img-block">',
                '<img>',
                '<input>',
                '<label></label>',
                '<p id="detailPrice"></p>',
            '</section>',
            '<article></article>',
            '</section>',
        '</li>'
    ].join('\n');
};

var getFavorites = function(data) {

    /*
        Favorites from cache!
    */

    return [
        '<li>',
            '<section id="favorieten">',
                '<h2></h2>',
                '<section class="btn-block">',
                    '<button id="clearFavButton"></button>',
                '</section>',
                '<ul id="favorites"></ul>',
                '<p id="noFavorites"></p>',
            '</section>',
        '</li>'
    ].join('\n');
};

app.listen(2000, function() {
    console.log('App started!');
});