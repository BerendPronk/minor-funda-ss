# Funda: Coding Challenge 2017 - Server-side
An attempt to progressively enhance my previously built application prototype for Funda, by removing client-side JavaScript entirely.
You can take a glimpse at this project by clicking the link below this intro.

The goal of this project was to enhance on the performance of the client-side application. This server-side take on the same project works exactly the same as the I one being improved, with some minor reductions to functionalities. Though unfortunate, these functionalities, like live suggestion-search and smooth page transitions, were just not possible to accomplish; in the time I got to convert the application, that is. 

[Funda: Coding Challenge 2017](https://github.com/BerendPronk/minor-funda)

## Demo
The API-key I received to implement in this prototype should remain private. That makes it not easiliy possible to provide you with a live demo to experience. It would've been for just a few months after the completion of the project anyway, though, since the API-key was to expire. That's why I recorded a demo for you to see on YouTube.

[Funda: Coding Challenge 2017 - Server-side Prototype](https://www.youtube.com/watch?v=R-7a1KPatyg)

---

## First steps
If you do decide to take a look at the work-in-progress server-side application, you must clone this repository first. You can do this by typing the following command in your terminal:  

```shell
$ git clone https://github.com/BerendPronk/minor-funda-ss.git
```

Then navigate to the folder you just cloned this repository in:

```shell
$ cd minor-funda-ss
```

There are some dependencies not included in this repository. You need to install these first, before being able to launch the application. Type the following in your terminal:

```shell
$ npm install
```

When the progress bar is entirely filled will mean that the installation of the packages was successful. You can now start the application by setting up the server. The app will be server on http://localhost:2000.

```shell
$ nodemon server
```

Keep in mind that you need a `secret` API-key in order to see the prototype in action. Unfortunately, I can't share it publically. I also can't share one via a private message. Either you have one, or you do not.

---

## Features
As mentioned before, this application works the same as the [previous one I made for Funda](https://github.com/BerendPronk/minor-funda), but the routing, templating and handling of API-requests are all done server-side. For this I used Node.js. I have worked with Node.js before in the past, that was for a school project a few years prior to this minor.  
Starting out with Node.js again was pretty tricky getting used to. However, the logic behind it made more sense to me than it did years ago, despite not working with it at all.

I challenged myself not to use any client-side JavaScript, and I managed to do so. In the end I realised that I was unable to mimic the entirety of the client-side application, so I needed to add some JavaScript to achieve some functionalities that are not so easy to do server-side, if not impossible.

### Routing, templating and Server requests
This app uses [`Express`](https://www.npmjs.com/package/express) for handling requests on the server, this includes navigation to the parameter given in the request. Any `GET`-request be handled very efficiently. The same goes fore `POST`-requests, but a [`body-parser`](https://www.npmjs.com/package/body-parser) needs to be installed first, though.

The templating / DOM-structure per page consists of a HTML string given as a response to the requested page.

### Storage
The previous application made use of `localStorage` for storing favorites from the user. Mainly done for prototyping purposes, to present the possiblilties with saving and retrieving storage. This web API is available locally, which makes it impossible to use on a server. I needed to think of an alternative for this, some sort of database.  
There are many possible databases to be used with Node.js. Since I wanted to create no additional client-side JavaScript, databases like [`PouchDB`](https://www.npmjs.com/package/pouchdb) were no option for me. The application needed to have a relational database, and I chose to use [`MySQL`](https://www.npmjs.com/package/mysql).

### Sessions
[`Express`](https://www.npmjs.com/package/express) can also be used for creating sessions, so a logged in user stays logged in for a certain amount of time. This is an ideal solution for this server-side application, since it no longer consists of one single page, like before.

### Client-side enhancement
After I was done converting the application, bits of JavaScript were added to improve on the experience and on performance. Without these added functions, users would be unable to: close feedback messages, experience thousands-notation in the price filters and receive assets faster than usual, because of the asynchronous loading of the CSS-file. 

---

## Performance
In this minor I learned a lot about increasing performance on website and applications. I knew which principles I needed to add to this application in order to improve on the loadtime. Not everything that I learned during this minor was necessary for this prototype, but the one that were, are described here.

### General performance
To improve the loadtime of the application, I compressed the assets as much as possible. The CSS is all minified and loaded in asynchronously. [Critical CSS](https://www.smashingmagazine.com/2015/08/understanding-critical-css/) is applied to give the user only what they need on the initial load.  
The JavaScript is also minified, but not before being bundled and mangled first. This reduces the amount of reqeusts to one, and minimizes the file-size of that bundle.

After those file reductions, the server applies [gzip compression](https://www.npmjs.com/package/compression) to minimize the download-size of the application even more.

### Service Worker
My first time putting a service worker to use. The concept of it is fairly new, as was the case when this readme was written, so I didn't know much about it. Luckily we had a guest invited over to our minor, [Jasper Moelker, De Voorhoede](https://github.com/jbmoelker), to give us a workshop on service workers. A push in the right direction, I should say.

I got the Funda application to work with a service worker, which caches static files and the pages the user has been to. Meaning a user is able to see his/her favorites from the database when disconnected from the internet.  
All non-cachced pages will result in an offline-page that shows a message on the situation and provides the user with a 'Try again' button.

---

## Feedback
If you happen to notice any flaw on my part that couldn't be left undone, feel free to notify me by creating an issue on this repository. Pull request are also very much appreciated.

## Wishlist for the future
- I'd like to divide the `server.js` file into chunks, for a better overview during development.
- I want the application to be served over HTTP2, but I need to figure out how exactly first.
- I insist that this application should run on practically any device, so I need to do lots of tests, generating issues to then solve.

## License
[MIT](https://github.com/BerendPronk/minor-funda-ss/blob/master/LICENSE.md)

Copyright - Berend Pronk

2017
