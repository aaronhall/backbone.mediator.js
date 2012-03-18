**Backbone.mediator.js** is an extension of Backbone.js that provides an implementation of the Mediator pattern for backbone.js. It can replace or accompany Backbone's Observer pattern implementation (Backbone.View.events / Backbone.Events).

## Mediator pattern

From [GoF](http://en.wikipedia.org/wiki/Design_Patterns): "Define an object that encapsulates how a set of objects interact. **Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently.**" (more at [Wikipedia](http://en.wikipedia.org/wiki/Mediator_pattern))

Mediator prevents speghettiness by centralizing event handling. Some other benefits:

* Handler definition is in one place as opposed to being scattered across different views.
* Promotes loose coupling of views.
* Allows for predictable ordering in event handlers, whereas Observer's event delegation is done on a first attached, first served basis.

## Overview

Backbone.mediator.js provides:


* **[Backbone.Director](#director)**: Defines event handlers for named events defined in MediatedView's `mediated` map.
* **[Backbone.Mediator](#mediator)**: Holds directors and delegates events to the appropriate Director(s)
* **[Backbone.MediatedView](#mediatedview)**: extends Backbone.View and consumes the `mediated` property (similar to the `events` property; defined below). Events defined in `mediated` are automatically connected to the appropriate Director (via Mediator) when the view is initailized.
* **[Backbone.MediatedRouter](#mediatedrouter)**: extend Backbone.Router and consumes the `mediated` property (similar to the `routes` property; defined below). Events defined in `mediated` are automatically connected to the appropriate Director (via Mediator) when the router is initailized.

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
      // do things when a list item is clicked
    }
  },
  
  loadItem: function(itemID) {
    //...
  }
});

```

<a name="mediator"></a>
### Backbone.Mediator

Interact with the Backbone.Mediator object to register/unregister directors. The first argument for `register` is a named key for the Director that can be used to unregister the Director later. If a Director by that name has already been registered, the existing one is unregistered and replaced by the one provided.

```
Backbone.Mediator.register('main', new AppDirector());
```

You can add/remove directors at runtime as needed. If multiple directors implement handlers for the same named event, both will be called in the order they were regsitered.

<a name="mediatedview"></a>
### Backbone.MediatedView

In this example, the 'myList:itemClicked' handler in AppDirector will be passed the event object and $(event.target) (or just event.target when jQuery/Zepto/ender aren't available) when a `ul#list li a` element is clicked:

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

It's also possible to define the parameters that are passed to the Director handlers. Here, the handler for 'myList:itemClicked' would receive two arguments:

```
mediated: {
  'click li a': ['myList:itemClicked', function(e, $target) {
    // `this` variable is the MediatedView instance
    
    // return an array of arguments to be passed to handler in order
    return [this.someLocalStateVariable, $target.attr('data-item-id')];
  }],
  
  //...
}
```



<a name="mediatedrouter"></a>
### Backbone.MediatedRouter
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

## Definitions

### `Backbone.MediatedView.mediated`

### `Backbone.MediatedRouter.mediated`

### `Backbone.Director.handlers`


## Other stuff

* When multiple directors are attached...
* Director handler lookups are done 'just in time' when the event is triggered. It's safe to augment handlers at runtime via `addHandlers()`.
* Backbone.MediatedView also provides `undelegateMediated` (like `undelegateEvents`) and `undelegateAll` which calls both undelegate methods.