/**
 * backbone.mediator.js
 *
 * Copyright 2012 Aaron Hall
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

      propagate: function(handler, context, e) {
        if(!director) throw "Backbone.Mediator: no Director registered";

        var
          args = [],
          mediator;

        if(_.isString(handler)) {
          args = e ? [e] : e;
        } else if(_.isArray(handler) && _.isFunction(handler[1])) {
          args = handler[1].call(context, e);
          handler = handler[0];
        } else {
          throw 'Invalid handler structure (must be string or [string, function])';
        }

        mediator = director.handlers[handler];

        if(!director.handlers[handler]) throw 'No handler in Director for "'+handler+'"';

        if(_.isArray(args)) {
          mediator.apply(director, args);
        } else {
          mediator.call(director, args);
        }
      },

      // todo: not tested
      propagateDirect: function(name, handler, context) {
        var formatted = _.isFunction(handler) ? [name, handler] : name;
        this.propagate(formatted, context);
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
    initialize: function() {}
  });

  Backbone.Director.extend = Backbone.Mediator.extend = Backbone.View.extend;


  /**
   * MediatedView
   */
  Backbone.MediatedView = Backbone.View.extend({
    delegateEvents: function(events) {
      var
        _super = Backbone.View.prototype.delegateEvents,
        _undelegateEvents = Backbone.View.prototype.undelegateEvents;

      // delegate normal backbone events
      _super.call(this, events);

      if(!this.mediated) return;

      // Hack to be able to reuse super::delegateEvent to bind mediated. The parent method calls
      // undelegateEvents, so in order to reuse it without unsetting the normal events, temporarily
      // make it an empty function.
      Backbone.View.prototype.undelegateEvents = function() {};
      _super.call(this, this.wrapMediated());
      Backbone.View.prototype.undelegateEvents = _undelegateEvents;
    },

    wrapMediated: function() {
      if(!this.mediated) return;

      var
        key,
        eventSplitter = /^(\S+)\s*(.*)$/,
        wrapped = {};

      for(key in this.mediated) {
        wrapped[key] = (function(handler) {
          return function(e) {
            Backbone.Mediator.propagate(handler, this, e);
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

          Backbone.Mediator.propagateDirect(name, function() {
            return args;
          });

          Backbone.history.trigger('route', this, name, args);
        }, this));
      }, this);
    }
  });

}).call(this);
