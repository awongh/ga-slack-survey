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

App.Views.Message = Backbone.View.extend({
  initialize: function() {
    console.log('New message created');
    // This line grabs the message-preview template from the page with jQuery
    this.template = Handlebars.compile($('#message-template').html());
    // then it renders
    this.render();
    // If this.model changes, render is fired.
    this.listenTo(this.model, 'change', this.render);
    // If this.model changes, the preview view is removed from the page
    this.listenTo(this.model, 'destroy', this.remove);
  },
  render: function() {
    // pass the model's JSON into the Template
    var renderedTemplate = this.template(this.model.toJSON());
    // makes an empty div with the template inside.
    // Preview list can then take it and prepend to Preview List's el
    this.$el.html(renderedTemplate);
    // this.$('span').hide();
  },
  deleteMessage: function() {
    this.model.destroy();
  },
  showMessageView: function() {
    console.log('message shown');
    // resets this Apps messageView to now take the model that we clicked on.  
    // messageView will has a listener to re-render if it's model is changed.  
    App.messageView.setMessage(this.model);
  },
  events: {
    //'click p': 'showMessageView',
    //'click span.delete': 'deleteMessage'
  }
});

App.Models.Message = Backbone.Model.extend({
  // initialize function to log something useful to the console.
  initialize: function() {
    console.log('New Model Created!');
  },
  // defaults of a MessageModel
  defaults: {
    //title: "Title",
    //content: "Content"
  },
  // localStorage
  //localStorage: notetakerLocalStorage
});

App.Views.Message = Backbone.View.extend({
  el: '#message-view',
  initialize: function() {
    console.log('New Message View created');
    // create the three templates that this view has.  
    this.fullTemplate = Handlebars.compile($('#full-message-template').html());
    //this.editTemplate = Handlebars.compile($('#edit-message-template').html());
    //this.newTemplate = Handlebars.compile($('#new-message-template').html());

    this.renderNewForm()
  },
  render: function() {
    // gets the model's attributes
    var modelData = this.model.toJSON();
    // passes them into the template
    var renderedTemplate = this.fullTemplate(modelData);
    // places the rendered template in the html of this view's el.
    this.$el.html(renderedTemplate);
  }/*,
  setMessage: function(message) {
    // Takes a new message, and renders it.  The link from preview View.
    this.model = message;
    this.render();
  },
  createMessage: function() {
    // Makes the new message in the messages collection
    App.messages.create({
      title: this.$('#title').val(),
      content: this.$('#content').val()
    });
    // Calls set message on it to render it to the page.  
    this.setMessage(App.messages.last());
  },
  updateMessage: function() {
    this.model.save({
      //title: this.$('#title').val(),
      //content: this.$('#content').val()
    });
    this.render();
  },
  renderEditForm: function() {
    this.$el.html(this.editTemplate(this.model.toJSON()));
  },
  renderNewForm: function() {
    console.log("HI");
    this.$el.html(this.newTemplate());
  },
*/
  events: {
    'click .delete': 'destroyMessage',
    'click .edit': 'renderEditForm',
    'click .update': 'updateMessage',
    'click .new': 'renderNewForm',
    'click .create': 'createMessage' 
  }
});

// Step 2 - NotesCollection
App.Collections.Message = Backbone.Collection.extend({
  initialize: function() {
    // Useful console.log
    console.log('New Collection Created');
  },
  // define the model for this collection
  model: App.Models.Message,
  // define local storage using the var we made in NoteModel -- Why local storage here and in model!?
  //localStorage: notetakerLocalStorage
});

// Step 3 - The Note Preview List View

App.Views.messagesList = Backbone.View.extend({
  // Set the element of this view
  el: '#preview-list-view',
  // Initialize first logs a message to the console.
  initialize: function() {
    console.log('New list view');
    // This listening starts listening for any new previews added to this collection.
    // If one is added, we fire this.renderOnePreview
    this.listenTo(this.collection, 'add', this.renderOnePreview);
    // this.listenTo(this.collection, 'reset', this.renderAllPreviews); -- Check this with the app.js
  },
  renderAllPreviews: function() {
    //.each by Backbone default will render these previews in the window.
    //Thus we must pass this to it also.  This scopes 'this' to just the view itself.
    this.collection.each(this.renderOnePreview, this);
  },
  renderOnePreview: function(noteModel) {
    // Make a new NotePreviewView with its model set to the noteModel
    var newMessageItem = new App.Views.MessagePreview({model: messageModel});
    // This takes the element of this NotesPreviewViewList
    // and prepends to it, the element of the resulting NotePreviewView.
    this.$el.prepend(newMessageItem.el);
  }
});
