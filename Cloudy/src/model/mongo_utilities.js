const mongodb = require("mongodb")

/**
 * Gets a GridFSBucket to access files on the MongoDB server
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @returns GridFSBucket for the database (dbName)
 */
function getBucket(client, dbName) {
  return new mongodb.GridFSBucket(client.db(dbName))
}

/**
 * Gets a list of files from a MongoDB server using GridFS (Does not include duplicate files)
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @param {MongoDB Object filter} filter
 * @returns An array of objects containing file information
 */
async function getFiles(client, dbName, filter = {}) {
  const cursor = getBucket(client, dbName).find(filter)
  let fileData = []
  await cursor.forEach((doc) => fileData.push(doc))
  return fileData
}

/**
 * Gets a list of unique files from a list of fs.files data
 * @param {file data following the MongoDB schema} files
 * @returns
 */
function getUniqueFilenames(files) {
  let filenames = []
  for (data of files) {
    if (filenames.indexOf(data.filename) === -1)
      // unique file
      filenames.push(data.filename)
  }
  return filenames
}

/**
 * Uploads a file from disc storage to the MongoDB server
 * @param {Name of a database} dbName
 * @param {Path of the target file} filepath
 */
async function uploadFile(dbName, filepath) {
  await client.connect()
  const bucket = getBucket(client, dbName)
  fs.createReadStream(filepath).pipe(
    bucket.openUploadStream(path.basename(filepath), {
      metadata: {},
    })
  )
  await client.close()
}

/**
 * Creates a download stream to be used to download files from the MongoDB server
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @param {Name of the file} filename
 * @returns A readable stream for the file on the MongoDB server
 */
async function createDownloadStream(client, dbName, filename) {
  const bucket = getBucket(client, dbName)
  return bucket.openDownloadStreamByName(filename)
}

/**
 * Creates an upload stream to be used to upload data to the MongoDB server
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @param {Name of the file} filename
 * @returns A writeable stream for MongoDB server
 */
async function createUploadStream(client, dbName, filename) {
  const bucket = getBucket(client, dbName)
  return bucket.openUploadStream(filename)
}

/**
 * Checks if the filename matches any files in the MongoDB database
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @param {Name of the file} filename
 * @returns a boolean value, true if the file exists
 */
async function dbFileExists(client, dbName, filename) {
  let cursor = getBucket(client, dbName).find({ filename: filename })
  const all = await cursor.toArray()
  return all.length > 0
}

/**
 * Deletes all files matching the filename in the given MongoDB database
 * @param {MongoClient} client
 * @param {Name of a database} dbName
 * @param {Name of the file} filename
 */
async function deleteFile(client, dbName, filename) {
  const bucket = getBucket(client, dbName)
  const files = await getFiles(client, dbName, { filename })
  for (file of files) {
    bucket.delete(file._id)
  }
}

module.exports = {
  dbFileExists,
  createUploadStream,
  createDownloadStream,
  uploadFile,
  getUniqueFilenames,
  getFiles,
  getBucket,
  deleteFile,
}
