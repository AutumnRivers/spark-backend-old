# Setting up Spark's backend
---

Table Of Contents
* [Basic Setup](#basic-setup)
* [SendGrid](#setting-up-sendgrid)
* [API](#api)
    * [Private](#the-private-api)
    * [Socket.IO](#to-the-sockets-they-go)
* [Deploying](#deploy)
    * [Heroku](#deploying-on-heroku)
    * [Glitch](#deploying-on-glitch)
* [Contact](#contact-the-dev)
* [LICENSE](#license)

---

## Basic Setup
1. Clone the repo: `git clone https://www.github.com/diamondgrid/spark-backend.git`
2. Move to the directory: `cd ./spark-backend`
3. Install all the modules: `npm install`
4. Use an SQLite browser to make sure the sqlite file cloned over correctly
5. Run it: `npm start`

---

## Setting up SendGrid
SendGrid is not required **if** you don't plan on having Email verification. However, you probably do.
This requires the use of... drumroll please... environment variables! If you don't know how to set up environment variables, don't worry. [It's quite simple.](http://lmgtfy.com/?s=d&q=how+to+set+up+environment+variables)

You will need to set the `SENDGRID_PASSWORD` environment variable. I HIGHLY recommend using an [API key](https://sendgrid.com/docs/ui/account-and-settings/api-keys/). I also highly recommend setting up Two-Factor auth for your SendGrid account. Either way. Most of the stuff is already set up for you. Feel free to edit the email however you'd like, but it should always have two links:

1. `https://your-app-name-here.com/verify/VERIFYID`
2. `https://your-app-name-here.com/deverify/VERIFYID`

---

## API
This explains how to **set up** the API, not how to use it. If you'd like to learn how to use it, [visit the docs](https://sparkapp-backend.herokuapp.com/docs.html).

The public API does not require any additional steps to be set up.

### The Private API

Everything is pretty much taken care of for you. However, if you want to be able to test the API without needing to input an API key every time, just set your 

---

### To the Sockets they go
Spark utilizes [Socket.IO](https://socket.io/). It's easy to set up, for the most part. You don't really need to configure anything here - most of it is taken care of. If you'd like to modify anything, I'd look at the comments in the code.

---

## Deploying

### Heroku
You don't need to do anything to deploy to Heroku. The procfile is already set up. Just deploy it like you would any other Heroku app, then set the environment variables.

---

### [Glitch](https://www.glitch.com/)
Setting up the backend on Glitch is fairly simple. You can keep your code open-sourced on that, if you'd like to. Just be sure to edit your `.env` file to include the required environment variables.
I do **not** recommend hosting on Glitch, since they enforce a rate limit of 4000rq/hr. That's good for normal apps, not for backends or APIs.

---

## Contact
If you have any further questions, you may contact me at:
* My [business email](mailto:smarti3plays@gmail.com)
* My Discord: `Nati#5434`
* My [Twitter](https://www.twitter.com/SmartiePlays_)

---

## LICENSE

This code is licensed under the [MIT License](https://opensource.org/licenses/MIT)