var crypto = require('crypto');
var LocalStrategy = require('passport-local').Strategy;


module.exports = function(app, passport, db) {
    function hashPassword(password) {
        var hash = crypto.createHash('sha256');
        hash.update(password);
        return hash.digest('hex');
    }


    passport.use(new LocalStrategy(function(username, password, done) {
        db.get('SELECT username, id, role FROM users WHERE username = ? AND password = ?', username, hashPassword(password), function(err, row) {
            if (!row) return done(null, false, { message: "Username or password incorrect" });
            return done(null, row);
        });
    }));

    passport.serializeUser(function(user, done) {
        return done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        db.get('SELECT * FROM users WHERE id = ?', id, function(err, row) {
            if (!row) return done(null, false);
            return done(null, row);
        });
    });

    // ...

    app.post('/login', passport.authenticate('local', {
        successRedirect: '/home',
        failureRedirect: '/',
        failureFlash: true
    }));



}