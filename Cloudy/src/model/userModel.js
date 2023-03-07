const mongoose = require("mongoose");
const bkfd2Password = require("pbkdf2-password");
const hash = bkfd2Password();
const {MONGODB} = require("../keys/credentials");
const uri = `mongodb+srv://${MONGODB.user}:${MONGODB.password}@${MONGODB.cluster}/?retryWrites=true&w=majority`;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    salt: {
        type:String,
        required: true
    }
},
{
    statics: {
        authenticate(user, pwd, callback) {
            this.findOne({username: user}, function(err, doc){
                if (doc){
                    console.log("Found one");
                    console.log("Salt: ", doc.salt);
                    hash({password: pwd, salt: doc.salt}, function(err,pass,salt,hashed){
                        if (err) return err;
                        if (hashed === doc.password){
                            return callback(user);
                        }
                        else{
                            
                            console.log("Password didn't match");
                            return callback(null);
                        }
                    })
                }
                else{ 
                    console.log("Username doesn't exist");
                    return callback(null);
                }
            });
        },
      checkDuplicate(username, callback){ // Just added parameters so I could use the callback lol
        console.log("1"); // duplicate function implementation 
        return callback();
      }
    }
 });

const User = mongoose.model("user", userSchema);

async function seedUser(){
    await mongoose.connect(uri).catch(console.log);
    User.findOne({username: "LEE123"}, async function(err, doc) {
        if (doc){
            console.log("DB already exists");
            return null
        }

        else{
            let alphaUser = new User({
                username: "LEE123",
                password: " ",
                salt: " "
            });

            hash({password: "5523"}, function(err, pass, salt, hashed) {
                if (err) throw err;
                alphaUser.password = hashed;
                alphaUser.salt = salt;
            });

            await mongoose.connection.db.dropCollection("users");
            console.log("User collection seeded");
        
            return result = await alphaUser.save()
        }
    })
  }

async function addUser(uname, pwd, uri){

    let aUser = new User({
        username: uname,
        password: pwd,
        salt: " "
    });

    hash({password: aUser.password}, function(err, pass, salt, hashed) {
        if (err) throw err;
        aUser.password = hashed;
        aUser.salt = salt;
    });

    
    setTimeout(() => {aUser.save()}, 3000);
}

module.exports = {
    User: User,
    seedUser: seedUser,
    addUser: addUser
}
