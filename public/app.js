var app = {}; // create namespace for our app

app.Message = Backbone.Model.extend ({
  initialize: function () {
    console.log("New Model Created Bro");
  }
});

app.MessageList = Backbone.Collection.extend({
  model: app.Message,
  url : '/messages'
});

app.MessageListView = Backbone.View.extend({

  el: '#container',
  initialize: function(){
    this.messageTemplate = Handlebars.compile($('#message-template').html());
    //this.render();
  },
  render: function(){
    var collectionData = app.messages.toJSON();
    var renderedTemplate = this.messageTemplate({collection:collectionData});
    this.$el.html(renderedTemplate);
  }
});

app.Channel = Backbone.Model.extend ({
  initialize: function () {
    console.log("New Model Created Bro");
  }
});

app.ChannelList = Backbone.Collection.extend({
  model: app.Channel,
  url : '/channels'
});

app.ChannelListView = Backbone.View.extend({

  el: '#container',
  initialize: function(){
    this.channelTemplate = Handlebars.compile($('#channels-template').html());
    //this.render();
  },
  render: function(){
    var collectionData = app.channels.toJSON();
    var renderedTemplate = this.channelTemplate({collection:collectionData});
    this.$el.html(renderedTemplate);
  },
  getmessages : function(e){
    var id = e.target.id;
  },
  events: {
    'click .getmessages': 'getmessages'
  }
});

$(function(){

/*
  app.messages = new app.MessageList;
  app.messageListView = new app.MessageListView( { collection : app.messages } );
  app.messages.fetch({
    error : function(){
      console.log( "ERROR BITCHES" );
    },
    success : function( model, response ){
      console.log( model );
      app.messageListView.render();
    }
  });
*/

  app.channels = new app.ChannelList;
  app.channelListView = new app.ChannelListView( { collection : app.channels } );
  app.channels.fetch({
    error : function(){
      console.log( "ERROR BITCHES" );
    },
    success : function( model, response ){
      console.log( model );
      app.channelListView.render();
    }
  });

});
