/*
This is the private API for Spark. Methods can be called here, private user data can be found, so long as the API key passed in the "Authorization" header matches.
For more information, visit https://sparkapp-backend.herokuapp.com/docs.html

This code is licensed the MIT OSS License: https://opensource.org/licenses/MIT

©2019 Diamond Grid Web, Nati R (SmartieCodes)
*/

const router = require('express').Router();
const sql = require('sqlite');
sql.open('./database.sqlite');

function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

router.use((req, res, next) => {
    if(!req.get('Authorization')) {
        res.status(401);
        res.send('Unauthorized');
        return;
    } else {
        sql.get('SELECT * FROM users WHERE apiKey = $header', [$header=req.get('Authorization')])
        .catch(err => {
            console.error(err);
        })
        .then(user => {
            if(!user) {
                res.status(403);
                res.send('Forbidden');
                return;
            } else {
                next();
                return;
            }
        });
    }
});

router.get('/me', (req, res, next) => {
    sql.get('SELECT * FROM users WHERE apiKey = $header', [$header=req.get('Authorization')])
    .catch(err => { console.error(err) })
    .then(user => {
        res.status(200);
        res.set('Content-Type', 'application/json');
        res.send(user);
        return;
    });
});

router.get('/room/:id', (req, res, next) => {
    const roomId = req.params.id;
    if(!roomId) {
        res.status(400);
        res.send('Missing Room ID');
        return;
    } else {
        sql.get('SELECT * FROM rooms WHERE id = $param', [$param=roomId])
        .catch(err => { console.error(err) })
        .then(room => {
            if(!room) {
                res.status(404);
                res.send('Room not found');
                return;
            } else if(room.pass && req.get('Room-Password')) {
                if(req.get('Room-Password') === room.pass) {
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
                                "public":false
                            }
                        }
                    });
                    return;
                } else {
                    res.status(403);
                    res.send('Forbidden');
                    return;
                }
            } else if(room.pass && !req.get('Room-Password')) {
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
            }
        });
    }
});

router.put('/me/:method', (req, res, next) => {
    const method = req.params.method
    if(!method || method !== 'display' && method !== 'avatar') {
        res.status(400);
        res.send('Bad Request');
        return;
    } else {
        sql.get('SELECT * FROM users WHERE apiKey = $header', [$header=req.get('Authorization')])
        .catch(err => { console.error(err) })
        .then(user => {
            if(method === 'display') {
                if(!req.query.newDisplay) {
                    res.status(400);
                    res.send('Missing new display name');
                    return;
                } else {
                    sql.run('UPDATE users SET display = $query WHERE apiKey = $header', [$query=req.query.newDisplay, $header=req.get('Authorization')])
                    .catch(err => { console.error(err) })
                    .then(() => {
                        res.status(200);
                        res.send('OK');
                        return;
                    });
                }
            } else if(method === 'avatar') {
                if(!req.query.newAvatar) {
                    res.status(400);
                    res.send('Missing new avatar');
                    return;
                } else {
                    sql.run('UPDATE users SET avatar = $query WHERE apiKey = $header', [$query=req.query.newAvatar, $header=req.get('Authorization')])
                    .catch(err => { console.error(err) })
                    .then(() => {
                        res.status(200);
                        res.send('OK');
                        return;
                    });
                }
            }
        });
    }
});

router.post('/room/:id/admins', (req, res, next) => {
    const roomId = req.params.id;
    if(!roomId || !req.query.newAdmin) {
        res.status(400);
        res.send('Bad Request');
        return;
    } else {
        sql.get('SELECT username FROM users WHERE apiKey = $header', [$header=req.get('Authorization')])
        .catch(err => { console.error(err) })
        .then(username => {
            sql.get('SELECT * FROM rooms WHERE id = $param', [$param=roomId])
            .catch(err => { console.error(err) })
            .then(room => {
                if(!room) {
                    res.status(404);
                    res.send('Room not found');
                    return;
                } else {
                    const admins = JSON.parse(room.admins);
                    if(room.owner !== username && !admins.includes(username)) {
                        res.status(403);
                        res.send('Forbidden');
                    } else {
                        sql.get('SELECT * FROM users WHERE username = $new', [$new=req.query.newAdmin])
                        .catch(err => { console.error(err) })
                        .then(user => {
                            if(!user) {
                                res.status(404);
                                res.send('User not found');
                                return;
                            } else {
                                admins.push(user.username);
                                const adminsString = JSON.stringify(admins);
                                sql.run('UPDATE rooms SET admins = $list WHERE id = $id', [$list=adminsString, $id=roomId])
                                .catch(err => { console.error(err) })
                                .then(() => {
                                    res.status(200);
                                    res.send('OK');
                                    return;
                                })
                            }
                        })
                    }
                }
            });
        });
    }
});

router.delete('/room/:id/admins', (req, res, next) => {
    const roomId = req.params.id;
    if(!roomId || !req.query.newAdmin) {
        res.status(400);
        res.send('Bad Request');
        return;
    } else {
        sql.get('SELECT username FROM users WHERE apiKey = $header', [$header=req.get('Authorization')])
        .catch(err => { console.error(err) })
        .then(username => {
            sql.get('SELECT * FROM rooms WHERE id = $param', [$param=roomId])
            .catch(err => { console.error(err) })
            .then(room => {
                if(!room) {
                    res.status(404);
                    res.send('Room not found');
                    return;
                } else {
                    const admins = JSON.parse(room.admins);
                    if(room.owner !== username) {
                        res.status(403);
                        res.send('Forbidden');
                    } else {
                        sql.get('SELECT * FROM users WHERE username = $new', [$new=req.query.newAdmin])
                        .catch(err => { console.error(err) })
                        .then(user => {
                            if(!user) {
                                res.status(404);
                                res.send('User not found');
                                return;
                            } else {
                                if(!admins.includes(user.username)) {
                                    res.status(400);
                                    res.send('User is not an admin.');
                                    return;
                                } else {
                                    const newList = removeA(admins, user.username);
                                    var listString = JSON.stringify(newList);
                                    sql.run('UPDATE rooms SET admins = $list WHERE id = $param', [$list=listString, $param=req.params.id])
                                    .catch(err => { console.error(err) })
                                    .then(() => {
                                        res.status(200);
                                        res.send('OK');
                                        return;
                                    })
                                }
                            }
                        });
                    }
                }
            });
        });
    }
});

module.exports = router;