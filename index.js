const PORT = 80;
const client_id = "2154860972.7457169668";

var express = require('express')
  , passport = require('passport')
  , util = require('util');


var SlackStrategy = require('passport-slack').Strategy;

var config = require('config.json')('./config.json');

var redis = require("redis"),
    redisClient = redis.createClient();

var logger = require('morgan');

var session = require('express-session')

var RedisStore = require('connect-redis')(session);
var RD = new RedisStore({
  host: '127.0.0.1',
  port: 6379
});

var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var methodOverride = require('method-override');

/////////////////////////////////////////////////////////////////////////////////
/*                END REQUIRE                */
/////////////////////////////////////////////////////////////////////////////////

// seralize and deseralize
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new SlackStrategy({
    clientID: client_id,
    clientSecret: config.slack.client_secret,
    scope : "read",
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    getOrSetUser(profile, function(err,user){
      req.user = user;
      done(err, user);
    });
  }
));

var app = express();

app.use(logger('dev'));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());

app.use(session({
    secret: 'keylkjlkjlkjboard cat',
    store: RD
}));

app.use(passport.initialize());

app.use(passport.session());
app.use(express.static('public'));

function getUser(id, cb){
  redisClient.hgetall(id, function(err, reply) {
    if( err ){
      cb( err, null );
      return;
    }

    cb( err, reply );
  });
}

function getOrSetUser(profile, cb){
  getUser(profile.id, function(err, reply) {
    if( err ){
      cb( err, null );
      return;
    }

    if( reply == null ){
      setUser( profile, cb );
    }else{
      cb( err, reply );
    }
  });
}

function setUser(profile, cb){
  redisClient.hset(profile.id, "id", profile.id);
  redisClient.hset(profile.id, "displayName", profile.displayName);

  cb( null, profile );
}

app.get('/login', 
  passport.authenticate('slack', { failureRedirect: '/loginfail' }) );

app.get('/yourmom', ensureAuthenticated, function(req, res){
    res.send('WE ARE LOGGED IN GUYSSSS');
});

app.get('/loginfail', ensureAuthenticated, function(req, res){
    res.send('guys, the login failed, faliure redirect in oauth');
});

app.get('/loginredirect', ensureAuthenticated, function(req, res){
  res.send('this is where we are now guyz');
});

app.get('/auth/slack/callback',
  passport.authorize(
    'slack',
    { failureRedirect: '/login' }
  ),
  function(req, res) {
    console.log( "DID IT GUYZZZ", req.user );
    if( req && req.user && req.user.id ){

      getUser( req.user.id , function(err,user){
        req.logIn(user, function (err) {
          if(!err){
            res.redirect('/loginredirect');
          }else{
            res.send('error with req.logIn');
          }
        })
      });

    }else{

      res.send("callback didn\'t work, user wasn't passed in request")
    }

  }
);

var server = app.listen(PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
