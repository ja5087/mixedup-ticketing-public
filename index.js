//mixed up ticketing system FAST

var port = process.env.PORT || 8080

var path = require('path');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();
var passport = require('passport');
var flash = require('connect-flash');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);


//set up users db
var db = new sqlite3.Database('data.db');

//set up tables and NIST admin account 

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS users (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "username TEXT UNIQUE," +
        "password TEXT," +
        "allocatedTickets INTEGER DEFAULT 0," +
        "role INTEGER DEFAULT 1)");


    db.get('SELECT username, id FROM users WHERE username = ?', "NIST", function(err, row) {

        if (!row) {
            db.run("INSERT INTO users (username, password, role) VALUES (?,?,?)", "NIST", "fbe0c4d0f04d52598f32d6bb756dd313f2e83f362d0acddd8b94104bdf958935", 2, function(err) {
                if (err) console.log(err + "error in creating NIST user");
                else console.log("success creating NIST user");
            });
        }

    });
    db.run("CREATE TABLE IF NOT EXISTS tickets (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "email TEXT," +
        "confirmationCode TEXT," +
        "deleted INTEGER DEFAULT 0," +
        "school TEXT," +
        "FOREIGN KEY(school) REFERENCES users(username))");
});






//use body-parser and sessions
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    store: new SQLiteStore,
    secret: 'REDACTED',
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week 
    resave: false,
    saveUninitialized: false
}));
app.use(morgan('dev')); //log every request

//use static
app.use('/static', express.static(path.join(__dirname, 'static')));


//use ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));





//passport

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//passport config
require('./config/passport.js')(app, passport, db);

//routes 
require('./app/routes.js')(app, passport, db);

//start app

app.listen(port, function() {
    console.log("successful start mixeduptickets port 8080");
})