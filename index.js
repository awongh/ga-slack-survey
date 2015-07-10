const PORT = 80;
const client_id = "2154860972.7457169668";

const BASE_URL = "http://67f8aa3e.ngrok.io";
const redirect_uri = BASE_URL+"/oauthcallback";

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
var config = require('morgan');

var app = express();

app.use(logger('dev'));
app.use(express.static('public'));
app.use(cookieParser())

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

app.get('/bots', function(req, res){
  flatfile.db('data.json', function( err, json_data ){

    if( json_data.cookies.hasOwnProperty(req.cookies.cookie )){
      var token = json_data.keys.pop();
      Slack.users.list({token:token}, function (error, data) {
        if( error ) throw error;

        var users = data.members;

        var bot_users = [];

        for (var key in data.members) {
          var user = data.members[key];

          if (data.members.hasOwnProperty(key)) {
            if( user.is_bot == true && user.name.match(/ga-surveybot/g) ){
              bot_users.push( user );
            }
          }
        }

        res.send(bot_users);
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
    client_secret : config.client_secret,
    code : code,
    redirect_uri : redirect_uri
  };

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
