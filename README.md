# Funda: Coding Challenge 2017 - Server Side
An attempt to progressively enhance my previously built application prototype for Funda, by removing client-side JavaScript entirely.
You can take a glimpse at this project by clicking the link below this paragraph.

This server-side take on the same project will work the same way. This README is a living document, which will soon be finished, along with the app itself, but for now you need to do it with the working example of the already 'finished' client-side prototype.

[Funda: Coding Challenge 2017](https://github.com/BerendPronk/minor-funda)

## First steps
If you do decide to take a look at the work-in-progress server-side application, you must clone this repository first.  
For the first time use, you must install every package I used, first. Do this by navigating to the folder this clone is contained in, following by a command to install the list of packages.

```shell
$ cd {clone-folder}
$ npm install
```

When the progress bar is filled will mean that the installation of the packages was successful. You can now start the application by setting up the server.

```shell
$ nodemon server
```

Keep in mind that you need a `secret` API-key, in order to see the prototype in action. Unfortunately, I can't share it publically. I also can't share one via a private message. Either you have one, or not.


## Feedback
If you happen to notice any flaw on my part that couldn't be left undone, feel free to notify me by creating an issue on this repository. Pull request are also very much appreciated.

## Todo
- Recreate every functionality from the original prototype
- Add JavaScript to enhance the application client-side
- Refactor server.js into multiple files
- Expand on this README with my learning process, the list of functionalities of the prototype and todo's for the future
