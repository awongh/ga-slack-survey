const PORT = 80;
const client_id = "2154860972.7457169668";

const BASE_URL = "http://abaed261.ngrok.io";
const redirect_uri = BASE_URL+"/auth/slack/callback";

var config = require('config.json')('./config.json');

var slack_options = {
  client_id : client_id,
  redirect_uri : redirect_uri,
  scope : "read"
};

var Slack = require('slack-api');
var flatfile = require('flatfile');

var sha1 = require('node-sha1');
var cookieParser = require('cookie-parser')

var express = require('express');
var logger = require('morgan');

var session = require('express-session')
var passport = require('passport')
var SlackStrategy = require('passport-slack').Strategy;
var bodyParser = require('body-parser')

var app = express();

app.use(logger('dev'));
app.use(express.static('public'));
app.use(cookieParser())

app.use(bodyParser());

app.use(session({ secret: 'keyboard cat' }));

app.use(passport.initialize());
app.use(passport.session());

function getUser( slackProfile, callback ){
  callback(null, { id:slackProfile.id });
}

passport.use(new SlackStrategy({
    clientID: client_id,
    clientSecret: config.slack.client_secret
  },
  function(accessToken, refreshToken, profile, done) {
      console.log("WUT");
      getUser(profile, function(err,user){
        return done(err, user);
      });
  }
));


// seralize and deseralize
passport.serializeUser(function(user, done) {
  console.log('serializeUser: ' + user._id)
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
  done(null, {fid:5});
});

app.get('/login', 
  passport.authenticate('slack', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
});

app.get('/yourmom', ensureAuthenticated, function(req, res){
    res.send('WE ARE LOGGED IN GUYSSSS');
});

app.get('/auth/slack',
  passport.authorize('slack'));

app.get('/auth/slack/callback', 
  passport.authorize('slack', { failureRedirect: '/login' }),
  function(req, res) {
    console.log( "DID IT GUYZZZ" );
    // Successful authentication, redirect home.
    //res.send( "HERE" );
    res.redirect('/');
});

app.get('/', function(req, res){

  flatfile.db('data.json', function( err, json_data ){

    if( json_data.hasOwnProperty( "cookies" ) && json_data.cookies.hasOwnProperty(req.cookies.cookie )){
      res.redirect('/bots');
    }else{
      Slack.oauth.getUrl(slack_options, function(err,data){
        if( err ) throw err;
        res.send(data);
      });
    }
  });
});

app.get('/bot/:id/messages', function(req, res){
  flatfile.db('data.json', function( err, json_data ){

    //check to see if the user is ok
    if( json_data.cookies.hasOwnProperty(req.cookies.cookie )){

      //get a token
      var token = json_data.keys.pop();

      var slack_req = {
        token : token
      };

      var slack_history_req = {
        token : token
        //channel : req.params.id
      };

      Slack.im.list(slack_req, function (error, data) {

        if( error || data.ims === undefined ) throw error;

        var channels = [];

        for( var channelIndex in data.ims ){
          if( data.ims.hasOwnProperty( channelIndex ) ){
            var channel = data.ims[channelIndex]
            if( channel.is_user_deleted == false ){
              channels.push( channel.id );
            }
          }
        }

        var messages = [];
        var channelCount = 0;

        //for each person get a history of their messages
        for( var i=0; i< channels.length; i++ ){

          slack_history_req.channel = channels[i];

          Slack.im.history(slack_history_req, function (error, data) {
            if( error ) throw error;

              if( data["messages"].length > 0 ){
                messages.push( data );
              }
              channelCount++;

              if( channelCount == channels.length ){
                //res.json( messages );
                res.send(messages);
              }
          });
        }
      });
    }else{
      res.sendStatus(403);
      //res.redirect('/');
    }
  });
});

app.get('/bots', function(req, res){
  flatfile.db('data.json', function( err, json_data ){

    if( json_data.cookies.hasOwnProperty(req.cookies.cookie )){
      var token = json_data.keys.pop();
      Slack.users.list({token:token}, function (error, data) {
        if( error ) throw error;

        var users = data.members;

        var bot_users = [];
        var bot_users_html = "<ul>";

        for (var key in data.members) {
          var user = data.members[key];

          if (data.members.hasOwnProperty(key)) {
            if( user.is_bot == true && user.name.match(/ga-surveybot/g) ){
              bot_users.push( user );
              bot_users_html +='<li>' +
                                  '<p><a href="/bot/'+user.id+'/messages">'+user.name+'</p>'+
                                '</li>';
            }
          }
        }

        res.send(bot_users_html);
      });
    }else{
      res.redirect('/');
    }
  });
});

app.get('/oauthcallback', function(req, res){

  var code = req.query.code;

  var options = {
    client_id : client_id,
    client_secret : config.slack.client_secret,
    code : code,
    redirect_uri : redirect_uri
  };

  console.log( options );

  Slack.oauth.access(options, function(err, data){
    if( err ) throw err;
    if( data["ok"] == true ){
      flatfile.db('data.json', function( err, json_data ){
        if( json_data.keys == undefined ){
          json_data.keys = [];
        }

        if( json_data.cookies == undefined ){
          json_data.cookies = {};
        }

        json_data.keys.push( data.access_token );

        var cookie_string = cookieHash( req );
        json_data.cookies[cookie_string] = cookie_string;

        json_data.save(function(err){


          res.cookie('cookie', cookie_string);

          //res.send(data);
          res.redirect('/bots');
        });
      });
    }
  });
});

var server = app.listen(PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});

var cookieHash = function( req ){
  var salt = "jhk*&^*&sdf^SDF%@dfg%^dsDFfgSD$!kdgfuKJKhUjhSDfkhkjh";
  return sha1( new Date().getTime() + req.headers.accept + req.headers['user-agent'] + req.headers.host + salt );
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
