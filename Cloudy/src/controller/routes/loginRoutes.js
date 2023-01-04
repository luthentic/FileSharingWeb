const express = require('express');
const {User, seedUser, addUser} = require("../../model/userModel");
const session = require("express-session");
const router = express.Router();
var client;
seedUser(client);

const parser = express.urlencoded({extended: false});
const userSession = session({
    name: "session",
    secret: "secrets",
});

//Middleware
router.use((req,res,next) =>{
    req.model = User;
    next();
});

//Login Routes
router.route("/")
    .get((req,res) =>{
        res.render("login.njk");
    })
    .post(parser, userSession, async (req,res) =>{
    req.model.authenticate(req.body.username, req.body.password, function(user) {
        if (user) {
            console.log("Logged in", user);
            req.session.regenerate( function(err) {
                req.session.user = user;
                res.redirect("/files");
            });
        }
        else{
            res.redirect("/");
        }
    })
});

//Registration Routes
router.route("/register")
    .get((req,res) =>{
        res.render("register.njk");
    })
    .post(parser, async(req,res) =>{
        req.model.checkDuplicate(req.body.username, function(user) {
            if (user) {
                res.send("Username taken!");
            }
            else{
                console.log(req.body);
                addUser(req.body.username, req.body.password);
                setTimeout(() =>{
                    res.redirect("/");
                }, 2000);
            }
        })
    });

//Logout (needs to be implemented on a logout button)
router.route("/logout").get((req,res) =>{
    req.session.destroy( () => {res.redirect("/")});
});

function configure(mongoClient){
    client = mongoClient;
    return router;
}
module.exports = configure;
