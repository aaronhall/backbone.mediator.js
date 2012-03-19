// A backbone.js extension that implements the [Mediator pattern](http://en.wikipedia.org/wiki/Mediator_pattern).
// It can replace or accompany backbone's Observer pattern implementation (Backbone.View.events / Backbone.Events).
//
// * Aaron Hall (<a href="http://aaronhasaninternet.tumblr.com/">http://aaronhasaninternet.tumblr.com/</a>)
//
// <br />
// <a href="https://github.com/aaronhall/backbone.mediator.js">**GitHub Repo**</a>

/**
 * backbone.mediator.js
 *
 * This code may be freely distributed under the MIT license.
 */
(function() {
  "use strict";

  var VERSION = '0.1.0';

  var
    root = this,
    _ = root._,
    Backbone = root.Backbone;

  // jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.jQuery || root.Zepto || root.ender;

  // The Mediator object holds references to all Directors and routes events to the appropriate handlers
  Backbone.Mediator = (function() { // todo: mixin Backbone.Events
    // References to registered directors
    var directors = {};

    return {
      // Register a director to handle future events. If key isn't provided, defaults to `default`.
      register: function(key, director) {
        if(_.isString(key) === false && _.isObject(director) === true) {
          director = key;
          key = 'default';
        }

        // Overwrite director if key is already registered
        if(directors[key]) {
          this.unregister(key);
        }

        directors[key] = director;

        return this;
      },

      // Calls `teardown()` on the director and removes it from `directors`. Returns false if the key isn't registered.
      unregister: function(key) {
        if(directors[key] === undefined) return false;
        directors[key].teardown();
        delete directors[key];

        return this;
      },

      // Handles events fired from MediatedViews and MediatedRouters. When the view/router is initialized, each entry in
      // the `mediated` object is automatically wrapped in a function that calls `signal()`. The value of the `mediated`
      // entry is passed in as `handler_def` and can be one of several formats (defined below). It defines the name of the
      // event (maps to a key in `Backbone.Director.handlers`) and optionally defines a "argument generator" function that
      // returns argument(s) to be passed to the eventual handler. `context` is what `this` will reference in the handler_def's
      // argument generator if provided (always the view or router where the handler was defined). `e` is the original event
      // that was fired.
      signal: function(handler_def, context, e) {
        if(!context) throw new Error("No context provided");

        var
          handler_name,
          args = [],
          key,
          handler;

        // ### _handler\_def_ formats
        // The mediator supports lots of formats. Which you use is purely a matter of personal style preference.

        // **String format**
        // <pre>handler_def = "handler_name"</pre>
        // The director's handler is passed the original event and $(e.target) or e.target if $
        // isn't available.
        if(_.isString(handler_def)) {
          handler_name = handler_def;
          args = e ? [e, $ ? $(e.target) : e.target] : [];
        }

        // **Array format**
        // <pre>
        // handler_def = ["handler_name", function(e) {
        //   // ...
        //   return [arg, arg, ...]|arg;
        // }]
        // </pre>
        // The director's handler is passed the return value of the function. If the return value is an array, each value
        // is passed as a separate argument.
        else if(_.isArray(handler_def) && _.isFunction(handler_def[1])) {
          handler_name = handler_def[0];
          args = handler_def[1].call(context, e);
        }

        // **Object format**
        // <pre>
        // handler_def = {
        //   name: "handler_name",
        //   args: function(e) {
        //     // ...
        //     return [arg, arg, ...]|arg
        //   }
        // }
        // </pre>
        //
        // <pre>
        // handler_def = {
        //   name: "handler_name",
        //   args: [arg, arg, ...]|arg
        // }
        // </pre>
        else if(_.isObject(handler_def) && handler_def.name && handler_def.args) {
          handler_name = handler_def.name;
          if(_.isFunction(handler_def.args)) {
            args = handler_def.args.call(context, e);
          } else {
            args = handler_def.args;
          }
        }

        // **Function format**
        // <pre>
        // handler_def = function(e) {
        //   this.mediate(handler_def, e);
        // }
        // </pre>
        // If `handler_def` is a function, the function must manually call `this.mediate` with another handler_def and e
        // if it wants to get mediated.
        else if(_.isFunction(handler_def)) {
          handler_def.call(context, e);
          return this; // !! early return
        }

        // You somehow managed to pass in something that wasn't covered. That's just... I don't even.
        else {
          throw 'Invalid handler definition (must be string or [string, function] or hashmap or function)';
        }

        // Enumerate the registered directors and call the handler matching `handler_name` on each.
        for(key in directors) {
          if(directors.hasOwnProperty(key) && directors[key].hasHandler(handler_name)) {
            handler = directors[key].getHandler(handler_name);
            _.isArray(args) ?
              handler.apply(directors[key], args) :
              handler.call(directors[key], args);
          }
        }

        return this;
      }
    };
  })();

  // Directors are instantiated and registered with Backbone.Mediator. They define handlers for events defined in
  // the `mediated` objects of MediatedView and MediatedRouter.
  Backbone.Director = function() {
    this.initialize.apply(this, arguments);
  };
  _.extend(Backbone.Director.prototype, Backbone.Events, {
    // Map of event names to handler functions. Arguments are determined by the handler definitions in `mediated` (see handler_def
    // formats above)
    handlers: {},

    // Called when the director is instantiated
    initialize: function() {},

    getHandler: function(key) {
      return this.handlers[key];
    },

    hasHandler: function(key) {
      return this.handlers[key] !== undefined;
    },

    // Augment handlers to this director instance. `handlers` should be in the same format as `this.handlers`. It is completely
    // safe to add/remove handlers from registered directors at runtime.
    addHandlers: function(handlers) {
      this.handlers = _.extend(this.handlers, handlers);
    },

    // This is called when this director is replaced or explicitly removed in Backbone.Mediator. Noop by default.
    teardown: function() {}
  });

  // Augment Director and Mediator with Backbone's `extend` method
  Backbone.Director.extend = Backbone.Mediator.extend = Backbone.View.extend;

  Backbone.MediatedView = Backbone.View.extend({
    // Call View's constructor function and delegateMediated
    constructor: function(options) {
      Backbone.View.call(this, options);
      this.delegateMediated();
    },

    // Similar to delegateEvents, binds/delegates event definitions in `this.mediated` to the view's root el
    delegateMediated: function(events) {
      var
        // Splits event names from jquery selectors. Copypasta'd from Backbone.View.delegateEvents
        eventSplitter = /^(\S+)\s*(.*)$/,
        //
        key, method, match, eventName, selector;

      // If `events` wasn't provided, use `this.mediated` via `this._transformMediated()`
      if (!(events || (events = this._transformMediated()))) return;
      //
      this.undelegateMediated();
      // Enumerate events and bind/delegate them to the view's `el`
      for (key in events) {
        method = events[key];
        match = key.match(eventSplitter);
        eventName = match[1];
        selector = match[2];

        method = _.bind(method, this);
        eventName += '.delegateMediated' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view via `delegateMediated`
    undelegateMediated: function() {
      this.$el.unbind('.delegateMediated' + this.cid);
    },

    // Transform each handler definition in `this.mediated` into a `signal` call to Backbone.Mediator.
    // Returns hash of event names to event handler functions.
    _transformMediated: function() {
      var
        key,
        eventSplitter = /^(\S+)\s*(.*)$/,
        wrapped = {};

      for(key in this.mediated) {
        // `signal` is wrapped in an outer function to preserve `this.mediated[key]` in the closure
        wrapped[key] = (function(handler_def) {
          return function(e) {
            Backbone.Mediator.signal(handler_def, this, e); // `this` is this MediatedView instance
          };
        })(this.mediated[key]);
      }

      return wrapped;
    },

    undelegateAll: function() {
      this.undelegateEvents();
      this.undelegateMediated();

      return this;
    },

    // Automatically call `this.delegateMediated` when setElement is called
    setElement: function(element, delegate) {
      Backbone.View.prototype.setElement.apply(this, [element, delegate]);
      if(delegate !== false) this.delegateMediated();
    }
  });


  Backbone.MediatedRouter = Backbone.Router.extend({
    // Hook up `routes` and `mediated`.
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.call(this);

      Backbone.history || (Backbone.history = new Backbone.History());

      _.each(this.mediated, function(name, route) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);

        // Bind a function to Backbone.history's route event that calls `Backbone.Mediator.signal`, passing the route's
        // parameters as arguments for the director's handler.
        Backbone.history.route(route, _.bind(function(fragment) {
          var args = this._extractParameters(route, fragment);

          Backbone.Mediator.signal({
            'name': name,
            'args': args
          }, this);

          Backbone.history.trigger('route', this, name, args);
        }, this));
      }, this);
    }
  });

  // The `mediate` method transforms a handler_def and optional event into a call to Mediator.signal with `this` as the context
  Backbone.Director.prototype.mediate =
  Backbone.MediatedView.prototype.mediate =
  Backbone.MediatedRouter.prototype.mediate = function(handler_def, e) {
    Backbone.Mediator.signal(handler_def, this, e);
  };

}).call(this);