const express = require("express");
const fs = require("fs");
const router = express.Router();

router.post("/signin", (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'users.json'), 'utf-8', (err, data) => {
        if (err) return res.status(500).send("Error reading users data.");
        let users = JSON.parse(data);
        let success = false;
        let userExists = false;
        for (const user in users) {
            if (user === req.body.username && users[user] === req.body.password) {
                success = true;
                break;
            } else if (user === req.body.username) {
                userExists = true;
            }
        }
        if (success) {
            req.session.TPSession = req.body.username;
            res.redirect('/home/s');
        } else if (userExists) {
            res.render('signin', { message: 'Invalid password', username: req.body.username });
        } else {
            res.render('signin', { message: 'Not a registered username', username: req.body.username });
        }
    });
});
module.exports = router;
