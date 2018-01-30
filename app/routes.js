var isEmail = require('is-email');
var shortid = require('shortid');
var nodemailer = require('nodemailer');
var crypto = require('crypto');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'contactmixedup@gmail.com',
        pass: 'REDACTED'
    }
});

function hashPassword(password) {
    var hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

module.exports = function(app, passport, db) {
    //GET Route for index page
    app.get('/', function(req, res) {
        if(req.isAuthenticated()) return res.redirect("/home");
        return res.render("index", { message: req.flash("error"), "user": req.user });

    });

    app.use(isLoggedIn);

    app.get('/admin', function(req, res) {
        db.all("SELECT * FROM tickets", function(err, rows) {
            if (err) return res.status(500).end("Error retrieving tickets");

            var tickets = rows;


            db.all("SELECT * FROM users", function(err, rows) {
                if (err) return res.status(500).end("Error retrieving users");

                var schools = rows;

                return res.render("admin.ejs", { 'user': req.user, 'schools': schools, 'tickets': tickets, "message": req.flash("info") });
            })

        });
    });

    app.get('/allTickets', function(req, res) {
        db.all("SELECT * FROM tickets", function(err, rows) {
            if (err) return res.status(500).end("Error retrieving tickets");

            var tickets = rows;


            db.all("SELECT * FROM users", function(err, rows) {
                if (err) return res.status(500).end("Error retrieving users");

                var schools = rows;

                return res.render("allTickets.ejs", { 'user': req.user, 'schools': schools, 'tickets': tickets, "message": req.flash("info") });
            })

        });
    });

    app.get('/home', function(req, res) {
        return res.render("home.ejs", { 'user': req.user });
    });

    app.get('/logout', function(req, res) {
        req.logout();
        req.flash("Successfully logged out");
        return res.redirect("/");
    });


    //data and ticket
    app.get('/ticket', function(req, res) {
        console.log(req.user.username + " is fetching tickets");
        db.all("SELECT * FROM tickets WHERE school = ?", req.user.username, function(err, rows) {
            if (err) return res.status(500).end("Error retrieving tickets");
            console.log(rows);
            var tickets = rows;
            return res.render("ticket.ejs", { 'user': req.user, 'tickets': tickets, 'message': req.flash("info") });
        });

    });

    app.post('/add', function(req, res) {
        if (req.body.hasOwnProperty("email") && isEmail(req.body.email)) {

            var confirmCode = shortid.generate();

            db.run("INSERT INTO tickets (email, confirmationCode,school) VALUES (?,?,?)", req.body.email, confirmCode, req.user.username, function(err) {
                console.log(err);
                if (err) return res.status(500).end("Error adding ticket");
                else {
                    req.flash("Successfully added " + req.body.email + " c:" + confirmCode);


                    //now send an email confirming contents
                    var emailContents = {
                        from: 'The Mixed Up! Crew @ NIST <contactmixedup@gmail.com>',
                        to: req.body.email,
                        subject: 'Your Mixed Up! Ticket Confirmation',
                        text: "Hey there, \n\nYou're receiving this email because you've bought a ticket for Mixed Up!.\n\n Here is your confirmation code: " + confirmCode + "\n\nPlease make sure to bring your ticket or this email for the event. Thank you for supporting the Love Wildlife Foundation's Slow Loris Conservation Program. We're looking forward to seeing you there!\n\nSincerely,\nThe Mixed Up! Crew",

                    };

                    transporter.sendMail(emailContents, function(err, info) {
                        if (err) console.log(err);
                        else console.log("Successfully sent confirmation email to " + req.body.email + ". Code: " + confirmCode);
                    });


                    return res.redirect('/ticket');
                }

            })
        } else {
            req.flash("info", "Invalid Email");
            return res.redirect('/ticket');
        }
    });

    app.post('/delete', function(req, res) {
        console.log("Delete request received from " + req.user.username);
        console.log(req.body);
        if (req.body.hasOwnProperty("confirmationCode")) {
            console.log("Code found in delete request:" + req.body.confirmationCode);
            //check that it is their school's ticket

            var sql = "SELECT * FROM tickets WHERE school = ? AND confirmationCode = ?";
            var parameters = [];
            if (req.user.role == 2) {
                sql = "SELECT * FROM tickets WHERE confirmationCode = ?"; //nist is doing it, automatically allow bypass
                parameters = [req.body.confirmationCode];
            } else {
                sql = "SELECT * FROM tickets WHERE school = ? AND confirmationCode = ?"
                parameters = [req.user.username, req.body.confirmationCode];
            }


            db.get(sql, parameters, function(err, row) {
                if (!row) return res.status(500).end("Not your ticket or the ticket doesn't exist");

                //else
                console.log("To-be-deleted ticket found");
                var emailAddress = row.email;

                db.run("UPDATE tickets SET deleted = 1 WHERE confirmationCode = ?", req.body.confirmationCode, function(err) {

                    if (err) {
                        return res.status(500).end("Couldn't delete");
                    }

                    //else
                    //now send an email confirming deletion
                    var emailContents = {
                        from: 'The Mixed Up! Crew @ NIST <contactmixedup@gmail.com>',
                        to: emailAddress,
                        subject: 'Your Mixed Up! Ticket has been cancelled',
                        text: "Hey there, \n\nWe have cancelled your ticket for Mixed Up! with confirmation code " + req.body.confirmationCode + ". If you believe this was in error, please email us back.\n\nSincerely,\nThe Mixed Up! Crew",

                    };


                    transporter.sendMail(emailContents, function(err, info) {
                        if (err) console.log(err);
                        else console.log("Successfully sent delete confirmation for " + req.body.confirmationCode + " to " + emailAddress);
                    });


                    return res.end("Successfully deleted ticket");


                });
            })
        }
    });

    app.post("/adjustAllocation", isAdmin, function(req, res) {
        //expect schoolName and newAllocation
        if (req.body.hasOwnProperty("schoolName") && req.body.hasOwnProperty("newAllocation") && !isNaN(req.body.newAllocation)) {

            db.run("UPDATE users SET allocatedTickets = ? WHERE username = ?", req.body.newAllocation, req.body.schoolName, function(err) {
                if (err) console.log(err);
                return res.redirect('/admin');
            });



        } else {
            return res.status(500).end("Invalid Parameters, please check again");
        }
    });

    app.post('/signup', isAdmin, function(req, res) {
        //parameter for schoolName and newPassword and allocatedTickets

        if (req.body.hasOwnProperty("schoolName") && req.body.hasOwnProperty("newPassword") && req.body.hasOwnProperty("allocatedTickets")) {

            var hashedpw = hashPassword(req.body.newPassword);

            db.run("INSERT INTO users (username, password, allocatedTickets) VALUES (?,?,?)", req.body.schoolName, hashedpw, req.body.allocatedTickets, function(err) {
                if (err) {
                    console.log(err);
                    req.flash("info", "Error adding new user");
                } else {
                    req.flash("info", "Successfully added new user");
                }

                return res.redirect('/admin');
            });


        } else {
            return res.status(500).end("Invalid Parameters, please check again");
        }

    });

    app.post("/changepw", isAdmin, function(req, res) {
        //expect schoolName and newPassword
        if (req.body.hasOwnProperty("schoolName") && req.body.hasOwnProperty("newPassword")) {

            var hashedpw = hashPassword(req.body.newPassword);

            db.run("UPDATE users SET password = ? WHERE username = ?", hashedpw, req.body.schoolName, function(err) {
                if (err) {
                    console.log(err);
                    req.flash("info", "error changing password");
                } else {
                    req.flash("info", "Successfully changed password");
                }


                return res.redirect('/admin');
            });


        } else {
            return res.status(500).end("Invalid Parameters, please check again");
        }
    });

    //warning highly destructive
    app.post("/deleteUser", isAdmin, function(req, res) {
        //expect schoolName and newAllocation
        if (req.body.hasOwnProperty("schoolName")) {

            db.run("DELETE FROM users WHERE username = ?", req.body.schoolName,
                function(err) {
                    if (err) console.log(err);
                    req.flash("info", "Successfully deleted school");
                    return res.redirect('/admin');
                });



        } else {
            return res.status(500).end("Invalid school name, please check again");
        }
    });



    function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) { return next(); }

        //else return to home
        return res.redirect('/');
    }

    function isAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user.role == 2) { return next(); }

        //else return to home
        req.flash("info", "insufficient permission to do this");
        return res.redirect('/');
    }


}