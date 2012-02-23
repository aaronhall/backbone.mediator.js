/**
 * backbone.mediator.js
 *
 * (c) 2012 Aaron Hall
 * This code may be freely distributed under the MIT license.
 */
(function() {
  "use strict";
  /*global Backbone: true */

  var
    root = this,
    _ = root._;

  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');


  // todo: should extend Backbone.Events
  Backbone.Mediator = (function() {
    var director;
    return {
      register: function(d) {
        director = d;
      },

      signal: function(handler_def, context, e) {
        if(!director) throw new Error("No director registered");
        if(!context) throw new Error("No context provided registered");

        var
          do_mediate = true,
          handler_name,
          args = [],
          mediator;

        if(_.isString(handler_def)) {
          handler_name = handler_def;
          args = e ? [e] : [];
        } else if(_.isArray(handler_def) && _.isFunction(handler_def[1])) {
          handler_name = handler_def[0];
          args = handler_def[1].call(context, e);
        } else if(_.isObject(handler_def) && handler_def.name && handler_def.args) {
          handler_name = handler_def.name;
          if(_.isFunction(handler_def.args)) {
            args = handler_def.args.call(context, e);
          } else {
            args = handler_def.args;
          }
        } else if(_.isFunction(handler_def)) {
          do_mediate = false;
        } else {
          throw 'Invalid handler definition (must be string or [string, function] or hashmap or function)';
        }

        if(do_mediate) {
          mediator = director.getHandler(handler_name);
          if(!mediator) throw 'No handler in Director for "'+handler_def+'"';

          if(_.isArray(args)) {
            mediator.apply(director, args);
          } else {
            mediator.call(director, args);
          }
        } else {
          handler_def.call(context, e);
        }
      }
    };
  })();

  /**
   * Director
   */
  Backbone.Director = function() {
    this.initialize.apply(this, arguments);
  };
  _.extend(Backbone.Director.prototype, Backbone.Events, {
    handlers: {},
    initialize: function() {},

    getHandler: function(name) {
      return this.handlers[name];
    },

    addHandlers: function(handlers) {
      this.handlers = _.extend(this.handlers, handlers);
    }
  });
  Backbone.Director.extend = Backbone.Mediator.extend = Backbone.View.extend;


  /**
   * MediatedView
   */
  Backbone.MediatedView = Backbone.View.extend({
    constructor: function(options) {
      Backbone.View.call(this, options); // todo: make this isn't already called
      this.delegateMediated();
    },

    delegateMediated: function(events) {
      var
        eventSplitter = /^(\S+)\s*(.*)$/;

      if (!(events || (events = this._transformMediated()))) return;
      this.undelegateMediated();
      for (var key in events) {
        var method = events[key];
        var match = key.match(eventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateMediated' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    undelegateMediated: function() {
      this.$el.unbind('.delegateMediated' + this.cid);
    },

    /**
     * Transform each handler definition in this.mediated into a `signal` call to Backbone.Mediator.
     *
     * @return Hash of event names to functions that can be passed directly into Backbone.View.delegateEvents
     */
    _transformMediated: function() {
      var
        key,
        eventSplitter = /^(\S+)\s*(.*)$/,
        wrapped = {};

      for(key in this.mediated) {
        wrapped[key] = (function(handler_def) {
          return function(e) {
            // `this` is this MediatedView instance
            Backbone.Mediator.signal(handler_def, this, e);
          };
        })(this.mediated[key]);
      }

      return wrapped;
    },

    mediate: function(name, handler) {
      Backbone.Mediator.propagateDirect(name, handler, this);
    }
  });


  /**
   * MediatedRouter
   */
  Backbone.MediatedRouter = Backbone.Router.extend({
    _bindRoutes: function() {
      // call super
      Backbone.Router.prototype._bindRoutes.call(this);

      Backbone.history || (Backbone.history = new Backbone.History());

      _.each(this.mediated, function(name, route) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);

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

}).call(this);
