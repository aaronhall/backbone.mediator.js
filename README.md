**Backbone.mediator.js** is an extension of Backbone.js that provides an implementation of the Mediator pattern for backbone.js. It can replace or accompany Backbone's Observer pattern implementation (Backbone.View.events / Backbone.Events).

## Mediator pattern

From [GoF](http://en.wikipedia.org/wiki/Design_Patterns): "Define an object that encapsulates how a set of objects interact. **Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently.**" (more at [Wikipedia](http://en.wikipedia.org/wiki/Mediator_pattern))

Mediator prevents speghettiness by centralizing event handling. Some other benefits:

* Handler definition is in one place as opposed to being scattered across different views.
* Promotes loose coupling of views.
* Allows for predictable ordering in event handlers, whereas Observer's event delegation is done on a first attached, first served basis.

## Overview

Backbone.mediator.js provides:


* **Backbone.Director**: Defines event handlers for named events
* **Backbone.Mediator**: Holds directors and delegates events to the appropriate Director(s)
* **Backbone.MediatedView**: extends Backbone.View and consumes the `mediated` property (similar to the `events` property; defined below). Events defined in `mediated` are automatically connected to the appropriate Director (via Mediator) when the view is initailized.
* **Backbone.MediatedRouter**: extend Backbone.Router and consumes the `mediated` property (similar to the `routes` property; defined below). Events defined in `mediated` are automatically connected to the appropriate Director (via Mediator) when the router is initailized.

## Examples

<a name="director"></a>
### Backbone.Director

```javascript
var AppDirector = Backbone.Director.extend({
  handlers: {
    'router:loadItem': function(itemID) {
      // handle the route event
    },
    
    'myList:itemClicked': function(e, $target) {
      // do things when a list item is clicked
    }
  }
});

// first parameter here is arbitrary, but should be unique across all
// Directors (if you choose to use more than one). If the name is already
// registered, the old Director is unregistered and replaced by the new one.
Backbone.Mediator.register('main', new AppDirector());
```


### Backbone.MediatedView

```javascript
var List = Backbone.MediatedView.extend({
  mediated: {
    'click li a': 'myList:itemClicked' // director will be passed the click event and $(e.target) (or just e.target in absense of JQuery/Zepto/ender)
  },
  
  // the events property still behaves as normal
  events: {}
});
var myList = new List();
```

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