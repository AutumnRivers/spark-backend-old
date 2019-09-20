/*
This is the backend server for Spark. It's basically what makes everything work.
From sockets to signups and logins, (almost) everything is handled here.
The server runs on the Express.js web server framework, v4.16.4

This code is licensed the MIT OSS License: https://opensource.org/licenses/MIT

©2019 Diamond Grid Web, Nati R (SmartieCodes)
*/

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// Server
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const path = require('path');
const url = require('url');
const fetch = require('node-fetch');
const mkdir = require('mkdirp');

// Express
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('www'));
app.use('/api', require('./api/publicAPI'));
app.use('/api/private', require('./api/privateAPI'));
app.set("trust proxy", true);
app.set('x-powered-by', false);

// SQLite
const sql = require('sqlite');
sql.open('./database.sqlite');

// Socket.io
var http = require('http').Server(app);
const io = require('socket.io')(http);

// UUID
const uuidv4 = require('uuid/v4');
const uuidKey = require('uuid-apikey');

// Mailing
const fs = require('fs');
const sendGrid = require('@sendgrid/mail');
sendGrid.setApiKey(process.env.SENGRID_PASSWORD);

// Backend
app.post('/signup', (req, res, next) => {
    // What's handled here? Take a guess.
    // Generate the keys
    const uuid = uuidv4();
    const apiKey = uuidKey.create();
    if(!req.body.username || !req.body.password || !req.body.email) {
        // No, undefined, you cannot join.
        res.status(400);
        res.send('Missing Credentials');
        return;
    } else {
        var username = req.body.username;
        var username = username.toLowerCase();
        sql.get('SELECT * FROM users WHERE username = $user OR email = $email', [$user=username, $email=req.body.email]).then(user => {
            if(user) {
                // Usernames and Emails are unique. Dopplegangers not allowed! No twins either!!
                res.status(400);
                res.send('User/Email already exists');
                return;
            } else {
                // Hash the password with bcrypt
                const salt = bcrypt.genSaltSync(10);
                const password = bcrypt.hashSync(req.body.password, salt);
                // Add the user
                sql.run('INSERT INTO users (username, password, email, avatar, verifyId, verified, apiKey, public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.body.username, password, req.body.email, 'https://cdn.glitch.com/e37e70e9-8f05-473e-a44e-4e72d168cd47%2Flogo.png', uuid, 'false', apiKey.apiKey, 'true'])
                .catch(err => {
                    // Our code monkeys are wowking VEWY HAWD to fix this uwu
                    console.error(err);
                })
                .then(() => {
                    // Send a 200 status, confirming the signup went through
                    res.status(200);
                    res.send('Success');

                    // Send the verification email.
                    // SendGrid is used here, please look at setup.md to learn how to set this up.
                    sendGrid.send({
                        from: 'noreply@diamondgrid.ga',
                        to: req.body.email,
                        subject: 'Spark E-mail Confirmation',
                        text: 'Hi there! Somebody (assuming you) has used your email to signup for Spark by Diamond Grid Software. If this was you, great! Confirm your email by going to https://sparkapp-backend.herokuapp.com/verify/' + uuid + ' . If this wasn\'t you, fret not! You can request a take down by going to https://sparkapp-backend.herokuapp.com/deverify/' + uuid + ' , and then the email will automatically be deleted.',
                        html: `<!DOCTYPE html><html lang="en-us"> <head> <title>Spark - Confirm Email!</title> <link rel="stylesheet" type="text/css" href="./www/css/default.css"/> <link rel="icon" href="./www/icon.ico" type="x-image/icon"/> <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js" type="text/javascript"></script> <meta charset="utf8"/> </head> <body> <main> <h1 class="center-align">Hi there!</h1> <p>Somebody (assuming you) has used your email to signup for Spark by Diamond Grid Software. If this was you, great! <a href="https://sparkapp-backend.herokuapp.com/verify/` + uuid + `">Please verify your email.</a></p> <p>If this wasn't you, fret not! <a href="https://sparkapp-backend.herokuapp.com/deverify/` + uuid + `">You can request a takedown</a>, then the email will be automatically deleted.</p> <footer class="center-align"> <p>&copy;2019 Diamond Grid Software</p> </footer> </main> </body> </html>`
                    });
                });
            }
        });
    }
});

app.post('/login', (req, res, next) => {
    // No, not pizza logs. But those do sound good, wanna get some? I'm buying.
    if(!req.body.username && !req.body.email || !req.body.password) {
        // blank. no.
        res.status(400);
        res.send('Missing Credentials');
    } else {
        sql.get('SELECT * FROM users WHERE username = $username OR email = $email', [$username=req.body.username, $email=req.body.email])
        .then(user => {
            if(!user) {
                // If the user doesn't exist, call our good friend 404.
                res.status(404);
                res.send('User not found');
            } else {
                const guess = bcrypt.compareSync(req.body.password, user.password);
                if(!guess) {
                    // Send a 403 if the user messed up. Make them feel bad.
                    res.status(403);
                    res.send('Incorrect Password');
                } else {
                    // Send a 200 status along with the user's info
                    res.status(200);
                    res.send(user);
                }
            }
        });
    }
});

app.get('/verify/:id', (req, res, next) => {
    // E-mail verification is handled here
    const id = req.params.id;

    sql.get('SELECT * FROM users WHERE verifyId = $reqId', [$reqId=id])
    .then(user => {
        if(user) {
            sql.run('UPDATE users SET verified = "true" WHERE verifyId = $reqId', [$reqId=id])
            .catch(err => { console.error(err) })
            .then(() => {
                res.status(200);
                res.sendFile(__dirname + '/www/success.html');
            })
        } else {
            // If the ID doesn't exist, send a 404
            res.status(404);
            res.sendFile(__dirname + '/www/404.html');
        }
    })
})

// Socket.IO stuffs
io.on('connection', (socket) => {

    // Connecting to the socket requires an API key.
    // If the socket does not have an API key, we forcibly disconnect it.
    // It's like taking candy from a baby that's trying to open the locked door.
    // Great analogy, me. Thanks, me.
    if(!socket.handshake.query.apiKey) socket.disconnect();

    // Additionally, if the socket is using an API key that doesn't exist, we also disconnect it.
    // It's like taking candy from a baby that's sticking the key in the wrong place.
    // ...I'll stop with the baby analogies now.
    sql.get('SELECT * FROM users WHERE apiKey = $key', [$key=socket.handshake.query.apiKey])
    .then(user => {
        if(!user) socket.disconnect();
    });

    const apiKey = socket.handshake.query.apiKey;

    // Email is also meant to be sent. If it's not, eh, no big deal.
    // But this is mainly just to make sure the email is verified.
    sql.get('SELECT email FROM users WHERE email = $email', [$email=socket.handshake.query.email])
    .then(user => {
        if(!user) {
            io.to(socket.id).emit('status', 'Email missing');
        } else if(user.verified == 'false') {
            io.to(socket.id).emit('status', 'Email not verified');
        }
    });

    // Useful if a developer wants to make sure their key went through
    socket.on('test connection', (id) => {
        io.to(id).emit('status', 'Successfully connected to Spark.');
    });

    // When joining a room, a socket in Spark will emit the 'join room' event
    socket.on('join room', (roomName) => {
        var skipReqs;
        var reqMade;

        /*
        Users should only be in one room at a time.
        That being said, they should also stay in their default one, the one with their socket id.
        If either check fails, we prevent the user from joining the room.
        */
        if(Object.keys(socket.rooms).length > 2 || !socket.rooms[socket.id]) return;

        socket.join(roomName); // And then the socket itself joins the "room"
        io.to(socket.id).emit('status', {message: 'Joined room ' + roomName}); // Confirm they entered successfully

        sql.get('SELECT username, display, avatar FROM users WHERE apiKey = $key', [$key=apiKey])
        .catch(err => {
            console.error(err);
        })
        .then(user => {
            io.to(roomName).emit('user joined', user);
        })

        socket.on('chat text', (message, apiKey) => {
            // This triggers when a chat message is sent in the room
            // Again, the API key is used here, but only to confirm identity.
            // It's like a baby with a driver's license
            // Haha, thought I'd stop, didn't you?
            if(message == '' || !apiKey) return;
            // Nobody likes a blank message.
            sql.get('SELECT * FROM users WHERE apiKey = $key', [$key=apiKey])
            .then(user => {
                if(!user) return;
                const username = user.username;
                const avatar = user.avatar;
                // We then emit the message.
                io.to(roomName).emit('chat text', {message, username, avatar});
            })
        });

        socket.on('add to queue', (url, service, apiKey, details) => {
            // This triggers when someone adds a song to the queue
            if(!url || !service || !apiKey) return;
            // Why queue nothing? "details" is optional, so we don't need to check for it.
            sql.get('SELECT * FROM users WHERE apiKey = $key', [$key=apiKey])
            .then(user => {
                if(!user) return;

                const roomFolderExists = fs.existsSync('./audio/' + roomName);

                if(!roomFolderExists) mkdir('./audio/' + roomName, (err) => {
                    console.error(err);
                });

                const fileStream = fs.createWriteStream('./audio/' + roomName + '/song.mp3');

                fetch(url).then(response => {
                    const downloadFile = response.body.pipe(fileStream);

                    downloadFile.on('finish', () => {
                        const username = user.username;
                        io.to(roomName).emit('queue song', {url: 'localhost:8787/audio/' + roomName + '/song.mp3', name: username, service: service, info: details});
                    });
                });

                /*const username = user.username;
                io.to(roomName).emit('queue song', {url: url, name: username, serivce: service, info: details});*/
            })
        });

        socket.on('skip request', (apiKey) => {
            if(reqMade === true) return;
            skipReqs += 1;
            if(skipReqs > (io.sockets.adapter.rooms[roomName].length / 2)) {
                io.to(roomName).emit('skip');
                reqMade = false;
                skipReqs = 0;
                return;
            } else {
                sql.get('SELECT username, avatar, display FROM users WHERE apiKey = $key', [$key=apiKey])
                .then(req => {
                    io.to(roomName).emit('skip request', { req });
                    reqMade = true;
                    return;
                });
            }
        });
    });

    socket.on('leave room', (roomName) => {
        console.log(socket.rooms);

        // This triggers when a user leaves the room.
        socket.leave(roomName, (err) => {
            if(err) console.error(err);

            sql.get('SELECT username, display, avatar FROM users WHERE apiKey = $key', [$key=apiKey])
            .catch(err => {
                console.error(err);
            })
            .then(user => {
                io.to(roomName).emit('user left', user);
            })

            // Remove listeners, they don't need them anymore.
            socket.removeListener('chat text', (message, apiKey) => {
                if(message == '' || !apiKey) return;
                sql.get('SELECT * FROM users WHERE apiKey = $key', [$key=apiKey])
                .then(user => {
                    if(!user) return;
                    const username = user.username;
                    const avatar = user.avatar;
                    io.to(roomName).emit('chat text', {message, username, avatar});
                })
            });

            socket.removeListener('add to queue', (url, apiKey, details) => {
                if(!url || !apiKey) return;
                sql.get('SELECT * FROM users WHERE apiKey = $key', [$key=apiKey])
                .then(user => {
                    if(!user) return;
                    const username = user.username;
                    io.to(roomName).emit('queue song', {url, username, details});
                })
            });

            io.to(socket.id).emit('status', {message: 'Left room ' + roomName});
            // Confirm they left the room without error
        });
    });

});

http.listen(8787, () => {
    console.log("Spark's backend up on port 8787."); // Actually start up the backend
    console.log("localhost:8787");
});