const express = require("express")
const path = require("path")
const mongoUtils = require("../../model/mongo_utilities")
const router = express.Router()
const session = require("express-session")

const userSession = session({
  name: "session",
  secret: "secrets",
  resave: true,
  saveUninitialized: true,
})

// Set up MongoDB
const mongodb = require("mongodb")
var client
// Set up cache
const Cache = require("./cache.js")
var cache

// Custom 404- and 500-handlers
function send404(response) {
  response.writeHead(404, { "Content-Type": "text/plain" })
  response.write("Error 404: File not Found!")
  response.end()
}

router.use(userSession, async (req, res, next) => {
  const database = req.session.user

  //Handle information from http-bodies
  let file_url = decodeURI(req.path)

  if (file_url === "/") {
    const files = await mongoUtils.getFiles(client, database)
    let filenames = mongoUtils.getUniqueFilenames(files)

    res.render("index.njk", { username: database, files: filenames })
  } else {
    let filename = path.basename(file_url)

    // If the file is cached, cache.request will return a ReadStream for the file on disk
    let fileStream = cache.request(filename, req.session.user)
    if (fileStream !== undefined) {
      fileStream.pipe(res)
    } else if (await mongoUtils.dbFileExists(client, database, filename)) {
      const downloadStream = await mongoUtils.createDownloadStream(
        client,
        database,
        filename
      )

      // Gets the fileData for the file by filename
      let fileData = await mongoUtils.getFiles(client, database, {
        filename: filename,
      })
      cache.cache(fileData[0], downloadStream, [req.session.user]) // Provides the file data and ReadStream to the cache

      downloadStream.pipe(res)
    } else {
      send404(res)
    }
  }
})

/**
 * Configures the cache and passes the client to the middleware
 * { cacheSize: The size of the cache in bytes, cacheRoot: The root directory of the cache }
 * @param {MongoClient} mongoClient
 * @param {Object} settings
 * @returns the express.Router object for the middleware
 */
function configure(mongoClient, settings) {
  client = mongoClient
  client.connect()
  cache = new Cache(
    settings.cacheRoot || path.join(__dirname, "../temp"),
    settings.cacheSize || 128000 // Default size of 128KB
  )
  return router
}

module.exports = configure
