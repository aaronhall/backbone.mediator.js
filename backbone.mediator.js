/**
 * backbone.mediator.js
 *
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
    var
      directors = {};

    return {
      register: function(key, director) {
        if(_.isString(key) === false && _.isObject(director) === true) {
          director = key;
          key = 'default';
        }

        if(directors[key]) {
          this.unregister(key);
        }

        directors[key] = director;
      },

      unregister: function(key) {
        directors[key].teardown();
        delete directors[key];
      },

      signal: function(handler_def, context, e) {
        if(!context) throw new Error("No context provided");


        var
          do_mediate = true,
          handler_name,
          args = [];

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
          for(var key in directors) {
            if(directors.hasOwnProperty(key)) {
              if(directors[key].hasHandler(handler_name)) {
                if(_.isArray(args)) {
                  directors[key].getHandler(handler_name).apply(directors[key], args);
                } else {
                  directors[key].getHandler(handler_name).call(directors[key], args);
                }
              }
            }
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

    hasHandler: function(name) {
      return this.handlers[name] !== undefined;
    },

    addHandlers: function(handlers) {
      this.handlers = _.extend(this.handlers, handlers);
    },

    /**
     * Called when this director is replaced with another in Backbone.Mediator. Noop by default.
     */
    teardown: function() {}
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

    undelegateAll: function() {
      this.undelegateEvents();
      this.undelegateMediated();

      return this;
    }

    // TODO: need to override setElement to call this.delegateMediated
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

  Backbone.Director.prototype.mediate =
  Backbone.MediatedView.prototype.mediate =
  Backbone.MediatedRouter.prototype.mediate = function(handler_def, e) {
    Backbone.Mediator.signal(handler_def, this, e);
  };

}).call(this);
