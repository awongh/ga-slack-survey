const client_id = "2154860972.8331037539";

/*
 *
    === wherever this app is deployed, set these env vars ===

                    SLACK_CLIENT_SECRET
                    SLASH_CMD_TOKEN
                    REDIS_URL
 */

var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , url = require('url');


var Slack = require('slack-api');

var SlackStrategy = require('passport-slack').Strategy;

var redisURL = url.parse(process.env.REDIS_URL);
var redis = require("redis"),
    redisClient = redis.createClient(redisURL.port, redisURL.hostname);

if( redisURL.auth ){
  redisClient.auth(redisURL.auth.split(":")[1]);
}

var logger = require('morgan');

var session = require('express-session')

var RedisStore = require('connect-redis')(session);

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

//passport strategy

/******************************************************************************/
/***********                   SLACK AUTH CALLBACK                  ***********/
/******************************************************************************/

var myAuthCallback = function(req, accessToken, refreshToken, profile, done) {
  //the user has returned from slack, set some things, maybe
  getOrSetUser(profile, function(err,user){

    setToken( user.id, accessToken );

    req.user = user;
    done(err, user);
  });
};

/******************************************************************************/

passport.use(new SlackStrategy({
    clientID: client_id,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    scope : "read",
    passReqToCallback: true
  },
  myAuthCallback
));

var app = express();

app.use(logger('dev'));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride());
app.use(express.static('public'));

app.use(session({
    secret: 'keylkjlkjlkjboard cat',
    store: new RedisStore {client: redis}
}));

app.use(passport.initialize());

app.use(passport.session());
app.use(express.static('public'));

/////////////////////////////////////////////////////////////////////////////////
/*                END USE                */
/////////////////////////////////////////////////////////////////////////////////
//

app.get('/', ensureAuthenticated, function( req, res ){
//app.get('/', function( req, res ){
  res.sendfile('./public/app.html');
});


/////////////////////////////////////////////////////////////////////////////////
/*                START API METHODS  */
/////////////////////////////////////////////////////////////////////////////////

//var debug_channels = require('./channels.js');
app.get('/channels', function(req, res){
//app.get('/channels', ensureAuthenticated, function(req, res){
  //debug!!!!
  //res.json(debug_channels.channels);
  //return;
  //end debug!!!!

  if( !req.user || !req.user.id ){
    throw "was authenticated but user wasn't there."
  }

  getToken( req.user.id, function(err, token){

    Slack.channel.list({token:token}, function (error, data) {

      if( error ) throw error;

      res.json( data.channels );
    });
  });

});

//test api channel
//http://e5d76290.ngrok.io/messages/C06SUUTNJ
//app.get('/messages/:channel_id', ensureAuthenticated, function(req, res){
app.get('/channels/:channel_id', function(req, res){

  var channel_id = req.params.channel_id;

  //debug
  var channel_id = 'C06SUUTNJ';

  redisClient.lrange(channel_id, 0, 100, function( err, reply ){
    if( err ) throw err;

    var object_array = reply.map(function(obj){
      return JSON.parse(obj);
    });

    res.json( { messages: object_array } );
  });
});


/////////////////////////////////////////////////////////////////////////////////
/*                END API REQUESTS */
/////////////////////////////////////////////////////////////////////////////////

app.get('/slacklogin',
  passport.authenticate('slack', { failureRedirect: '/login?m='+'slack login failed' }) );

app.get('/login', function(req, res){
    var message = req.query.m;
    //this is the login page
    res.send('guys, the login failed, faliure redirect in oauth');
});

app.get('/loginredirect', ensureAuthenticated, function(req, res){
  res.send('login worked after slack, guyz');
});

/////////////////////////////////////////////////////////////////////////////////
/*                END LOGIN REDIRECTS   */
/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////
/*                START SLACK POST METHOD  */
/////////////////////////////////////////////////////////////////////////////////

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

    if( req.body && req.body.token == process.env.SLASH_CMD_TOKEN ){

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

/////////////////////////////////////////////////////////////////////////////////
/*                END SLACK POST METHOD  */
/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////
/*                START OAUTH API THINGS */
/////////////////////////////////////////////////////////////////////////////////

app.get('/authCallback',
  passport.authorize(
    'slack',
    { failureRedirect: '/login?m='+'passport auth login failed' }
  ),
  function(req, res) {
    console.log( "DID IT GUYZZZ", req.user );
    if( req && req.user && req.user.id ){

      getUser( req.user.id , function(err,user){
        req.logIn(user, function (err) {
          if(!err){
            res.redirect('/');
          }else{
            console.log( "ERROR WITH req.login", err );
            res.redirect('/login?m='+'user not found error')
          }
        })
      });

    }else{
      res.redirect('/login?m='+'oauth redirect request error')
    }
  }
);

function ensureAuthenticated(req, res, next) {
  console.log( "ensure auth", req, res );
  if (req.isAuthenticated()) { return next(); }
  console.log( "ensure auth redirect" );
  res.redirect('/login?m='+'not authorized')
}

/////////////////////////////////////////////////////////////////////////////////
/*                END OAUTH API THINGS */
/////////////////////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////////////////////
/*                END REDIS STUFF */
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
            /*                LISTEN ON TH PORT!!1!!            */
/////////////////////////////////////////////////////////////////////////////////

var server = app.listen(process.env.PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});
