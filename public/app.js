var app = app || {};

app.Channel = Backbone.Model.extend ({
  initialize: function () {
    console.log("New Model Created Bro");
  }
});

app.ChannelList = Backbone.Collection.extend({
  model: app.Channel,
  url : '/channels'
});

app.messagesView = Backbone.View.extend({

  initialize: function(){
    this.messageTemplate = Handlebars.compile($('#message-template').html());
  },

  render: function(){

    var that = this;

    $.each( this.model.get('messages'), function( i, v ){

      var renderedTemplate = that.messageTemplate(v)

      $('#messages-list').append( renderedTemplate );
    });
  }

});

app.ChannelView = Backbone.View.extend({

  tagName : 'li',
  initialize: function(){
    this.channelTemplate = Handlebars.compile($('#channel-template').html());
  },
  getmessages : function(e){
    app.router.navigate("bb/channels/"+this.model.id, {trigger: true});
  },

  //move this into the single view
  events: {
    'click': 'getmessages'
  },
  render : function(){
    var data = this.model.toJSON();
    var renderedTemplate = this.channelTemplate(data)
    this.$el.append(renderedTemplate);
  }
});

app.ChannelListView = Backbone.View.extend({

  renderChannel : function( channel ){
    channel.render()
  },

  render: function(){
    var el = this.$el;
    this.collection.each(function(channel){
      var c = new app.ChannelView( { model: channel } )

      c.render();
      el.append( c.$el )
    }, this);
  }
});

app.Router = Backbone.Router.extend({

  routes: {
    'bb' :        "channels",  // #search/kiwis
    'bb/channels' :        "channels",  // #search/kiwis
    'bb/channels/:id' :        "channel"  // #search/kiwis
  },

  getChannel : function( id ){

    app.channels.get( id ).fetch({
      error : function(){
        console.log( "ERROR BITCHES" );
      },
      success : function( model, response ){
        console.log( model );
        var c = new app.messagesView( { model: model } )
        c.render();
      }
    });
  },

  channel : function( id ){
    $('#messages-list').empty();
    $('#channels-list').hide();
    $('#messages-list').show();
    var that = this;

    if( !app.channels || app.channels.size() > 0 ){
      app.channels = app.channels || new app.ChannelList;

      app.channelListView = app.channelListView || new app.ChannelListView( { el: '#channels-list', collection : app.channels } );

      this.getChannels( function( model, response ){
        that.getChannel( id );
      });

      return;
    }

    this.getChannel( id );
  },

  getChannels : function( cb ){
    app.channels.fetch({
      error : function(){
        console.log( "ERROR BITCHES" );
      },
      success : function( model, response ){
        cb( model, response );
      }
    });
  },

  channels : function(){
    $('#channels-list').empty();
    $('#channels-list').show();
    $('#messages-list').hide();

    app.channels = app.channels || new app.ChannelList;

    app.channelListView = app.channelListView || new app.ChannelListView( { el: '#channels-list', collection : app.channels } );

    this.getChannels( function( model, response ){
      console.log( model );
      app.channelListView.render();
    });
  }
});

$(function(){
  app.router = new app.Router;
  Backbone.history.start({pushState: true});
});
