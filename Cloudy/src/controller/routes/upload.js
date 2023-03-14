const multiparty = require('multiparty');
const express = require('express');
const session = require("express-session");
const mongoUtils = require('../../model/mongo_utilities');
const router = express.Router();
const default_database = "cloudyFiles";

const userSession = session({
    name: "session",
    secret: "secrets",
});

var client;

/**
 * Sends a 500 error to the client 
 * @param {HTTP Response object} response 
 */
function send500(response) {
    response.writeHead(500, {'Content-Type':'text/plain'});
    response.write('Error 500: Unexpected error!');
    response.end();
}

// Using route string parameter 
router.route("/")
    .get((req, res) => {
        res.render("upload.njk");
    })
    .post(userSession, async (req, res) => {

        const database = req.session.user || default_database;

        let response = "File submitted.";

        let form = new multiparty.Form({autoFields: true});

        form.on('field', (name, value) => {
            console.log(value);
        })

        form.on('part', async (part) => {
            if (part.byteCount > 300000000) {
                response = "File is too large.";
                part.resume();
                return;
            }
            let uploadStream = await mongoUtils.createUploadStream(client, database, part.filename);

            uploadStream.on('error', (err) => {
                send500(res); // Sends 500 error if the upload fails for some reason
                console.log(err);
            });

            part.pipe(uploadStream);
        });

        form.on('close', async () => {
            res.redirect("/upload");
        });

        form.parse(req);
    });

/**
 * Passes the client to the upload route 
 * @param {MongoClient} mongoClient 
 * @returns the express.Router object for the route
 */
function configure(mongoClient) {
    client = mongoClient;
    return router;
}

module.exports = configure;
