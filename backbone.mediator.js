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
      register: function(d, opts) {
        director = d;

        // todo: opts
      },

      propagate: function(handler, context, e) {
        if(!director) throw "Backbone.Mediator: no Director registered";

        var args = [], mediator;

        if(_.isString(handler) && e) {
          args = [e];
        } else if(_.isArray(handler)) {
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

      propagateDirect: function(name, handler, context) {
        var formatted = _.isFunction(handler) ? [name, handler] : name;
        this.propagate(formatted, context);
      }
    };
  })();

  Backbone.Director = function() {
    this.initialize.apply(this, arguments);
  };
  _.extend(Backbone.Director.prototype, Backbone.Events, {
    handlers: {},
    initialize: function() {}
  });
  Backbone.Director.extend = Backbone.View.extend;

  var delegateEvents = Backbone.View.prototype.delegateEvents;

  Backbone.View.prototype.delegateEvents = function(events) {
    // call "super"
    delegateEvents.call(this, events);

    var bindMediated = function() {
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

      delegateEvents.call(this, wrapped);
    };

    //zomg hack
    var undelegateEvents = Backbone.View.prototype.undelegateEvents;
    Backbone.View.prototype.undelegateEvents = function() {};
    bindMediated.call(this);
    Backbone.View.prototype.undelegateEvents = undelegateEvents;
  };

  Backbone.View.prototype.mediate = function(name, handler) {
    Backbone.Mediator.propagateDirect(name, handler, this);
  };
}).call(this);


