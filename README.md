**Backbone.mediator.js** is a Backbone.js extension that implements the [Mediator pattern](http://en.wikipedia.org/wiki/Mediator_pattern). It can replace or accompany Backbone's Observer pattern implementation (Backbone.View.events / Backbone.Events).

### Mediator pattern

From [GoF](http://en.wikipedia.org/wiki/Design_Patterns): "Define an object that encapsulates how a set of objects interact. **Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently.**"

Mediator promotes maintainability and loose coupling for complex event-driven applications. Event handlers are defined by a single object and decouple views by eliminating the requirement that they have knowledge of events in other views. Code paths are readable and more predictable, and events that affect multiple views in complex and interdependent ways stay manageable.

## Overview

Backbone.mediator.js provides four new objects/prototypes in the Backbone global:

* **[Backbone.Director](#director)**: One or more Director instances are registered to Backbone.Mediator and define the event handlers for all MediatedView and MediatedRouter instances.
* **[Backbone.Mediator](#mediator)**: Routes events that are triggered from any MediatedView or MediatedRouter instance to handlers defined in the registered Director(s).
* **[Backbone.MediatedView](#mediatedview)**: Extends Backbone.View and supports a property called `mediated` that defines events similarly to `View.events`.
* **[Backbone.MediatedRouter](#mediatedrouter)**: Extend Backbone.Router and also supports a property called `mediated` that defines routes similarly to Router.routes.

## Examples

<a name="director"></a>
### Backbone.Director

This director handlers a router event and a view event by name. The `handlers` keys are arbitrary strings; the 'colon' separators are just convention.

Handlers that handle route events are passed the route-defined URL parameters in the order they appear in the path definition.

```javascript
var AppDirector = Backbone.Director.extend({
  handlers: {
    'router:loadItem': function(itemID) {
      // `this` is AppDirector instance
      this.loadItem(itemID);
    },

    'myList:itemClicked': function(e, $target) {
      this.loadItem($target.attr('data-item-id'));
    }


  loadItem: function(itemID) {
    //...
  }
});
```

It's safe to add/remove handlers from registered Dirtectors at runtime since lookups are performed when the event is triggered.

<a name="mediator"></a>
### Backbone.Mediator

Interact with the Backbone.Mediator object to register/unregister directors. The first argument for `register` is a named key for the Director that can be used to unregister the Director later. If a Director by that name has already been registered, the existing one is unregistered and replaced by the one provided.

```
Backbone.Mediator.register('main', new AppDirector());
```

You can add/remove directors at runtime as needed. If multiple directors implement handlers for the same named event, both will be called in the order they were registered.

<a name="mediatedview"></a>
### Backbone.MediatedView

In this example, the `myList:itemClicked` handler in AppDirector will be passed the event object and $(event.target) (or just event.target when jQuery/Zepto/ender aren't available) when a `ul#list li a` element is clicked:

```javascript
var List = Backbone.MediatedView.extend({
  el: 'ul#list',
  mediated: {
    'click li a': 'myList:itemClicked'
  },

  // the events property still behaves as normal
  events: {}
});
var myList = new List();
```

The value of a `mediated` key can be in a few different formats. Which you use depends on your style preference and what arguments you want passed to the Director. The List view below illustrates the different formats. Every function below will have `this` set to the view instance when called.

```javascript
var List = Backbone.MediatedView.extend({
  mediated: {
    // handler receives (e, $(e.target))
    'click li a.one': 'myList:itemClicked',

    // handler receives ('foo', 'bar')
    'click li a.two': ['myList:itemClicked', function(e, $target) {
      return ['foo', 'bar']; // a non-array value would be passed as a single arg
    },

    // handler receives single arg ('foo')
    'click li a.three': {
      name: 'myList:itemClicked',
      args: function(e, $target) {
        return 'foo'; // could also be an array to pass multiple args
      }
    },

    // here, the function must call mediate itself
    'click li a.four': function(e, $target) {
      this.mediate('myList:itemClicked', e);
    }
  }
});
```

<a name="mediatedrouter"></a>
### Backbone.MediatedRouter

Similar to the `routes` property, `mediated` maps URL path definitions to event names.

The handler for `router:loadItem` will receive the value of `:item_id` as its only argument.

```javascript
var AppRouter = Backbone.MediatedRouter.extend({
  mediated: {
    'item/:item_id': 'router:loadItem'
  },

  // the routes property still behaves as normal
  routes: {}
});

myRouter = new AppRouter();
Backbone.history.start();
```