const fs = require('fs');
const path = require('path');

module.exports = class Cache {

    /**
     * Constructor for Cache Object, clears the cachrRoot directory of all files. 
     * @param {String} cacheRoot Directory to store cache
     * @param {Integer} maxCacheSize Size of the cache in bytes
     */
    constructor(cacheRoot, maxCacheSize) {
        this.cacheRoot = cacheRoot;
        this.maxCacheSize = maxCacheSize;
        
        this.cacheList = [];
        this.cacheSize = 0;
        this.clear();
    }

    /**
     * Checks the cacheList to see if there's a cached file matching the filename given 
     * @param {String} filename 
     * @returns boolean
     */
    isCached(filename) {
        for (const file of this.cacheList) {
            if (file.filename === filename)
                return true;
        }
        return false;
    }

    async deleteCacheFile(fileData) {
        await fs.promises.unlink(fileData.fileLocation);
        // Decrements the cache size by the file size
        this.cacheSize -= fileData.length;
        // Removes the fileData object from the cacheList
        this.cacheList.splice(this.cacheList.indexOf(fileData), 1);
        console.log(`Removed ${fileData.filename} from cache`);
    }

    /**
     * Clears the cache by deleting the root directory. (Might change how this works) 
     * @returns a promise resolving when the cache directory is removed
     */
    async clear() {
        try {
            for (const file of await fs.promises.readdir(this.cacheRoot)) {
                await fs.promises.unlink(path.join(this.cacheRoot, file));
            }
        } catch {
            fs.promises.mkdir(this.cacheRoot);
        }
    }

    /**
     * Stores the file on disk at cacheRoot. If the cache is full
     * the new file will replace the least requested file in the cache
     * @param {fs.files object schema} fileData
     * @param {Array} permissions a list of users with access to the file
     * @param {ReadStream} fileStream 
     */
    async cache(fileData, fileStream, permissions) {

        fileData.fileLocation = path.join(this.cacheRoot, fileData.filename);
        fileData.requests = 1;
        fileData.timeCached = new Date();
        fileData.permissions = permissions;

        if (fileData.length > this.maxCacheSize) {
            console.log(`Could not cache ${fileData.filename}, file too large.`);
            return;
        }
        while (fileData.length + this.cacheSize > this.maxCacheSize) {

            const fileToReplace = this.getLeastRequested();

            // Deletes the file on disk
            await this.deleteCacheFile(fileToReplace);
        }

        this.cacheList.push(fileData);

        const writeStream = fs.createWriteStream(fileData.fileLocation)
        fileStream.pipe(writeStream);

        writeStream.on('error', (err) => {
            throw new Error(err);
        });

        writeStream.on('close', () => {
            this.cacheSize += fileData.length;
            console.log(`Cached ${fileData.filename}`);
        });
    }

    /**
     * Gets the file data for a given file in the cache
     * @param {String} filename 
     * @returns an object containing cache information
     */
    getCacheFileData(filename) {
        for (const file of this.cacheList) {
            if (file.filename === filename)
                return file;
        }
    }

    /**
     * Calculates the request rate for a spcified cache file 
     * @param {fileData Object} fileData 
     * @returns the calculated number of requests/minute since first cached
     */
    getRequestRate(fileData) {
        const timeDiff = fileData.timeCached - Date.now(); // Time difference in milliseconds
        if (timeDiff === 0) return 1;
        return fileData.requests / (timeDiff / 60000);
    }

    /**
     * Gets the file with the lowest request rate (see getRequestRate function) 
     * @returns the file data for the least requested file
     */
    getLeastRequested() {
        let minRequests = this.getRequestRate(this.cacheList[0]);
        let minIndex = 0;
        for (var i = 1; i < this.cacheList.length; i++) {
            let requestRate = this.getRequestRate(this.cacheList[i]);
            if (requestRate < minRequests) {
                minRequests = requestRate;
                minIndex = i;
            }
        }
        return this.cacheList[minIndex];
    }

    /**
     * Requests a file from the cache 
     * @param {String} filename 
     * @param {String} user used for checking permission to access the cached file
     * @returns a ReadStream if the file is cached, undefined otherwise
     */
    request(filename, user) {
        if (!this.isCached(filename)) return;
        
        const fileData = this.getCacheFileData(filename);

        if (fileData.permissions.indexOf(user) === -1) return;

        fileData.requests++;
        return fs.createReadStream(fileData.fileLocation);
    }

}