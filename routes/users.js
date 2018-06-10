var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var mongoose = require('mongoose');
var mongodb     = require('mongodb');
var MongoClient = mongodb.MongoClient;
const bcrypt = require('bcryptjs');

var User = require('../models/user');




//Auths
var configAuth = require('./auth');
//Login purposes
router.get('/login',function(req,res){
  res.render('login');
});

  router.post('/login', passport.authenticate('local', {
		successRedirect: '/users/index',
		failureRedirect: '/users/login',
		failureFlash: true
	}));

//Registering Users

router.get('/register',function(req,res){
  res.render('register');
});


router.post('/register',function(req,res){
  var name=req.body.name;
  var email=req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  var password2 = req.body.password2;



  //Validation
  req.checkBody('name','Name is required').notEmpty();
  req.checkBody('email','Email is required').notEmpty();
  req.checkBody('email','Email is not valid').isEmail();
  req.checkBody('username','Username is required').notEmpty();
  req.checkBody('password','Password is required').notEmpty();
  req.checkBody('password2','Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();


  if(errors){
    res.render('register',{
      errors:errors
    });
  } else {
    var newUser = new User();
      newUser.local.name = name;
      newUser.local.email = email;
      newUser.local.username = username;
      newUser.local.password = password;
      newUser.local.author = newUser._id;
      //newUser.local.author = req.user._id;
      console.log(newUser._id);
    User.createUser(newUser,function(err,user){
      if(err) throw err;
      console.log(user);
    });
    req.flash('success_msg','You are now a registered user and can now login with your credentials');

    res.redirect('/users/login');
  }
});

router.get('/index',ensureAuthenticated, function(req, res){

  res.render('index', { layout: 'hero' // get the user out of session and pass to template


})
    //res.render('index',{title: 'my other page',layout: 'hero'});
});


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.use('local', new LocalStrategy({
			usernameField: 'username',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, username, password, done){
			process.nextTick(function(){
				User.findOne({ 'local.username': username}, function(err, user){
					if(err)
						return done(err);
					if(!user)
						return done(null, false, req.flash('loginMessage', 'No User found'));
            if(password == user.local.password){
              return done(null ,user);
            }else{
              return done(null, false, {message: 'wrong passwotd'});
            }


				});
			});
		}
	));

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});


router.get('/logout',function(req,res){
  req.logout();

  req.flash('success_msg', 'You are logged out');

  res.redirect('/users/login');
});








//Google routes

passport.use(new GoogleStrategy({
	    clientID: configAuth.googleAuth.clientID,
	    clientSecret: configAuth.googleAuth.clientSecret,
	    callbackURL: configAuth.googleAuth.callbackURL
	  },
	  function(accessToken, refreshToken, profile, done) {
	    	process.nextTick(function(){
	    		User.findOne({'google.id': profile.id}, function(err, user){
	    			if(err)
	    				return done(err);
	    			if(user)
	    				return done(null, user);
	    			else {
	    				var newUser = new User();
	    				newUser.google.id = profile.id;
	    				newUser.google.token = accessToken;
              newUser.google.email = profile.emails[0].value;
	    				newUser.google.name = profile.displayName;
              newUser.google.author = newUser._id;


	    				newUser.save(function(err){
	    					if(err)
	    						throw err;
	    					return done(null, newUser);
	    				})
	    				console.log(profile);
	    			}
	    		});
	    	});
	    }

	));



      //Googleroute


  router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));

	router.get('/google/callback',
	  passport.authenticate('google', { successRedirect: '/users/index',
	                                      failureRedirect: '/' }));


  //TwitterStrategy

  passport.use(new TwitterStrategy({
    consumerKey:    configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function() {
      User.findOne({'twitter.id' : profile.id}, function(err,user){
        if(err)
          return done(err);
        if(user){
          return done(null,user);
        }else{
          var newUser = new User();
          newUser.twitter.id = profile.id;
          newUser.twitter.token = token;
          newUser.twitter.username = profile.username;
          newUser.twitter.displayName = profile.displayName;
          newUser.twitter.author = newUser._id;

          newUser.save(function(err) {
            if(err)
              throw err;
            return done(null, newUser);
          });

        }
      });

    });

  }));


router.get('/twitter', passport.authenticate('twitter'));

router.get('/twitter/callback', passport.authenticate('twitter', {
  successRedirect : '/users/index',
  failureRedirect : '/'
}));

router.get('/edit_local',ensureAuthenticated, function(req,res){
  console.log(req.user.local.email);
  res.render('edit_local',{layout: 'hero'});
  //console.log(req.params.id);
});





router.post('/edit_local', function(req, res, next){


  MongoClient.connect('mongodb://localhost/UserAuthentication', function(err, db) {

    if(err) { throw err; }

    var collection   = db.collection('users');
    var author = req.body.author;
    var email = req.body.email;
    var name     = req.body.name;
    var username = req.body.username;
    var password = req.body.password;

    collection.update({'_id':new mongodb.ObjectID(req.body.author)},
    { $set: {'local.email': email, 'local.name': name ,'local.username': username,'local.password':password, 'localauthor':author} }, function(err, result) {

      if(err) {
        console.log(local.email);

        throw err; }

      db.close();

      res.redirect('/index');
      req.flash('success_msg','Your credentials have been updated!!');

    });

  });

});


router.get('/edit_google',ensureAuthenticated, function(req,res){
  res.render('edit_google',{layout: 'hero'});
  //console.log(req.params.id);
});

router.post('/edit_google', function(req, res, next){

  MongoClient.connect('mongodb://localhost/UserAuthentication', function(err, db) {

    if(err) { throw err; }

    var collection   = db.collection('users');
    var author = req.body.author;
    var email = req.body.email;
    var name     = req.body.name;


    collection.update({'_id':new mongodb.ObjectID(req.body.author)},
    { $set: {'google.email': email, 'google.name': name , 'google.author':author} }, function(err, result) {

      if(err) {
        throw err; }

      db.close();

      res.redirect('/');
      req.flash('success_msg','Your credentials have been updated!!');

    });

  });

});

router.get('/edit_twitter',ensureAuthenticated, function(req,res){
  res.render('edit_twitter',{layout: 'hero'});
  //console.log(req.params.id);
});

router.post('/edit_twitter', function(req, res, next){

  MongoClient.connect('mongodb://localhost/UserAuthentication', function(err, db) {

    if(err) { throw err; }
    var collection   = db.collection('users');
    var author = req.body.author;
    var username = req.body.username;
    var displayname     = req.body.displayname;


    collection.update({'_id':new mongodb.ObjectID(req.body.author)},
    { $set: {'twitter.username': username, 'twitter.displayname': displayname , 'twitter.author':author} }, function(err, result) {

      if(err) {
        throw err; }

      db.close();

      res.redirect('/');
      req.flash('success_msg','Your credentials have been updated!!');

    });

  });

});

function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }else{
    //req.flash('error_msg','You are not logged in');
    res.redirect('/users/login');
  }
}


module.exports = router;
