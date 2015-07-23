const PORT = 80;
const client_id = "2154860972.7457169668";

var express = require('express')
  , passport = require('passport')
  , util = require('util');

var Slack = require('slack-api');

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

      setToken( user.id, accessToken );

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

/////////////////////////////////////////////////////////////////////////////////
/*                END USE                */
/////////////////////////////////////////////////////////////////////////////////

app.get('/login',
  passport.authenticate('slack', { failureRedirect: '/loginfail' }) );

app.get('/yourmom', ensureAuthenticated, function(req, res){
    res.send('WE ARE LOGGED IN GUYSSSS');
});

app.get('/loginfail', function(req, res){
    res.send('guys, the login failed, faliure redirect in oauth');
});

app.get('/loginredirect', ensureAuthenticated, function(req, res){
  res.send('this is where we are now guyz');
});

var debug_channels = require('./channels.js');
app.get('/channels', ensureAuthenticated, function(req, res){
  //debug!!!!
  res.send(debug_channels.channels);
  return
  //end debug!!!!

  if( !req.user || !req.user.id ){
    throw "was authenticated but user wasn't there."
  }

  getToken( req.user.id, function(err, token){

    Slack.channel.list({token:token}, function (error, data) {

      if( error ) throw error;

      //res.json( data.channels );
      res.send(data.channels);
    });
  });

});

//test api channel
//http://e5d76290.ngrok.io/messages/C06SUUTNJ
app.get('/messages/:channel_id', ensureAuthenticated, function(req, res){

  var channel_id = req.params.channel_id;

  redisClient.lrange(channel_id, 0, 100, function( err, reply ){
    if( err ) throw err;

    var object_array = reply.map(function(obj){
      return JSON.parse(obj);
    });

    res.send( object_array );
  });
});

app.post('/slash', function( req, res ){
  /*
    token=VGY40drcIf6tHulnPn5H94s4
    team_id=T0001
    team_domain=example
    channel_id=C2147483705
    channel_name=test
    user_id=U2147483697
    user_name=Steve
    command=/weather
    text=94070
  */

  try{

    if( req.body && req.body.token == config.slack.slash_command_token ){

      var timestamp = (new Date).getTime();
      var user_id = req.body.user_id;

      var message = {
        channel_id : req.body.channel_id,
        channel_name : req.body.channel_name,
        user_id : user_id,
        user_name : req.body.user_name,
        command : req.body.command,
        text : req.body.text,
        timestamp : timestamp
      };

      var hash_string = JSON.stringify( message );

      redisClient.lpush(req.body.channel_id, hash_string);

    }else{
      console.log( "slash post without valid token" );
    }

  }catch( error ){
    //silently deal with things that go wrong
    console.log( error );
  }
});

app.get('/auth/slack/callback',
  passport.authorize(
    'slack',
    { failureRedirect: '/loginfail' }
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
  //res.redirect('/loginfail')
  res.send("couldn't authorize you for this, sorry");
}

/////////////////////////////////////////////////////////////////////////////////
/*                REDIS STUFF */
/////////////////////////////////////////////////////////////////////////////////
function getToken( user_id, cb ){

  redisClient.hget("tokens", user_id, function( err, reply ){
    if( err ){
      cb( err, null );
      return;
    }

    cb( err, reply );
  });
}

function setToken( user_id, token ){
  redisClient.hset("tokens", user_id, token);
}

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
