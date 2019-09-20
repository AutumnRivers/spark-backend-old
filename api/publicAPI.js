/*
This is the public API for Spark. Public user and public room info can easily be found here.
For more information, visit https://sparkapp-backend.herokuapp.com/docs.html

This code is licensed the MIT OSS License: https://opensource.org/licenses/MIT

©2019 Diamond Grid Web, Nati R (SmartieCodes)
*/

const router = require('express').Router();
const sql = require('sqlite');
sql.open('./database.sqlite');

router.get('/user/:username', (req, res, next) => {
    const username = req.params.username;
    sql.get('SELECT username, email, display, avatar, verified, public FROM users WHERE username = $param', [$param=username])
    .catch(err => {
        console.error(err);
    })
    .then(user => {
        if(!user) {
            res.status(404);
            res.send('User not found');
            return;
        } else if(user.public == 'false') {
            res.status(403);
            res.send('Forbidden');
            return;
        } else {
            res.status(200);
            res.set('Content-Type', 'application/json');
            res.send(user);
            return;
        }
    });
});

router.get('/room/:id', (req, res, next) => {
    const roomId = req.params.id;
    sql.get('SELECT * FROM rooms WHERE id = $param', [$param=roomId])
    .catch(err => { 
        console.error(err);
    })
    .then(room => {
        if(!room) {
            res.status(404);
            res.send('Room not found');
            return;
        } else if(room.pass) {
            res.status(403);
            res.send('Forbidden');
            return;
        } else {
            res.status(200);
            res.set('Content-Type', 'application/json');
            const admins = JSON.parse(room.admins);
            res.send({
                "room":{
                    "name":room.name,
                    "id":room.id,
                    "admin":{
                        "owner":room.owner,
                        "admins":admins,
                        "public":true
                    }
                }
            });
            return;
        }
    });
});

router.get('/', (req, res, next) => {
    res.redirect('/docs.html');
    return;
});

module.exports = router;