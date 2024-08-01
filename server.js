/*
Web322 Assignment Summer 2024
Seneca Polytechnic
Author: Tashi Paljor
*/

const HTTP_PORT = process.env.PORT || 3000;
const express = require("express");
const fs = require("fs");
const exphbs = require("express-handlebars");
const session = require("express-session");
const path = require("path");
const redis = require("redis");
const RedisStore = require("connect-redis").default;
const randomStr = require("randomstring");

//importing the login router
const loginRouter = require("./routes/loginRouter");

//environment variables from .env file (if it exists)
//incase of server restarts, many users connected with each session
//redis will keep the session alive, not depending on local server
//redis is persistence 
require('dotenv').config();

//mongodb configuation
const { MongoClient, ObjectId } = require("mongodb");
const uri = "mongodb+srv://tapaljor:A81Z6ZvQjnhud1Xx@tpcluster.pmqosjh.mongodb.net/?retryWrites=true&w=majority&appName=TPCluster";

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views', 'public')));

// Handlebars setup
app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: false,
    layoutsDir: path.join(__dirname, "/views")
}));
app.set("view engine", ".hbs");

app.set("trust proxy", 1); // Trust first proxy

// Redis client setup
const redisClient = redis.createClient({
    password: '5pEUA24ccySEaYmsDl1OMEPhFQYIiEi6',
    socket: {
        host: 'redis-13712.c302.asia-northeast1-1.gce.redns.redis-cloud.com',
        port: 13712
    }
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisClient.connect().then(() => {
    console.log('Connected to Redis server');
    const redisStore = new RedisStore({ client: redisClient, ttl: 260 });

    //using Redis for session management
    app.use(session({
        store: redisStore, //instead of storing in server, now Redis manages session
        secret: process.env.SESSION_SECRET || randomStr.generate(),
        saveUninitialized: true,
        resave: false,
        cookie: { expires: 180000 } //3 minutes 
    }));

    //using login router
    app.use('/', loginRouter);

    //starting the server
    app.listen(HTTP_PORT, () => {
        console.log(`Listening to port: ${HTTP_PORT}`);
    });

    function checkAuthentication(req, res, next) {
        if (!req.session.TPSession) {
            return res.redirect('/signout');
        }
        next();
    }

    (async () => { //working on mongodb
        let conect, db;

        try {
            //connection to mondo db
            connect = await MongoClient.connect(uri);
            console.log(`Mongo db connected.`);

            db = connect.db("libarary");
        } catch (err) {
            console.error(err);
            return;
        }
        app.get("/home/s", checkAuthentication, async (req, res) => {
            try {
                let borrowedBooks;
                const data = await db.collection("clients").find({
                    Username: req.session.TPSession,
                }).toArray(); //get the logged user books borrowed
                if (data.length > 0) {
                    // Fetch the books details based on borrowed books ids
                    borrowedBooks = await db.collection("books").find({
                        ID: { $in: data[0].IDBooksBorrowed }
                        //sql version of select* IN(1,23,3)..
                    }).toArray();
                }
                //not available books
                let booksAvailable = await db.collection("books").find({
                    Available: true
                }).toArray();

                // Render the home page with the data
                res.render('home.hbs', { borrowedBooks, authorizedUser: req.session.TPSession, booksAvailable });
            } catch (err) {
                console.log(err);
            }
        });
        app.get('/signout', (req, res) => {
            if (req.session.TPSession) {
                req.session.destroy(err => {
                    if (err) return res.status(500).send("Unable to signout.");
                    res.render('index.hbs');
                });
            } else {
                res.render('index.hbs');
            }
        });
        app.post("/home/b", checkAuthentication, async (req, res) => {
            try {
                let checkedBooks = Array.isArray(req.body.booksAvailable) ? req.body.booksAvailable : [req.body.booksAvailable];
                //convert array elements into int
                checkedBooks = checkedBooks.map(bookId => parseInt(bookId, 10));

                let data = await db.collection("clients").find(
                    { Username: req.session.TPSession }
                ).toArray();
                if (data.length > 0) { //if user is there, just update borrwed books
                    //update books IDs on clients table
                    await db.collection("clients").updateOne(
                        { Username: req.session.TPSession },
                        { $addToSet: { IDBooksBorrowed: { $each: checkedBooks } } }
                        //adds to array list
                    );
                } else {//if user is in the client, just add one
                    await db.collection("clients").insertOne({
                        Username: req.session.TPSession,
                        IDBooksBorrowed: checkedBooks
                    });
                }
                await db.collection("books").updateMany(
                    { ID: { $in: checkedBooks } },
                    { $set: { Available: false } }
                );
                res.redirect('/home/s');
            } catch (err) {
                console.log(err);
            }
        });
        app.post("/home/r", checkAuthentication, async (req, res) => {
            try {
                let checkedBooks = Array.isArray(req.body.booksReturn) ? req.body.booksReturn : [req.body.booksReturn];
                //convert array elements into int
                checkedBooks = checkedBooks.map(bookId => parseInt(bookId, 10));
                await db.collection("clients").updateOne(
                    { Username: req.session.TPSession },
                    { $pull: { IDBooksBorrowed: { $in: checkedBooks } } }
                    //removes from array list
                );
                await db.collection("books").updateMany(
                    { ID: { $in: checkedBooks } },
                    //update returned books Available to true
                    { $set: { Available: true } }
                );
                res.redirect('/home/s');
            } catch (err) {
                console.log(err);
            }
        });
        app.get('/', (req, res) => res.render('index.hbs'));
        app.get("/signin", (req, res) => res.render('signin.hbs'));
        app.get("/signout", (req, res) => res.render('home.hbs'));
        app.get("*", (req, res) => res.send(`<h1 style="color: red;">Error! Please enter proper URL.</h1>`));
    })(); //mongo db async ends
}).catch(console.error);//redis connection ends

