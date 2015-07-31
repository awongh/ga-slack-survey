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

app.ChannelView = Backbone.View.extend({

  tagName : 'li',
  initialize: function(){
    this.channelTemplate = Handlebars.compile($('#channel-template').html());
    this.messageTemplate = Handlebars.compile($('#message-template').html());
  },
  getmessages : function(e){
    app.router.navigate("channels/"+this.model.id, {trigger: true});
  },

  //move this into the single view
  events: {
    'click': 'getmessages'
  },
  render : function(){
    var data = this.model.toJSON();
    var renderedTemplate = this.channelTemplate(data)
    this.$el.append(renderedTemplate);
  },

  renderMessages : function(){

    var that = this;

    $.each( this.model.get('messages'), function( i, v ){

      var renderedTemplate = that.messageTemplate(v)

      $('#messages-list').append( renderedTemplate );
    });
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
    'channels' :        "channels",  // #search/kiwis
    'channels/:id' :        "channel"  // #search/kiwis
  },

  channel : function( id ){
    $('#channels-cont').hide();
    $('#messages-list').show();
    var that = this;

    app.channels.get( id ).fetch({
      error : function(){
        console.log( "ERROR BITCHES" );
      },
      success : function( model, response ){
        console.log( model );
        var c = new app.ChannelView( { model: model } )
        c.renderMessages();
      }
    });

  },
  channels : function(){
    $('#channels-cont').show();
    $('#messages-list').hide();

    app.channels = app.channels || new app.ChannelList;

    app.channelListView = app.channelListView || new app.ChannelListView( { el: '#channels-list', collection : app.channels } );

    //check in local storge first!!!!
    app.channels.fetch({
      error : function(){
        console.log( "ERROR BITCHES" );
      },
      success : function( model, response ){
        console.log( model );
        app.channelListView.render();
      }
    });
  }
});

$(function(){
  app.router = new app.Router;
  Backbone.history.start({pushState: true});
  app.router.navigate("channels", {trigger: true});
});
