var App = {
  Models: {},
  Collections: {},
  Views: {}
};

$(function() {
  App.messages = new App.Collections.Messages;
  App.messagesListView = new App.Views.messagesList({ collection: App.messages });
  App.messageView = new App.Views.Message({model: new App.Models.Message});
  App.messages.fetch();
});
