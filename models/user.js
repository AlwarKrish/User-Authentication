var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');



//Schema to store at he back


var UserSchema = mongoose.Schema({

    local            : {
        name        : String,
        email       : String,
        username    : String,
        password    : String,
        author      : String
    },/*
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },*/
    google           : {
		    id           : String,
		    token        : String,
		    email        : String,
		    name         : String,
        author       : String
	},
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String,
        author       : String
    }
});






var User = module.exports = mongoose.model('User',UserSchema);

module.exports.createUser = function(newUser,callback){
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.passsword = hash;
        newUser.save(callback);
    });
});
}

module.exports.getUserByUsername = function(username,callback){
  var query = {username: username};

  User.findOne(local.query,callback);
}

module.exports.getUserById = function(id,callback){
  User.findById(id, callback);
}
/*
module.exports.comparePassword = function(candidatePassword, hash, callback){
      bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
          if(err)
            throw err;
          callback(null, isMatch);
});
}*/
