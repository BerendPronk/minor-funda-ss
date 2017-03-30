'use strict';

var compression = require('compression');
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
    throw new Error('No `FUNDA_API_KEY` found in .env, please contact me via berendpronk199@gmail.com');
}

// Compress the application via gzip
app.use(compression());

// Makes it possible to server static files assets
app.use('/static', express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(bodyParser.urlencoded({extended: true}));

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
    // Makes a request to the funda API
    request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/limmen/&type=koop&pagesize=24', function (error, response, body) {
        respond(res, {
            page: 'splash',
            session: req.session.username,
            data: response,
            feedback: {
                message: req.query.feedback,
                state: req.query.state
            }
        });
    });
})

// Routes for register
app
    .get('/user/register', function(req, res) {
        respond(res, {
            page: 'user/register',
            session: req.session.username,
            feedback: {
                message: req.query.feedback,
                state: req.query.state
            }
        });
    })
    .post('/user/register', function(req, res) {
        req.getConnection(function(err, connection) {
            var data = {
                username: req.body.username,
                password: req.body.password
            }
            var passwordCopy = req.body.passwordcopy;

            connection.query('SELECT * FROM users WHERE username = ?', [data.username], function(err, results) {
                if (results.length > 0) {
                    var feedback = {
                        message: encodeURIComponent('Deze gebruikersnaam bestaat al'),
                        state: encodeURIComponent('negative')
                    };
                    res.redirect('/user/register/?feedback=' + feedback.message + '&state=' + feedback.state);
                } else {
                    if (data.password === passwordCopy) {
                        if (data.username !== '' && data.password !== '') {
                            connection.query('INSERT INTO users SET ?', [data], function(err, results) {
                                var feedback = {
                                    message: encodeURIComponent('Geweldig! Je kunt nu inloggen'),
                                    state: encodeURIComponent('positive')
                                };
                                res.redirect('/user/login?feedback=' + feedback.message + '&state=' + feedback.state);
                            });
                        } else {
                            var feedback = {
                                message: encodeURIComponent('Vul alle velden in, alsjeblieft'),
                                state: encodeURIComponent('negative')
                            };
                            res.redirect('/user/register/?feedback=' + feedback.message + '&state=' + feedback.state);
                        }
                    } else {
                        var feedback = {
                            message: encodeURIComponent('Wachtwoorden komen niet overeen'),
                            state: encodeURIComponent('negative')
                        };
                        res.redirect('/user/register/?feedback=' + feedback.message + '&state=' + feedback.state);
                    }
                }
            });
        });
    })

// Routes for login
app
    .get('/user/login', function(req, res) {
            respond(res, {
                page: 'user/login',
                session: req.session.username,
                feedback: {
                    message: req.query.feedback,
                    state: req.query.state
                }
            });
        })
    .post('/user/login', function(req, res) {
        req.getConnection(function(err, connection) {
            var data = {
                username: req.body.username,
                password: req.body.password
            }

            // Checks if user exists
            connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [data.username, data.password], function(err, results) {
                if (results.length > 0) {
                    // Set username as a session
                    req.session.username = results[0].username;
                    req.session.save();

                    var feedback = {
                        message: encodeURIComponent('Welkom, ' + results[0].username + '!'),
                        state: encodeURIComponent('positive')
                    };
                    res.redirect('/?feedback=' + feedback.message + '&state=' + feedback.state);
                } else {
                    var feedback = {
                        message: encodeURIComponent('Je gebruikersnaam / wachtwoord was incorrect'),
                        state: encodeURIComponent('negative')
                    };
                    res.redirect('/user/login/?feedback=' + feedback.message + '&state=' + feedback.state);
                }
            });
        });
    })

// Route for logout
app
    .get('/user/logout', function(req, res) {
        // Destroys session
        req.session.destroy();

        var feedback = {
            message: encodeURIComponent('Tot ziens!'),
            state: encodeURIComponent('positive')
        };
        res.redirect('/?feedback=' + feedback.message + '&state=' + feedback.state);
    });

// Route for results
app.get('/results/*', function(req, res) {

    // Filters on price from the filter option in the header
    function filterPrice(inputData) {
        var tempData = JSON.parse(inputData.body).Objects;

        // Applies filter if minimum price exists in GET request
        if (req.query.priceMin) {
            tempData = tempData.filter(function(object) {
                if (object.Koopprijs && !object.Huurprijs) {
                    return object.Koopprijs > req.query.priceMin;
                } else {
                    return object.Huurprijs > req.query.priceMin;
                }
            });
        }
        // Applies filter if maximum price exists in GET request
        if (req.query.priceMax) {
            tempData = tempData.filter(function(object) {
                if (object.Koopprijs && !object.Huurprijs) {
                    return object.Koopprijs < req.query.priceMax;
                } else {
                    return object.Huurprijs < req.query.priceMax;
                }
            });
        }

        // return inputData;
        return JSON.stringify(tempData);
    }

    // Filters interests results based on user's favorites
    function filterInterests(type, inputData, filters, favorites) {
        // Initial data, parsed to put to use
        var tempData = JSON.parse(inputData.body).Objects;

        // Variables that'll store the values to filter interests on
        var avgRooms;
        var maxBuyPrice;
        var maxRentPrice;

        filters.roomValues.map(function(value) {
            if (value === null || value === 'null') {
                return false;
            }

            var sum = filters.roomValues.reduce(function(a, b) {
                return Number(a) + Number(b);
            });

            avgRooms = Math.round(sum / filters.roomValues.length);
        });

        filters.buyPriceValues.map(function(value) {
            if (value === null || value === 'null') {
                return false;
            }

            var highestValue = filters.buyPriceValues.reduce(function(a, b) {
                return Math.max(a, b);
            });

            maxBuyPrice = highestValue;
        });

        filters.rentPriceValues.map(function(value) {
            if (value === null || value === 'null') {
                return false;
            }

            var highestValue = filters.rentPriceValues.reduce(function(a, b) {
                return Math.max(a, b);
            });

            maxRentPrice = highestValue;
        });

        // Retrieve average amount of rooms
        tempData = tempData.filter(function(object) {
            return object.AantalKamers === avgRooms;
        });
        // Switches filter based on searchquery type
        if (type === 'koop') {
            // Retrieve maximum buy price
            tempData = tempData.filter(function(object) {
                return object.Koopprijs <= maxBuyPrice;
            });
        } else {
            // Retrieve maximum rent price
            tempData = tempData.filter(function(object) {
                return object.Huurprijs <= maxRentPrice;
            });
        }

        // Removes results already existing as favorites
        tempData = tempData.filter(function(object) {
            for (var i = 0; i < favorites.length; i++) {
                return object.Id !== favorites[i].favorite_ID;
            }
        });

        return JSON.stringify(tempData);
    }

    // Retrieves an array of the user's favorites from the database
    if (req.session.username) {
        // Retrieves all favorites from the active user
        req.getConnection(function(err, connection) {
            connection.query('SELECT * FROM favorites WHERE user_ID = (SELECT ID FROM users WHERE username = ?)', [req.session.username], function(err, favorites) {
                // Makes a request to the funda API
                request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/' + req.query.zo + '/&type=' + req.query.type + '&pagesize=25', function (error, response, body) {

                    // Variable that'll store an object containing filters based on user's favorites
                    var filters;

                    // Variable that'll call a function after a timeout has been reached
                    var interests;

                    // Arrays that'll contain the combined data of the user's favorites
                    var roomValues = [];
                    var buyPriceValues = [];
                    var rentPriceValues = [];

                    favorites.map(function(favorite) {
                        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + favorite.type + '/' + favorite.favorite_ID + '/', function (error, response, body) {
                            var data = JSON.parse(body);

                            roomValues.push(data.AantalKamers);
                            buyPriceValues.push(data.Prijs.Koopprijs);
                            rentPriceValues.push(data.Prijs.Huurprijs);
                        });
                    });

                    // Glorious timeout ladder: Step 1 - Initializing filters
                    setTimeout(function() {
                        filters = {
                            roomValues: roomValues,
                            buyPriceValues: buyPriceValues,
                            rentPriceValues: rentPriceValues
                        }
                    }, 250);

                    // Glorious timeout ladder: Step 2 - Applying filters
                    setTimeout(function() {
                        // Retrieves possible interesting results from results
                        interests = filterInterests(req.query.type, response, filters, favorites);
                    }, 375);

                    // Glorious timeout ladder: Step 3 - Execution
                    setTimeout(function() {
                        respond(res, {
                            page: 'results',
                            session: req.session.username,
                            data: filterPrice(response),
                            interests: interests,
                            favorites: favorites
                        });
                    }, 500);
                });
            });
        });
    } else {
        // Makes a request to the funda API
        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/' + apiKey + '/?zo=/' + req.query.zo + '/&type=' + req.query.type + '&pagesize=25', function (error, response, body) {
            respond(res, {
                page: 'results',
                session: req.session.username,
                data: filterPrice(response)
            });
        });
    }
});

// Routes for favorites
app
    .get('/favorites', function(req, res) {
        if (req.session.username) {
            req.getConnection(function(err, connection) {
                // Retrieves favorites from active user
                connection.query('SELECT * FROM favorites WHERE user_ID = (SELECT ID FROM users WHERE username = ?)', [req.session.username], function(err, results) {

                    // Array that'll contain data from each favorite
                    var favoritesData = [];

                    // Retrieves ID of every saved favorite from database
                    results.map(function(result) {
                        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + result.type + '/' + result.favorite_ID + '/', function (error, response, body) {
                            var data = JSON.parse(body);

                            function dataType() {
                                if (data.Prijs.Koopprijs) {
                                    return 'koop';
                                } else {
                                    return 'huur';
                                }
                            }

                            function dataArea() {
                                if (data.PerceelOppervlakte) {
                                    return data.WoonOppervlakte + 'm² / ' + data.PerceelOppervlakte + 'm² • ' + data.AantalKamers + ' kamers';
                                } else {
                                    return data.WoonOppervlakte + 'm² ' + ' • ' + data.AantalKamers + ' kamers';
                                }
                            }

                            function dataPrice() {
                                if (data.Prijs.Koopprijs && !data.Prijs.Huurprijs) {
                                    return '<strong>€ ' + numberWithPeriods(data.Prijs.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
                                } else {
                                    return '<strong>€ ' + numberWithPeriods(data.Prijs.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
                                }
                            }

                            favoritesData.push({
                                id: data.InternalId,
                                img: data.HoofdFoto,
                                address: data.Adres,
                                zipCity: data.Postcode + ', ' + data.Plaats,
                                type: dataType(),
                                price: dataPrice(),
                                area: dataArea(),
                                added: data.AangebodenSindsTekst
                            });
                        });
                    })

                    // Uses timeout in order to retrieve data from database
                    // Create a proper fallback*
                    setTimeout(function() {
                        respond(res, {
                            page: 'favorites',
                            session: req.session.username,
                            data: favoritesData,
                            feedback: {
                                message: req.query.feedback,
                                state: req.query.state
                            }
                        });
                    }, 1500)
                });
            });
        } else {
            var feedback = {
                message: encodeURIComponent('Je dient ingelogd te zijn om een favoriet aan te maken'),
                state: encodeURIComponent('negative')
            };
            res.redirect('/user/login/?feedback=' + feedback.message + '&state=' + feedback.state);
        }
    })
    .get('/favorites/add/:type/:id/', function(req, res) {
        // Checks if user is logged in
        if (req.session.username) {
            req.getConnection(function(err, connection) {
                // Connects to database to check if item is already in favorites
                connection.query('SELECT * FROM favorites WHERE favorite_ID = ?', [req.params.id], function(err, results) {
                    if (results.length === 0) {
                        connection.query('INSERT INTO favorites (user_ID, favorite_ID, type) VALUES ((SELECT ID FROM users WHERE username = ?), ?, ?)', [req.session.username, req.params.id, req.params.type], function(err, results) {
                            var feedback = {
                                message: encodeURIComponent('Favoriet toegevoegd!'),
                                state: encodeURIComponent('positive')
                            };
                            res.redirect('/favorites/?feedback=' + feedback.message + '&state=' + feedback.state);
                        });
                    } else {
                        var feedback = {
                            message: encodeURIComponent('Dit huis bestond al in je favorieten!'),
                            state: encodeURIComponent('negative')
                        };
                        res.redirect('/favorites/?feedback=' + feedback.message + '&state=' + feedback.state);
                    }
                });
            });
        } else {
            var feedback = {
                message: encodeURIComponent('Je dient ingelogd te zijn om een favoriet toe te kunnen voegen'),
                state: encodeURIComponent('negative')
            };
            res.redirect('/user/login/?feedback=' + feedback.message + '&state=' + feedback.state);
        }
    })
    .get('/favorites/remove/all', function(req, res) {
        req.getConnection(function(err, connection) {
            // Removes all of user's favorites from database
            connection.query('DELETE FROM favorites WHERE user_ID = (SELECT ID FROM users WHERE username = ?)', [req.session.username], function(err, results) {
                var feedback = {
                    message: encodeURIComponent('Al jouw favorieten zijn verwijderd!'),
                    state: encodeURIComponent('positive')
                };
                res.redirect('/favorites/?feedback=' + feedback.message + '&state=' + feedback.state);
            });
        });
    })
    .get('/favorites/remove/:id', function(req, res) {
        req.getConnection(function(err, connection) {
            // Removes favorite from database
            connection.query('DELETE FROM favorites WHERE favorite_ID = ?', [req.params.id], function(err, results) {
                var feedback = {
                    message: encodeURIComponent('Favoriet verwijderd!'),
                    state: encodeURIComponent('positive')
                };
                res.redirect('/favorites/?feedback=' + feedback.message + '&state=' + feedback.state);
            });
        });
    });

// Route for detail page
app.get('/detail/:type/:id', function(req, res) {
    if (req.session.username) {
        req.getConnection(function(err, connection) {
            // Select favorite ID's in order to compare with the result the user requested the details for, to eventually display a colored in heart if the result already exists in user's favorites
            connection.query('SELECT favorite_ID FROM favorites WHERE user_ID = (SELECT ID FROM users WHERE username = ?)', [req.session.username], function(err, favorites) {
                // Makes a request to the funda API
                request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + req.params.type + '/' + req.params.id + '/', function (error, response, body) {
                    respond(res, {
                        page: 'detail',
                        session: req.session.username,
                        data: response,
                        favorites: favorites
                    });
                });
            });
        });
    } else {
         // Makes a request to the funda API
        request('http://funda.kyrandia.nl/feeds/Aanbod.svc/json/detail/' + apiKey + '/' + req.params.type + '/' + req.params.id + '/', function (error, response, body) {
            respond(res, {
                page: 'detail',
                session: req.session.username,
                data: response
            });
        });
    }
});

// Renders HTML skeleton
function respond(res, settings, err) {
    // Shows splashscreen if user is on index
    function getSplash(page) {
        if (page === 'splash') {
            return 'class="splash"';
        } else {
            return '';
        }
    }

    function setFeedback(feedback) {
        // Early exit for pages without feedback
        if (feedback === undefined) {
            return [
                '<section id="feedback" class="hidden">',
                '</section>',
            ].join('\n');
        }

        if (feedback.message !== undefined || feedback.state !== undefined) {
            return [
                '<section id="feedback" class="' + feedback.state + '">',
                    '<span class="feedback-msg">' + feedback.message + '</span>',
                '</section>',
            ].join('\n');
        } else {
            return [
                '<section id="feedback" class="hidden">',
                '</section>',
            ].join('\n');
        }
    }

    // Checks whether user is logged in
     function getUserNav(activeUser) {
        if (activeUser) {
            return [
                '<ul>',
                    '<li><span>' + activeUser + '</span></li>',
                    '<li><a href="/user/logout">Logout</a></li>',
                '</ul>'
            ].join('\n');
        } else {
            return [
                '<ul>',
                    '<li><a href="/user/register">Registreer</a></li>',
                    '<li><a href="/user/login">Login</a></li>',
                '</ul>'
            ].join('\n');
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
            '<style>',
                '@charset "UTF-8";fieldset,ul{padding:0}body,button,header .user-nav a{background-color:#f8b000}*{box-sizing:border-box}body,html{width:100%;overflow-x:hidden}body{position:relative;z-index:0;margin:0;font-family:sans-serif;font-size:1em;color:#333}a{text-decoration:none;color:#40bcf2}button{margin-bottom:1rem;padding:.5em;font-size:1.1em;color:#fff;border:none;border-radius:.25rem}fieldset{margin:0;border:none}input,label{display:block}input[type=number],input[type=text]{margin-top:.5rem;margin-bottom:1rem;padding:.5em;font-size:1em;border:1px solid #999;border-radius:.25rem}header{display:flex;flex-wrap:wrap;align-items:center;background-color:#a0def8;box-shadow:none;transform:translateY(0)}header.splash{position:fixed;z-index:2;width:100vw;box-shadow:0 .1rem .25rem rgba(0,0,0,.25);transform:translateY(2.5rem)}header>*{width:100%;padding:.5rem 1rem}header .top{display:flex;justify-content:space-between}header .user-nav ul{display:flex;margin:0}header .user-nav li{display:flex;align-items:center;margin-right:.5rem;list-style-type:none}header .user-nav li:last-of-type{margin-right:0}header .user-nav a{padding:.5rem;border-radius:.25rem;color:#fff;display:block}header form{display:flex;flex-wrap:wrap;padding:1rem;background-color:#70cdf5}header form fieldset{position:relative;width:100%;margin:0 0 1rem;padding:0;border:none}header form fieldset:last-of-type{margin-bottom:0}header form label{display:block;margin-bottom:.4em;font-size:1.2em;color:#fff}header form button,header form input[type=number],header form input[type=text]{width:100%;margin:initial;padding:1rem;font-size:1.1em;border-radius:.25rem;border:none}header form button#submit{margin-top:1rem;margin-bottom:0;color:#fff;background-color:#f8b000}@media (min-width:48em){header form{justify-content:center}header form fieldset{width:55%}header form button#submit{width:10rem}}header form #filter{display:flex;flex-wrap:wrap;justify-content:space-between;width:100%}@media (min-width:48em){header form #filter{width:55%}}header form #filter .filter-text{display:flex;flex-wrap:nowrap;justify-content:space-between}header form #filter .filter-radio{display:flex;width:60%}@media (min-width:48em){header form #filter .filter-text{justify-content:flex-start}header form #filter .filter-radio{width:initial;margin-right:1rem}}header form #filter .filter-radio label:last-child{border-radius:0 .25rem .25rem 0}header form #filter .filter-price{width:100%;height:0;overflow-y:hidden}header form #filter .filter-text{align-items:baseline;margin-top:1rem}header form #filter .filter-text label{position:relative;width:35%;padding-right:1rem;text-align:right}header form #filter .filter-text label::after{position:absolute;z-index:1;right:-1.5rem;color:#999;content:"€"}header form #filter .filter-text .filter-text-input{position:relative;width:65%;overflow-x:hidden}header form #filter .filter-text .filter-text-input input{width:100%;padding-left:2rem}body>section,footer{position:relative;width:100vw}header form #filter label[data-input=checkbox],header form #filter label[data-input=radio]{position:relative;margin-bottom:0;padding:1em;border-radius:.25rem;background-color:#40bcf2}header form #filter label[data-input=radio]{border-radius:.25rem 0 0 .25rem}header form #filter input{width:initial}.hidden,header form #filter input[type=checkbox],header form #filter input[type=radio]{display:none}header form #filter input[type=radio]:checked+label{background-color:#11acee}body>section{display:block;padding:1rem;background-color:#fff}@media (min-width:60em){body>section{padding-right:calc(1rem + 17px)}}#feedback{padding:1rem 3rem;font-weight:700;line-height:1.4em;text-align:center;color:#fff;background-color:#70cdf5}footer{display:none;height:100vh;overflow:hidden;opacity:.5}footer #mosaic{display:flex;flex-wrap:wrap;margin:0;transform:translateY(0);animation:autoscroll 50s infinite alternate}footer #mosaic li{display:block;width:calc(100% / 3);height:10rem;filter:blur(1px)}footer #mosaic li img{filter:sepia(100%)}@media (min-width:48em){footer #mosaic{animation:autoscroll 20s infinite alternate}footer #mosaic li{width:25%}footer #mosaic li img{width:100%}}@media (min-width:60em){footer #mosaic{animation:autoscroll 20s infinite alternate}footer #mosaic li{width:calc(100% / 5)}}@keyframes autoscroll{to{transform:translateY(calc(-100% + 100vh))}}',
            '</style>',
            '<noscript>',
                '<link rel="stylesheet" href="/static/style/main.min.css">',
            '</noscript>',
            '<script src="/static/script/bundle.js" defer></script>',
        '</head>',
        '<body>',
            setFeedback(settings.feedback),
            '<header ' + getSplash(settings.page) + '>',
                '<section class="top">',
                    '<funda-logo></funda-logo>',
                    '<nav class="user-nav">',
                        getUserNav(settings.session),
                    '</nav>',
                '</section>',
                '<form method="GET" action="/results/?type&zo&priceMin&priceMax">',
                    '<fieldset>',
                        '<label for="search">Zoek woningen</label>',
                        '<input id="search" name="zo" type="text" placeholder="Plaats, buurt, adres, et cetera">',
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
                                '<label for="priceMin">Prijs van</label>',
                                '<section class="filter-text-input">',
                                    '<input id="priceMin" name="priceMin" type="number" step="1000">',
                                '</section>',
                            '</section>',
                            '<section class="filter-text">',
                                '<label for="priceMax">Prijs tot</label>',
                                '<section class="filter-text-input">',
                                    '<input id="priceMax" name="priceMax" type="number" step="1000">',
                                '</section>',
                            '</section>',
                        '</section>',
                    '</section>',
                    '<fieldset>',
                        '<button id="submit">Verzenden</button>',
                    '</fieldset>',
                '</form>',
            '</header>',
            renderReqPage(settings.page, settings.data, settings.favorites, settings.interests),
        '</body>',
        '</html>',
        ''
    ].join('\n')); // join on every new line
};

// Renders page underneath header based on input
function renderReqPage(page, data, favorites, interests) {
    switch (page) {
        case 'splash':
            // Disables mosaic rendering ofr better performance
            // return renderMosaic(data);
        break;
        case 'user/register':
            return renderUserPage('register');
        break;
        case 'user/login':
            return renderUserPage('login');
        break;
        case 'results':
            return renderResults(data, favorites, interests);
        break;
        case 'favorites':
            return renderFavorites(data);
        break;
        case 'detail':
            return renderDetail(data, favorites);
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
                    '<form method="post" action="/user/register" class="user-form">',
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
                    '<form method="post" action="/user/login" class="user-form">',
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
function renderResults(data, favorites, interests) {
    if (data) {
        var results = JSON.parse(data);

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

            // Checks whether an item already exists in favorites of user and sets correct reference
            function checkFavorites() {
                if (favorites) {
                    // Checks if user has any favorites added, returns 'add' link for each result otherwise
                    if (favorites.length) {
                        for (var i = 0; i < favorites.length; i++) {
                            if (favorites[i].favorite_ID === result.Id) {
                                return '<a href="/favorites/remove/' + result.Id + '" class="fav-label checked"></a>';
                            }
                            if (i === favorites.length - 1) {
                                return '<a href="/favorites/add/' + getType() + '/' + result.Id + '" class="fav-label"></a>';
                            }
                        }
                    } else {
                        return '<a href="/favorites/add/' + getType() + '/' + result.Id + '" class="fav-label"></a>';
                    }
                } else {
                    return '<a href="/favorites/add/' + getType() + '/' + result.Id + '" class="fav-label"></a>';
                }
            }

            // Pushes DOM-structure to resultList
            resultList.push([
                '<li>',
                    '<img src="' + result.FotoLarge + '" alt="Foto van ' + result.Adres + '">',
                    checkFavorites(),
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
            '<section id="results">',
                '<section class="btn-block">',
                    '<a href="/favorites">Favorieten</a>',
                '</section>',
                '<h2>Resultaten</h2>',
                renderInterests(interests),
                '<ul id="results" class="result-list">',
                    getList(),
                '</ul>',
            '</section>'
        ].join('\n');
    } else {
        // Returns entire result page without any results
        return [
            '<section id="results">',
                '<section class="btn-block">',
                    '<a href="/favorites">Favorieten</a>',
                '</section>',
                '<h2>Resultaten</h2>',
                '<p>',
                    'Er zijn geen resultaten gevonden.',
                '</p>',
            '</section>',
        ].join('\n');
    }
}

// Renders interests based on user's favorites from database
function renderInterests(data) {
    if (data) {
        var results = JSON.parse(data);

        // Early exit if user hasn't added any favorites
        if (results.length === 0) {
            return '';
        }

        function getInterests() {
            var interestsList = [];

            results.map(function(interest) {
                // Gets buy / rental price
                function getPrice() {
                    if (interest.Prijs.Koopprijs && !interest.Prijs.Huurprijs) {
                        return '<strong>€ ' + numberWithPeriods(interest.Prijs.Koopprijs) + ' <abbr title="Kosten Koper">k.k.</abbr></strong>';
                    } else {
                        return '<strong>€ ' + numberWithPeriods(interest.Prijs.Huurprijs) + ' <abbr title="Per maand">/mnd</abbr></strong>';
                    }
                }

                // Checks if property-area should be included
                function getArea() {
                    if (interest.Perceeloppervlakte) {
                        return interest.Woonoppervlakte + 'm² / ' + interest.Perceeloppervlakte + 'm² • ' + interest.AantalKamers + ' kamers';
                    } else {
                        return interest.Woonoppervlakte + 'm² • ' + interest.AantalKamers + ' kamers';
                    }
                }

                // Checks if the house is for sale or for rent
                function getType() {
                    if (interest.Koopprijs && !interest.Huurprijs) {
                        return 'koop';
                    } else {
                        return 'huur';
                    }
                }

                // Pushes DOM-structure to interestsList
                interestsList.push([
                    '<li>',
                        '<img src="' + interest.FotoLarge + '" alt="Foto van ' + interest.Adres + '">',
                        '<a href="/favorites/add/' + getType() + '/' + interest.Id + '" class="fav-label"></a>',
                        '<h3>',
                            '<a data-id="' + interest.Id + '" href="/detail/' + getType() + '/' + interest.Id + '">' + interest.Adres + '</a>',
                        '</h3>',
                        '<p>' + interest.Postcode + ', ' + interest.Woonplaats + '</p>',
                        '<p>' + getPrice() + '</p>',
                        '<p>' + getArea() + '</p>',
                        '<span>' + interest.AangebodenSindsTekst + '</span>',
                    '</li>'
                ].join('\n'));
            });

            return interestsList.join('\n');
        }

        return [
            '<ul id="interests" class="result-list">',
                getInterests(),
            '</ul>',
        ].join('\n');
    }
}


// Renders detail page if there is any data to render one
function renderDetail(data, favorites) {
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

        // Checks whether an item already exists in favorites of user and sets correct reference
        function checkFavorites() {
            if (favorites) {
                // Checks if user has any favorites added, returns 'add' link for each result otherwise
                if (favorites.length) {
                    for (var i = 0; i < favorites.length; i++) {
                        if (favorites[i].favorite_ID === detail.id) {
                            return '<a href="/favorites/remove/' + detail.id + '" class="fav-label checked"></a>';
                        }
                        if (i === favorites.length - 1) {
                            return '<a href="/favorites/add/' + detail.type() + '/' + detail.id + '" class="fav-label"></a>';
                        }
                    }
                } else {
                    return '<a href="/favorites/add/' + detail.type() + '/' + detail.id + '" class="fav-label"></a>';
                }
            } else {
                return '<a href="/favorites/add/' + detail.type() + '/' + detail.id + '" class="fav-label"></a>';
            }
        }

        return [
            '<section id="detail">',
                '<section class="btn-block">',
                    '<a href="javascript:history.back()" class="go-back">Terug</a>',
                '</section>',
                '<h2>' + detail.address + '</h2>',
                '<h3>' + detail.zipCity + '</h3>',
                '<section class="img-block">',
                    '<img src="' + detail.img + '" alt="Foto van ' + detail.address + '">',
                    checkFavorites(),
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

// Renders favorites if the user has saved any
function renderFavorites(data) {
    if (data.length) {
        function getFavorites() {
            var favoritesList = [];

            data.map(function(favorite) {
                favoritesList.push([
                    '<li>',
                        '<img src="' + favorite.img + '" alt="Foto van ' + favorite.address + '">',
                        '<a href="/favorites/remove/' + favorite.id + '" class="fav-label checked"></a>',
                        '<h3>',
                            '<a data-id="' + favorite.id + '" href="/detail/' + favorite.type + '/' + favorite.id + '">' + favorite.address + '</a>',
                        '</h3>',
                        '<p>' + favorite.zipCity + '</p>',
                        '<p>' + favorite.price + '</p>',
                        '<p>' + favorite.area + '</p>',
                        '<span>' + favorite.added + '</span>',
                    '</li>'
                ].join('\n'));
            });

            return favoritesList.join('\n');
        }

        return [
            '<section>',
                '<section class="btn-block">',
                    '<a href="javascript:history.back()" class="go-back">Terug</a>',
                    '<a href="/favorites/remove/all" class="delete-all">Verwijder alles</a>',
                '</section>',
                '<h2>Favorieten</h2>',
                '<ul id="favorites" class="result-list">',
                    getFavorites(),
                '</ul>',
            '</section>',
        ].join('\n');
    } else {
        return [
            '<section>',
                '<h2>Favorieten</h2>',
                '<p>Je hebt geen favorieten toegevoegd.</p>',
            '</section>',
        ].join('\n');
    }
}

// Renders mosaic for the index page if request responded with any data
function renderMosaic(data) {
    if (data) {
        var results = JSON.parse(data.body).Objects;

        function getTiles() {
            var tileList = [];

            results.map(function(tile) {
                tileList.push([
                    '<li>',
                        '<img src="' + tile.FotoMedium + '">',
                    '</li>'
                ].join('\n'));
            });

            return tileList.join('\n');
        }

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