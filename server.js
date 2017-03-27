'use strict';

var path = require('path');
var request = require('request');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var myConnection = require('express-myconnection');
var session = require('express-session');
var express = require('express');
var app = express();

require('dotenv').config();

var apiKey = process.env.FUNDA_API_KEY;

if (!apiKey) {
    throw new Error('No `FUNDA_API_KEY` found in .env');
}

// Makes it possible to server static files assets
app.use('/static', express.static(path.join(__dirname, 'public')))

// Body parsing middleware
app.use(bodyParser.urlencoded({extended: true}))

// Creates a connection to MySQL database
app.use(myConnection(mysql, {
    host: '127.0.0.1',
    user: 'root',
    password: '!1MeoW0)',
    database: 'funda-ss',
    port: 3306
}, 'single'))

// Session that makes it able for the user to stay logged in
app.use(session({
    secret: 'qwsawedserfdrtgftyhgyujhuikjiolk',
    saveUninitialized: true,
    resave: false
}))

// Route for index.html
app.get('/', function(req, res) {

    if (req.session.username) {
        console.log('logged in as: ' + req.session.username)
    }

    // Makes a request to the funda API
    request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/limmen/&type=koop&pagesize=24', function (error, response, body) {
        respond(res, {
            page: 'splash',
            data: response
        });
    });
})

// Routes for register
app
    .get('/user/register', function(req, res) {
        respond(res, {
            page: 'user/register'
        });
    })
    .post('/user/register', function(req, res) {
        req.getConnection(function(err, connection) {


            connection.query('SELECT * FROM users', function(err, result) {
                console.log(result);
            })

            var data = {
                username: req.body.username,
                password: req.body.password
            }
            var passwordCopy = req.body.passwordcopy;

            connection.query('SELECT * FROM users WHERE username = ?', [data.username], function(err, result) {
                if (result.length > 0) {
                    console.log('username already exists')
                    res.redirect('/user/register');
                } else {
                    if (data.password === passwordCopy) {
                        if (data.username !== '' && data.password !== '') {
                            connection.query('INSERT INTO users SET ?', [data], function(err, result) {
                                console.log('Register successful!');
                                res.redirect('/');
                            });
                        } else {
                            console.log('Please fill in every input')
                            res.redirect('/user/register');
                        }
                    } else {
                        console.log('Passwords do not match!');
                        res.redirect('/user/register');
                    }
                }
            });
        });
    })

// Routes for login
app
    .get('/user/login', function(req, res) {
            respond(res, {
                page: 'user/login'
            });
        })
    app.post('/user/login', function(req, res) {
        req.getConnection(function(err, connection) {
            var data = {
                username: req.body.username,
                password: req.body.password
            }

            connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [data.username, data.password], function(err, result) {
                if (result.length > 0) {
                    // Set username as a session
                    req.session.username = result[0].username;
                    req.session.save();

                    console.log('Login successful');
                    res.redirect('/');
                } else {
                    console.log('Wrong username or password given');
                    res.redirect('/user/login');
                }
            });
        });
    })

// Route for results
app.get('/results/*', function(req, res) {
    // Makes a request to the funda API
    request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/' + req.query.zo + '/&type=' + req.query.type + '&pagesize=25', function (error, response, body) {
        respond(res, {
            page: 'results',
            data: response
        });
    });
})

// Routes for favourites
app
    .get('/favorites', function(req, res) {
        /*
            MySQL Connection to favorites table
        */
    })
    .get('/favorites/add/:id', function(req, res) {
        // Checks if user is logged in
        if (req.session.username) {
            req.getConnection(function(err, connection) {

                // Connects to database to check if item is already in favorites
                connection.query('SELECT * FROM favorites WHERE favorite_ID = ?', [req.params.id], function(err, result) {
                    if (result.length === 0) {
                        connection.query('INSERT INTO favorites (user_ID, favorite_ID) VALUES ((SELECT ID FROM users WHERE username = ?), ?)', [req.session.username, req.params.id], function(err, result) {
                            console.log('Successfully added favorite!');
                            res.redirect('/');
                        });
                    } else {
                        console.log('Already in favorites');
                    }
                });
            });
        } else {
            console.log('You need to be logged in first');
            res.redirect('/user/login');
        }
    });

// Route for detail page
app.get('/detail/:type/:id', function(req, res) {
    // Makes a request to the funda API
    request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + req.params.type + '/' + req.params.id + '/', function (error, response, body) {
        respond(res, {
            page: 'detail',
            data: response
        });
    });
});

// Renders HTML skeleton
function respond(res, settings, err) {
    function getSplash() {
        if (settings.page === 'splash') {
            return 'class="splash"';
        }
    }

    res.set('Content-Type', 'text/html');
    res.end([
        '<!doctype html>',
        '<html lang="nl">',
            '<head>',
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width">',
                '<meta name="theme-color" content="#70cdf5">',
                '<title>Funda SPA Prototype</title>',
                '<link rel="icon" type="image/ico" href="/static/img/favicon.ico">',
                '<link rel="apple-touch-icon" sizes="256x256" href="/static/img/apple-touch-icon.png">',
                '<link rel="manifest" href="/static/manifest.json">',
                '<link rel="import" href="/static/components/funda-logo.html" />',
                '<link rel="stylesheet" href="/static/style/main.css">',
                '<script src="/static/script/main.js" defer></script>',
            '</head>',
            '<header ' + getSplash() + '>',
                '<section class="top">',
                    '<funda-logo></funda-logo>',
                    '<nav class="user-nav">',
                        '<ul>',
                            '<li><a href="/user/register">Registreer</a></li>',
                            '<li><a href="/user/login">Login</a></li>',
                        '</ul>',
                    '</nav>',
                '</section>',
                '<form method="GET" action="/results/?type&zo">',
                    '<fieldset>',
                        '<label for="search">Zoek woningen</label>',
                        '<input id="search" name="zo" type="text" placeholder="Plaats, buurt, adres, et cetera">',
                        '<ul id="suggestions"></ul>',
                    '</fieldset>',
                    '<!-- section, because flexbox doesn\'t work on fieldsets -->',
                    '<section id="filter">',
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
                        '<section class="filter-price">',
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
                    '</section>',
                    '<fieldset>',
                        '<button id="submit">Verzenden</button>',
                    '</fieldset>',
                '</form>',
                '<nav class="page-nav">',
                    '<ul>',
                        '<li><a href="/results/">Resultaten</a></li>',
                        '<li><a href="/favorites/">Favorieten</a></li>',
                    '</ul>',
                '</nav>',
            '</header>',
            renderReqPage(settings.page, settings.data),
        '</body>',
        '</html>',
        ''
    ].join('\n')); // join on every new line
};

// Renders page underneath header based on input
function renderReqPage(page, data) {
    switch (page) {
        case 'splash':
            return renderMosaic(data);
        break;
        case 'user/register':
            return renderUserPage('register');
        break;
        case 'user/login':
            return renderUserPage('login');
        break;
        case 'results':
            return renderResults(data);
        break;
        case 'favorites':
            return renderFavorites();
        break;
        case 'detail':
            return renderDetail(data);
        break;
    }
}

// Renders user-related page based on input
function renderUserPage(type) {
    switch (type) {
        case 'register':
            return [
                '<section>',
                    '<h2>Registreren</h2>',
                    '<form method="post" action="/user/register">',
                        '<fieldset>',
                            '<label>',
                                'Gebruikersnaam',
                                '<input type="text" name="username">',
                            '</label>',
                            '<label>',
                                'Wachtwoord',
                                '<input type="password" name="password">',
                            '</label>',
                            '<label>',
                                'Herhaal wachtwoord',
                                '<input type="password" name="passwordcopy">',
                            '</label>',
                            '<input type="submit">',
                        '</fieldset>',
                        '<fieldset>',
                            '<p>Al een account? <a href="/user/login">Log in</a>!</p>',
                        '</fieldset>',
                    '</form>',
                '</section>'
            ].join('\n');
        break;
        case 'login':
            return [
                '<section>',
                    '<h2>Inloggen</h2>',
                    '<form method="post" action="/user/login">',
                        '<fieldset>',
                            '<label>',
                                'Gebruikersnaam',
                                '<input type="text" name="username">',
                            '</label>',
                            '<label>',
                                'Wachtwoord',
                                '<input type="password" name="password">',
                            '</label>',
                            '<input type="submit">',
                        '</fieldset>',
                        '<fieldset>',
                            '<p>Nog geen account? <a href="/user/register">Registreer</a>!</p>',
                        '</fieldset>',
                    '</form>',
                '</section>'
            ].join('\n');
        break;
    }
}

// Renders result-page if there are any results from the request
function renderResults(data) {
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

            // Checks if the house is for sale or for rent
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
                    '<a href="/favorites/add/' + result.Id + '" class="fav-label"></a>',
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
            '<section>',
                '<h2>Resultaten</h2>',
                '<p id="resultAmount">RESTYLEN + CORRECT DATA</p>',
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
            '<section>',
                '<h2>Resultaten</h2>',
                '<p>',
                    'Er zijn geen resultaten gevonden.',
                '</p>',
            '</section>',
        ].join('\n');
    }
}

// Renders detail page if there is any data to render one
function renderDetail(data) {
    if (data) {
        var result = JSON.parse(data.body);

        // Object containing properties and methods used to render detail page
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

        // Renders breadcrumbs as navigation
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
            '<section>',
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
            '<section>',
                '<h2>Details</h2>',
                '<p>',
                    'Voor dit resultaat zijn geen gegevens bekend.',
                '</p>',
            '</section>',
        ].join('\n');
    }
}

// Renders favourites if the user has saved any
function renderFavorites() {

    /*
        Favorites from db!
    */

    return [
        '<section>',
            '<h2></h2>',
            '<section class="btn-block">',
                '<button id="clearFavButton"></button>',
            '</section>',
            '<ul id="favorites"></ul>',
            '<p id="noFavorites"></p>',
        '</section>',
    ].join('\n');
}

// Renders mosaic for the index page if request responded with any data
function renderMosaic(data) {
    if (data) {
        var results = JSON.parse(data.body).Objects;

        var getTiles = function() {
            var tileList = [];

            results.map(function(tile) {
                tileList.push([
                    '<li>',
                        '<img src="' + tile.FotoMedium + '">',
                    '</li>'
                ].join('\n'));
            });

            return tileList.join('\n');
        };

        return [
            '<footer role="presentation" class="splash">',
                '<ul id="mosaic">',
                    getTiles(),
                '</ul>',
            '</footer>',
        ].join('\n');
    } else {
        return '';
    }
}

// Utility function to create the thousands-notation for the sales/rental prices
function numberWithPeriods(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Serves the application on port 2000
app.listen(2000, function() {
    console.log('App started!');
});
