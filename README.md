A simple implementation of the Mediator pattern for Backbone.js

Example usage:

```javascript

var myView = Backbone.MediatedView.extend({
  el: 'body',
  mediated: {
    'click a.expand': 'myView:expand',

    // construct custom parameters to Director's handler
    'click a.close': ['myView:close', function(e) {
      // `e` is the original event
      // `this` is myView

      // extract some data from the element and pass it onto the mediator
      var $target = $(e.currentTarget);
      var id = $target.attr('data-id');

      return [$target, id]
    }]
  },

  // `events` still works
  events: {
    'click a.doSomethingInternal': '_doSomething'
  },

  showDetails: function(id) {
    // do something
  },

  doSomething: function() {

  }

});

var myRouter = Backbone.MediatedRouter.extend({
  mediated: {
    'view/:id': 'router:view'
  }

  // `routes` behavior doesn't change
});

var myDirector = Backbone.Director.extend({
  handlers: {
    // handler names can be anything as long as they're unique
    'myView:expand': function(e) {
      // `e` is the original click event
      // `this` is myDirector

      // do something!
    },

    'myView:close': function($target, id) {
      // do something with $target and id!
    },

    'router:view': function(id) {
      myView.showDetails(id);
    }
  }
});

$(function() {
  Backbone.Mediator.register(myDirector);
});
```