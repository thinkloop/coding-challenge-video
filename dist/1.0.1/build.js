(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/ubuntu/workspace/node_modules/nimble/nimble.js":[function(require,module,exports){
/**
 * Nimble
 * Copyright (c) 2011 Caolan McMahon
 *
 * Nimble is freely distributable under the MIT license.
 *
 * This source code is optimized for minification and gzip compression, not
 * readability. If you want reassurance, see the test suite.
 */

(function (exports) {

    var keys = Object.keys || function (obj) {
        var results = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                results.push(k);
            }
        }
        return results;
    };

    var fallback = function (name, fallback) {
        var nativeFn = Array.prototype[name];
        return function (obj, iterator, memo) {
            var fn = obj ? obj[name]: 0;
            return fn && fn === nativeFn ?
                fn.call(obj, iterator, memo):
                fallback(obj, iterator, memo);
        };
    };

    var eachSync = fallback('forEach', function (obj, iterator) {
        var isObj = obj instanceof Object;
        var arr = isObj ? keys(obj): (obj || []);
        for (var i = 0, len = arr.length; i < len; i++) {
            var k = isObj ? arr[i]: i;
            iterator(obj[k], k, obj);
        }
    });

    var eachParallel = function (obj, iterator, callback) {
        var len = obj.length || keys(obj).length;
        if (!len) {
            return callback();
        }
        var completed = 0;
        eachSync(obj, function () {
            var cb = function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    if (++completed === len) {
                        callback();
                    }
                }
            };
            var args = Array.prototype.slice.call(arguments);
            if (iterator.length) {
                args = args.slice(0, iterator.length - 1);
                args[iterator.length - 1] = cb;
            }
            else {
                args.push(cb);
            }
            iterator.apply(this, args);
        });
    };

    var eachSeries = function (obj, iterator, callback) {
        var keys_list = keys(obj);
        if (!keys_list.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            var k = keys_list[completed];
            var args = [obj[k], k, obj].slice(0, iterator.length - 1);
            args[iterator.length - 1] = function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    if (++completed === keys_list.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            };
            iterator.apply(this, args);
        };
        iterate();
    };

    var mapSync = fallback('map', function (obj, iterator) {
        var results = [];
        eachSync(obj, function (v, k, obj) {
            results[results.length] = iterator(v, k, obj);
        });
        return results;
    });

    var mapAsync = function (eachfn) {
        return function (obj, iterator, callback) {
            var results = [];
            eachfn(obj, function (value, i, obj, callback) {
                var cb = function (err, v) {
                    results[results.length] = v;
                    callback(err);
                };
                var args = [value, i, obj];
                if (iterator.length) {
                    args = args.slice(0, iterator.length - 1);
                    args[iterator.length - 1] = cb;
                }
                else {
                    args.push(cb);
                }
                iterator.apply(this, args);
            }, function (err) {
                callback(err, results);
            });
        };
    };

    var filterSync = fallback('filter', function (obj, iterator, callback) {
        var results = [];
        eachSync(obj, function (v, k, obj) {
            if (iterator(v, k, obj)) {
                results[results.length] = v;
            }
        });
        return results;
    });

    var filterParallel = function (obj, iterator, callback) {
        var results = [];
        eachParallel(obj, function (value, k, obj, callback) {
            var cb = function (err, a) {
                if (a) {
                    results[results.length] = value;
                }
                callback(err);
            };
            var args = [value, k, obj];
            if (iterator.length) {
                args = args.slice(0, iterator.length - 1);
                args[iterator.length - 1] = cb;
            }
            else {
                args.push(cb);
            }
            iterator.apply(this, args);
        }, function (err) {
            callback(err, results);
        });
    };

    var reduceSync = fallback('reduce', function (obj, iterator, memo) {
        eachSync(obj, function (v, i, obj) {
            memo = iterator(memo, v, i, obj);
        });
        return memo;
    });

    var reduceSeries = function (obj, iterator, memo, callback) {
        eachSeries(obj, function (value, i, obj, callback) {
            var cb = function (err, v) {
                memo = v;
                callback(err);
            };
            var args = [memo, value, i, obj];
            if (iterator.length) {
                args = args.slice(0, iterator.length - 1);
                args[iterator.length - 1] = cb;
            }
            else {
                args.push(cb);
            }
            iterator.apply(this, args);
        }, function (err) {
            callback(err, memo);
        });
    };

    exports.each = function (obj, iterator, callback) {
        return (callback ? eachParallel: eachSync)(obj, iterator, callback);
    };
    exports.map = function (obj, iterator, callback) {
        return (callback ? mapAsync(eachParallel): mapSync)(obj, iterator, callback);
    };
    exports.filter = function (obj, iterator, callback) {
        return (callback ? filterParallel: filterSync)(obj, iterator, callback);
    };
    exports.reduce = function (obj, iterator, memo, callback) {
        return (callback ? reduceSeries: reduceSync)(obj, iterator, memo, callback);
    };

    exports.parallel = function (fns, callback) {
        var results = new fns.constructor();
        eachParallel(fns, function (fn, k, cb) {
            fn(function (err) {
                var v = Array.prototype.slice.call(arguments, 1);
                results[k] = v.length <= 1 ? v[0]: v;
                cb(err);
            });
        }, function (err) {
            (callback || function () {})(err, results);
        });
    };

    exports.series = function (fns, callback) {
        var results = new fns.constructor();
        eachSeries(fns, function (fn, k, cb) {
            fn(function (err, result) {
                var v = Array.prototype.slice.call(arguments, 1);
                results[k] = v.length <= 1 ? v[0]: v;
                cb(err);
            });
        }, function (err) {
            (callback || function () {})(err, results);
        });
    };

}(typeof exports === 'undefined' ? this._ = this._ || {}: exports));

},{}],"/home/ubuntu/workspace/node_modules/wolfy87-eventemitter/EventEmitter.js":[function(require,module,exports){
/*!
 * EventEmitter v4.2.11 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function () {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var exports = this;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);
                i = listeners.length;

                while (i--) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}.call(this));

},{}],"/home/ubuntu/workspace/src/components/clips/clip-buttons.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    events = require('../../events/events');

module.exports = React.createClass({
	displayName: 'exports',

	getDefaultProps: function getDefaultProps() {
		return {
			className: '',
			clip: {},
			isEditable: false,
			isBeingEdited: false,
			clipHasContents: false
		};
	},

	render: function render() {
		var self = this,
		    p = self.props,
		    buttonNodes = {};

		if (!p.isBeingEdited) {
			buttonNodes.play = React.createElement(
				'button',
				{ className: 'play-button', title: 'Play Clip', onClick: function () {
						events.trigger(events.CLIP_PLAY, [p.clip]);
					} },
				''
			);

			if (p.isEditable) {
				buttonNodes.edit = React.createElement(
					'button',
					{ className: 'edit-button', title: 'Edit Clip', onClick: function () {
							events.trigger(events.CLIP_EDIT, [p.clip]);
						} },
					''
				);
			}
		} else {
			buttonNodes['delete'] = React.createElement(
				'button',
				{ className: 'delete-button', title: 'Delete Clip', onClick: function () {
						events.trigger(events.CLIP_DELETE, [p.clip]);
					} },
				''
			);

			if (p.clipHasContents) {
				buttonNodes.save = React.createElement(
					'button',
					{ className: 'save-button', title: 'Save Clip', onClick: function () {
							events.trigger(events.CLIP_SAVE, [p.clip]);
						} },
					''
				);
			}
		}

		return React.createElement(
			'div',
			{ className: p.className },
			buttonNodes.play,
			buttonNodes.edit,
			buttonNodes['delete'],
			buttonNodes.save
		);
	}
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../events/events":"/home/ubuntu/workspace/src/events/events.js"}],"/home/ubuntu/workspace/src/components/clips/clip.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    Buttons = require('./clip-buttons');

module.exports = React.createClass({
	displayName: 'exports',

	getDefaultProps: function getDefaultProps() {
		return {
			clip: {},
			isEditable: false,
			isBeingPlayed: false,
			isBeingEdited: false,
			isButtonsVisible: true
		};
	},

	getInitialState: function getInitialState() {
		return {
			clipHasContents: this.props.clip.hasContents()
		};
	},

	handleChange: function handleChange(prop, val) {
		this.props.clip[prop] = val;
		this.setState({ clipHasContents: this.props.clip.hasContents() });
	},

	render: function render() {
		var self = this,
		    p = self.props,
		    classes = {
			container: 'clip',
			clipPlaying: p.isBeingPlayed ? 'clip-playing' : '',
			clipEdit: p.isBeingEdited ? 'clip-edit' : '',
			name: 'clip-name',
			startTime: 'clip-start-time',
			endTime: 'clip-end-time',
			buttons: 'clip-buttons'
		},
		    clipNodes = [];

		if (!p.isBeingEdited) {
			clipNodes.push(React.createElement(
				'span',
				{ key: classes.name, className: classes.name },
				p.clip.name
			));
			clipNodes.push(React.createElement(
				'span',
				{ key: classes.startTime, className: classes.startTime },
				p.clip.startTime
			));
			clipNodes.push(React.createElement(
				'span',
				{ key: classes.endTime, className: classes.endTime },
				p.clip.endTime
			));
		} else {
			clipNodes.push(React.createElement('input', { key: classes.name, className: classes.name, type: 'text', defaultValue: p.clip.name, onChange: function (e) {
					self.handleChange('name', e.target.value);
				} }));
			clipNodes.push(React.createElement('input', { key: classes.startTime, className: classes.startTime, type: 'text', defaultValue: p.clip.startTime, onChange: function (e) {
					self.handleChange('startTime', e.target.value);
				} }));
			clipNodes.push(React.createElement('input', { key: classes.endTime, className: classes.endTime, type: 'text', defaultValue: p.clip.endTime, onChange: function (e) {
					self.handleChange('endTime', e.target.value);
				} }));
		}

		if (p.isButtonsVisible) {
			clipNodes.push(React.createElement(Buttons, { key: classes.buttons, className: classes.buttons, clip: p.clip, isEditable: p.isEditable, isBeingEdited: p.isBeingEdited, clipHasContents: self.state.clipHasContents }));
		}

		return React.createElement(
			'li',
			{ className: classes.container + ' ' + classes.clipPlaying + ' ' + classes.clipEdit },
			clipNodes
		);
	}
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./clip-buttons":"/home/ubuntu/workspace/src/components/clips/clip-buttons.js"}],"/home/ubuntu/workspace/src/components/clips/clips.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    Clip = require('./clip'),
    events = require('../../events/events');

module.exports = React.createClass({
	displayName: 'exports',

	getDefaultProps: function getDefaultProps() {
		return {
			fullVideo: {},
			clips: [],
			clipBeingPlayed: null,
			clipBeingEdited: null
		};
	},

	render: function render() {
		var self = this,
		    p = self.props,
		    newButttonNode;

		if (!p.clipBeingEdited) {
			newButttonNode = React.createElement(
				'button',
				{ className: 'new-button', title: 'New Clip', onClick: function () {
						events.trigger(events.CLIP_NEW);
					} },
				''
			);
		}

		return React.createElement(
			'ul',
			{ id: 'clips' },
			React.createElement(Clip, {
				key: '0',
				clip: p.fullVideo,
				isBeingPlayed: p.fullVideo === p.clipBeingPlayed,
				isButtonsVisible: !p.clipBeingEdited || p.clipBeingEdited === p.fullVideo }),
			p.clips.map(function (clip) {
				return React.createElement(Clip, {
					key: clip.id,
					clip: clip,
					isEditable: 'true',
					isBeingPlayed: clip === p.clipBeingPlayed,
					isBeingEdited: clip === p.clipBeingEdited,
					isButtonsVisible: !p.clipBeingEdited || p.clipBeingEdited === clip });
			}),
			newButttonNode
		);
	}
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../events/events":"/home/ubuntu/workspace/src/events/events.js","./clip":"/home/ubuntu/workspace/src/components/clips/clip.js"}],"/home/ubuntu/workspace/src/components/components.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    ReactDOM = (typeof window !== "undefined" ? window['ReactDOM'] : typeof global !== "undefined" ? global['ReactDOM'] : null),
    appElement = document.getElementById('app'),
    Site = React.createFactory(require('./site/site'));

module.exports = {
    render: function render(viewModel, callback) {
        ReactDOM.render(Site(viewModel), appElement, callback);
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./site/site":"/home/ubuntu/workspace/src/components/site/site.js"}],"/home/ubuntu/workspace/src/components/site/site.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    Clips = require('../clips/clips'),
    Video = require('../video/video');

module.exports = React.createClass({
	displayName: 'exports',

	getDefaultProps: function getDefaultProps() {
		return {};
	},

	render: function render() {
		var self = this,
		    p = self.props;

		return React.createElement(
			'div',
			{ id: 'site' },
			React.createElement(
				'h1',
				{ id: 'header' },
				React.createElement('img', { id: 'logo', src: '1.0.1/krossover-logo.png', alt: 'Krossover' })
			),
			React.createElement(
				'section',
				{ id: 'content' },
				React.createElement(Clips, { fullVideo: p.clips.fullVideo, clips: p.clips.collection, clipBeingPlayed: p.clips.clipBeingPlayed, clipBeingEdited: p.clips.clipBeingEdited }),
				React.createElement(Video, { fullVideo: p.clips.fullVideo, clip: p.clips.clipBeingPlayed })
			)
		);
	}
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../clips/clips":"/home/ubuntu/workspace/src/components/clips/clips.js","../video/video":"/home/ubuntu/workspace/src/components/video/video.js"}],"/home/ubuntu/workspace/src/components/video/video.js":[function(require,module,exports){
(function (global){
'use strict';

var React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null);

module.exports = React.createClass({
	displayName: 'exports',

	getDefaultProps: function getDefaultProps() {
		return {
			fullVideo: {},
			clip: null
		};
	},

	render: function render() {
		var self = this,
		    p = self.props,
		    videoURL = p.fullVideo.url,
		    videoNode;

		if (p.clip) {
			videoURL = videoURL + '#t=' + p.clip.startTime + ',' + p.clip.endTime + '&s=' + Date.now();
		}

		return React.createElement(
			'div',
			{ id: 'video-container' },
			React.createElement(
				'video',
				{ id: 'video', src: videoURL, autoPlay: !!p.clip, controls: !!p.clip },
				'Your browser does not support the ',
				React.createElement(
					'code',
					null,
					'video'
				),
				' element.'
			)
		);
	}
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/home/ubuntu/workspace/src/events/events.js":[function(require,module,exports){
/*
 * Triggers and responds to events throughout the app
 * Overrides event emitter so on(), off(), trigger(), once() can be used directly on this model.
 * ex. events.on(events.LOGIN_STATUS_CHANGED); events.trigger(events.LOGIN_STATUS_CHANGED);
 */

'use strict';

var EventEmitter = require('wolfy87-eventemitter'),
    Events;

Events = function () {
	var self = this;

	self.CLIP_PLAY = 'CLIP_PLAY';
	self.CLIP_EDIT = 'CLIP_EDIT';
	self.CLIP_SAVE = 'CLIP_SAVE';
	self.CLIP_DELETE = 'CLIP_DELETE';
	self.CLIP_NEW = 'CLIP_NEW';

	self.removeAllListeners();

	return self;
};

Events.prototype = EventEmitter.prototype;

Events.prototype.on = function (name, listenerFunction) {
	var self = this;
	return EventEmitter.prototype.addListener.call(self, name, function () {
		console.log(name);
		listenerFunction.apply(self, arguments);
	});
};

module.exports = new Events();

},{"wolfy87-eventemitter":"/home/ubuntu/workspace/node_modules/wolfy87-eventemitter/EventEmitter.js"}],"/home/ubuntu/workspace/src/index.js":[function(require,module,exports){
'use strict';

var events = require('./events/events'),
    models = require('./models/models'),
    components = require('./components/components');

// load data and do initial render
models.loadAll(function () {
    render();
});

events.on(events.CLIP_PLAY, function (clip) {
    models.clips.clipBeingPlayed = clip;
    render();
});

events.on(events.CLIP_EDIT, function (clip) {
    models.clips.clipBeingEdited = clip;
    models.clips.clipBeingPlayed = null;
    render();
});

events.on(events.CLIP_DELETE, function (clip) {
    models.clips.removeClip(clip);
    models.clips.clipBeingEdited = null;
    render();
});

events.on(events.CLIP_SAVE, function (clip) {
    models.clips.clipBeingEdited = null;
    render();
});

events.on(events.CLIP_NEW, function () {
    models.clips.clipBeingEdited = models.clips.addClip();
    models.clips.clipBeingPlayed = null;
    render();
});

function render() {
    components.render(models);
}

},{"./components/components":"/home/ubuntu/workspace/src/components/components.js","./events/events":"/home/ubuntu/workspace/src/events/events.js","./models/models":"/home/ubuntu/workspace/src/models/models.js"}],"/home/ubuntu/workspace/src/models/clips/clip-model.js":[function(require,module,exports){
"use strict";

function ClipModel(clipData) {
    clipData = clipData || {};
    this.id = clipData.id || null;
    this.name = clipData.name || null;
    this.startTime = clipData.startTime || null;
    this.endTime = clipData.endTime || null;
}

ClipModel.prototype.hasContents = function () {
    return !!this.name || !!this.startTime || !!this.endTime;
};

module.exports = ClipModel;

},{}],"/home/ubuntu/workspace/src/models/clips/clips-model.js":[function(require,module,exports){
'use strict';

var FullVideo = require('./full-video-model'),
    Clip = require('./clip-model');

function ClipsModel() {
    this.fullVideo = null;
    this.collection = [];
    this.clipBeingPlayed = null;
    this.clipBeingEdited = null;
};

ClipsModel.prototype.loadFullVideo = function (callback) {
    this.fullVideo = new FullVideo();
    this.fullVideo.id = 0;
    this.fullVideo.url = 'http://grochtdreis.de/fuer-jsfiddle/video/sintel_trailer-480.mp4';
    this.fullVideo.name = 'SINTEL TRAILER';
    this.fullVideo.endTime = '00:00:52';

    return callback(this);
};

ClipsModel.prototype.loadClips = function (callback) {
    var self = this,
        clipsData = [{ id: 1, name: 'What brings you...', startTime: '00:00:12', endTime: '00:00:22' }, { id: 2, name: 'A dangerous quest...', startTime: '00:00:36', endTime: '00:00:40' }, { id: 3, name: 'I\'ve been alone..', startTime: '00:00:41', endTime: '00:00:49' }];

    clipsData.forEach(function (clipData) {
        self.collection.push(new Clip(clipData));
    });

    return callback(self);
};

ClipsModel.prototype.addClip = function () {
    var newClip = new Clip();
    newClip.id = this.collection.length + 1;
    this.collection.push(newClip);
    return newClip;
};

ClipsModel.prototype.removeClip = function (clip) {
    this.collection = this.collection.filter(function (currentClip) {
        return currentClip !== clip;
    });
    return this;
};

module.exports = ClipsModel;

},{"./clip-model":"/home/ubuntu/workspace/src/models/clips/clip-model.js","./full-video-model":"/home/ubuntu/workspace/src/models/clips/full-video-model.js"}],"/home/ubuntu/workspace/src/models/clips/full-video-model.js":[function(require,module,exports){
'use strict';

var ClipModel = require('./clip-model');

function FullVideoModel(clipData) {
    ClipModel.apply(this, arguments);
    this.url = null;
    this.startTime = '00:00:00';
};

FullVideoModel.prototype = ClipModel.prototype;

module.exports = FullVideoModel;

},{"./clip-model":"/home/ubuntu/workspace/src/models/clips/clip-model.js"}],"/home/ubuntu/workspace/src/models/models.js":[function(require,module,exports){
'use strict';

var Clips = require('./clips/clips-model'),
    nimble = require('nimble');

function Models() {
    this.clips = new Clips();
};

Models.prototype.loadAll = function (callback) {
    var self = this;

    // load data in parallel from async sources
    nimble.parallel([function (finish) {
        self.clips.loadClips(function () {
            finish();
        });
    }, function (finish) {
        self.clips.loadFullVideo(function () {
            finish();
        });
    }], function () {
        return callback();
    });
};

module.exports = new Models();

},{"./clips/clips-model":"/home/ubuntu/workspace/src/models/clips/clips-model.js","nimble":"/home/ubuntu/workspace/node_modules/nimble/nimble.js"}]},{},["/home/ubuntu/workspace/src/index.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvbmltYmxlL25pbWJsZS5qcyIsIm5vZGVfbW9kdWxlcy93b2xmeTg3LWV2ZW50ZW1pdHRlci9FdmVudEVtaXR0ZXIuanMiLCIvaG9tZS91YnVudHUvd29ya3NwYWNlL3NyYy9jb21wb25lbnRzL2NsaXBzL2NsaXAtYnV0dG9ucy5qcyIsIi9ob21lL3VidW50dS93b3Jrc3BhY2Uvc3JjL2NvbXBvbmVudHMvY2xpcHMvY2xpcC5qcyIsIi9ob21lL3VidW50dS93b3Jrc3BhY2Uvc3JjL2NvbXBvbmVudHMvY2xpcHMvY2xpcHMuanMiLCIvaG9tZS91YnVudHUvd29ya3NwYWNlL3NyYy9jb21wb25lbnRzL2NvbXBvbmVudHMuanMiLCIvaG9tZS91YnVudHUvd29ya3NwYWNlL3NyYy9jb21wb25lbnRzL3NpdGUvc2l0ZS5qcyIsIi9ob21lL3VidW50dS93b3Jrc3BhY2Uvc3JjL2NvbXBvbmVudHMvdmlkZW8vdmlkZW8uanMiLCIvaG9tZS91YnVudHUvd29ya3NwYWNlL3NyYy9ldmVudHMvZXZlbnRzLmpzIiwiL2hvbWUvdWJ1bnR1L3dvcmtzcGFjZS9zcmMvaW5kZXguanMiLCIvaG9tZS91YnVudHUvd29ya3NwYWNlL3NyYy9tb2RlbHMvY2xpcHMvY2xpcC1tb2RlbC5qcyIsIi9ob21lL3VidW50dS93b3Jrc3BhY2Uvc3JjL21vZGVscy9jbGlwcy9jbGlwcy1tb2RlbC5qcyIsIi9ob21lL3VidW50dS93b3Jrc3BhY2Uvc3JjL21vZGVscy9jbGlwcy9mdWxsLXZpZGVvLW1vZGVsLmpzIiwiL2hvbWUvdWJ1bnR1L3dvcmtzcGFjZS9zcmMvbW9kZWxzL21vZGVscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMWRBLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDM0IsTUFBTSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDOztBQUV6QyxNQUFNLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFX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QztHQUN0RyxNQUNJO0FBQ0osWUFBUyxDQUFDLElBQUksQ0FBQywrQkFBTyxHQUFHLEVBQUcsT0FBTyxDQUFDLElBQUksQUFBRSxFQUFDLFNBQVMsRUFBRyxPQUFPLENBQUMsSUFBSSxBQUFFLEVBQUMsSUFBSSxFQUFDLE1BQU0sRUFBQyxZQUFZLEVBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEFBQUUsRUFBQyxRQUFRLEVBQUcsVUFBUyxDQUFDLEVBQUU7QUFBRSxTQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQUUsQUFBQyxHQUFHLENBQUMsQ0FBQztBQUN6TCxZQUFTLENBQUMsSUFBSSxDQUFDLCtCQUFPLEdBQUcsRUFBRyxPQUFPLENBQUMsU0FBUyxBQUFFLEVBQUMsU0FBUyxFQUFHLE9BQU8sQ0FBQyxTQUFTLEFBQUUsRUFBQyxJQUFJLEVBQUMsTUFBTSxFQUFDLFlBQVksRUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQUFBRSxFQUFDLFFBQVEsRUFBRyxVQUFTLENBQUMsRUFBRTtBQUFDLFNBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7S0FBRSxBQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVNLFlBQVMsQ0FBQyxJQUFJLENBQUMsK0JBQU8sR0FBRyxFQUFHLE9BQU8sQ0FBQyxPQUFPLEFBQUUsRUFBQyxTQUFTLEVBQUcsT0FBTyxDQUFDLE9BQU8sQUFBRSxFQUFDLElBQUksRUFBQyxNQUFNLEVBQUMsWUFBWSxFQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxBQUFFLEVBQUMsUUFBUSxFQUFHLFVBQVMsQ0FBQyxFQUFFO0FBQUUsU0FBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUFFLEFBQUMsR0FBRyxDQUFDLENBQUM7R0FDck07O0FBRUQsTUFBSSxDQUFDLENBQUMs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SUFBSSxHQUFHLElBQUksQ0FBQzs7O0FBR2hCLFVBQU0sQ0FBQyxRQUFRLENBQUMsQ0FDWixVQUFTLE1BQU0sRUFBRTtBQUNiLFlBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFlBQVk7QUFDN0Isa0JBQU0sRUFBRSxDQUFBO1NBQ1gsQ0FBQyxDQUFDO0tBQ04sRUFFRCxVQUFTLE1BQU0sRUFBRTtBQUNiLFlBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFlBQVc7QUFDaEMsa0JBQU0sRUFBRSxDQUFBO1NBQ1gsQ0FBQyxDQUFDO0tBQ04sQ0FDSixFQUFFLFlBQVc7QUFDVixlQUFPLFFBQVEsRUFBRSxDQUFDO0tBQ3JCLENBQUMsQ0FBQztDQUNOLENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogTmltYmxlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEgQ2FvbGFuIE1jTWFob25cbiAqXG4gKiBOaW1ibGUgaXMgZnJlZWx5IGRpc3RyaWJ1dGFibGUgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgb3B0aW1pemVkIGZvciBtaW5pZmljYXRpb24gYW5kIGd6aXAgY29tcHJlc3Npb24sIG5vdFxuICogcmVhZGFiaWxpdHkuIElmIHlvdSB3YW50IHJlYXNzdXJhbmNlLCBzZWUgdGhlIHRlc3Qgc3VpdGUuXG4gKi9cblxuKGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfTtcblxuICAgIHZhciBmYWxsYmFjayA9IGZ1bmN0aW9uIChuYW1lLCBmYWxsYmFjaykge1xuICAgICAgICB2YXIgbmF0aXZlRm4gPSBBcnJheS5wcm90b3R5cGVbbmFtZV07XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgbWVtbykge1xuICAgICAgICAgICAgdmFyIGZuID0gb2JqID8gb2JqW25hbWVdOiAwO1xuICAgICAgICAgICAgcmV0dXJuIGZuICYmIGZuID09PSBuYXRpdmVGbiA/XG4gICAgICAgICAgICAgICAgZm4uY2FsbChvYmosIGl0ZXJhdG9yLCBtZW1vKTpcbiAgICAgICAgICAgICAgICBmYWxsYmFjayhvYmosIGl0ZXJhdG9yLCBtZW1vKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIGVhY2hTeW5jID0gZmFsbGJhY2soJ2ZvckVhY2gnLCBmdW5jdGlvbiAob2JqLCBpdGVyYXRvcikge1xuICAgICAgICB2YXIgaXNPYmogPSBvYmogaW5zdGFuY2VvZiBPYmplY3Q7XG4gICAgICAgIHZhciBhcnIgPSBpc09iaiA/IGtleXMob2JqKTogKG9iaiB8fCBbXSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrID0gaXNPYmogPyBhcnJbaV06IGk7XG4gICAgICAgICAgICBpdGVyYXRvcihvYmpba10sIGssIG9iaik7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBlYWNoUGFyYWxsZWwgPSBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGxlbiA9IG9iai5sZW5ndGggfHwga2V5cyhvYmopLmxlbmd0aDtcbiAgICAgICAgaWYgKCFsZW4pIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICBlYWNoU3luYyhvYmosIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjYiA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKytjb21wbGV0ZWQgPT09IGxlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBpZiAoaXRlcmF0b3IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgaXRlcmF0b3IubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgYXJnc1tpdGVyYXRvci5sZW5ndGggLSAxXSA9IGNiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGVhY2hTZXJpZXMgPSBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGtleXNfbGlzdCA9IGtleXMob2JqKTtcbiAgICAgICAgaWYgKCFrZXlzX2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgdmFyIGl0ZXJhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgayA9IGtleXNfbGlzdFtjb21wbGV0ZWRdO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbb2JqW2tdLCBrLCBvYmpdLnNsaWNlKDAsIGl0ZXJhdG9yLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgYXJnc1tpdGVyYXRvci5sZW5ndGggLSAxXSA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKytjb21wbGV0ZWQgPT09IGtleXNfbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgICAgIGl0ZXJhdGUoKTtcbiAgICB9O1xuXG4gICAgdmFyIG1hcFN5bmMgPSBmYWxsYmFjaygnbWFwJywgZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IpIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZWFjaFN5bmMob2JqLCBmdW5jdGlvbiAodiwgaywgb2JqKSB7XG4gICAgICAgICAgICByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoXSA9IGl0ZXJhdG9yKHYsIGssIG9iaik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9KTtcblxuICAgIHZhciBtYXBBc3luYyA9IGZ1bmN0aW9uIChlYWNoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIGVhY2hmbihvYmosIGZ1bmN0aW9uICh2YWx1ZSwgaSwgb2JqLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHZhciBjYiA9IGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSB2O1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbdmFsdWUsIGksIG9ial07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZXJhdG9yLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJncy5zbGljZSgwLCBpdGVyYXRvci5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1tpdGVyYXRvci5sZW5ndGggLSAxXSA9IGNiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgZmlsdGVyU3luYyA9IGZhbGxiYWNrKCdmaWx0ZXInLCBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZWFjaFN5bmMob2JqLCBmdW5jdGlvbiAodiwgaywgb2JqKSB7XG4gICAgICAgICAgICBpZiAoaXRlcmF0b3Iodiwgaywgb2JqKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGhdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH0pO1xuXG4gICAgdmFyIGZpbHRlclBhcmFsbGVsID0gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGVhY2hQYXJhbGxlbChvYmosIGZ1bmN0aW9uICh2YWx1ZSwgaywgb2JqLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGNiID0gZnVuY3Rpb24gKGVyciwgYSkge1xuICAgICAgICAgICAgICAgIGlmIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGhdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbdmFsdWUsIGssIG9ial07XG4gICAgICAgICAgICBpZiAoaXRlcmF0b3IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgaXRlcmF0b3IubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgYXJnc1tpdGVyYXRvci5sZW5ndGggLSAxXSA9IGNiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHJlZHVjZVN5bmMgPSBmYWxsYmFjaygncmVkdWNlJywgZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIG1lbW8pIHtcbiAgICAgICAgZWFjaFN5bmMob2JqLCBmdW5jdGlvbiAodiwgaSwgb2JqKSB7XG4gICAgICAgICAgICBtZW1vID0gaXRlcmF0b3IobWVtbywgdiwgaSwgb2JqKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0pO1xuXG4gICAgdmFyIHJlZHVjZVNlcmllcyA9IGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBtZW1vLCBjYWxsYmFjaykge1xuICAgICAgICBlYWNoU2VyaWVzKG9iaiwgZnVuY3Rpb24gKHZhbHVlLCBpLCBvYmosIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgY2IgPSBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgYXJncyA9IFttZW1vLCB2YWx1ZSwgaSwgb2JqXTtcbiAgICAgICAgICAgIGlmIChpdGVyYXRvci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJncy5zbGljZSgwLCBpdGVyYXRvci5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICBhcmdzW2l0ZXJhdG9yLmxlbmd0aCAtIDFdID0gY2I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWVtbyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBleHBvcnRzLmVhY2ggPSBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIChjYWxsYmFjayA/IGVhY2hQYXJhbGxlbDogZWFjaFN5bmMpKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIGV4cG9ydHMubWFwID0gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiAoY2FsbGJhY2sgPyBtYXBBc3luYyhlYWNoUGFyYWxsZWwpOiBtYXBTeW5jKShvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICBleHBvcnRzLmZpbHRlciA9IGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gKGNhbGxiYWNrID8gZmlsdGVyUGFyYWxsZWw6IGZpbHRlclN5bmMpKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIGV4cG9ydHMucmVkdWNlID0gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiAoY2FsbGJhY2sgPyByZWR1Y2VTZXJpZXM6IHJlZHVjZVN5bmMpKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5wYXJhbGxlbCA9IGZ1bmN0aW9uIChmbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gbmV3IGZucy5jb25zdHJ1Y3RvcigpO1xuICAgICAgICBlYWNoUGFyYWxsZWwoZm5zLCBmdW5jdGlvbiAoZm4sIGssIGNiKSB7XG4gICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSB2Lmxlbmd0aCA8PSAxID8gdlswXTogdjtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIChjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fSkoZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGV4cG9ydHMuc2VyaWVzID0gZnVuY3Rpb24gKGZucywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBuZXcgZm5zLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIGVhY2hTZXJpZXMoZm5zLCBmdW5jdGlvbiAoZm4sIGssIGNiKSB7XG4gICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IHYubGVuZ3RoIDw9IDEgPyB2WzBdOiB2O1xuICAgICAgICAgICAgICAgIGNiKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgKGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9KShlcnIsIHJlc3VsdHMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/IHRoaXMuXyA9IHRoaXMuXyB8fCB7fTogZXhwb3J0cykpO1xuIiwiLyohXG4gKiBFdmVudEVtaXR0ZXIgdjQuMi4xMSAtIGdpdC5pby9lZVxuICogVW5saWNlbnNlIC0gaHR0cDovL3VubGljZW5zZS5vcmcvXG4gKiBPbGl2ZXIgQ2FsZHdlbGwgLSBodHRwOi8vb2xpLm1lLnVrL1xuICogQHByZXNlcnZlXG4gKi9cblxuOyhmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQ2xhc3MgZm9yIG1hbmFnaW5nIGV2ZW50cy5cbiAgICAgKiBDYW4gYmUgZXh0ZW5kZWQgdG8gcHJvdmlkZSBldmVudCBmdW5jdGlvbmFsaXR5IGluIG90aGVyIGNsYXNzZXMuXG4gICAgICpcbiAgICAgKiBAY2xhc3MgRXZlbnRFbWl0dGVyIE1hbmFnZXMgZXZlbnQgcmVnaXN0ZXJpbmcgYW5kIGVtaXR0aW5nLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHt9XG5cbiAgICAvLyBTaG9ydGN1dHMgdG8gaW1wcm92ZSBzcGVlZCBhbmQgc2l6ZVxuICAgIHZhciBwcm90byA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGU7XG4gICAgdmFyIGV4cG9ydHMgPSB0aGlzO1xuICAgIHZhciBvcmlnaW5hbEdsb2JhbFZhbHVlID0gZXhwb3J0cy5FdmVudEVtaXR0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgaW5kZXggb2YgdGhlIGxpc3RlbmVyIGZvciB0aGUgZXZlbnQgaW4gaXRzIHN0b3JhZ2UgYXJyYXkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uW119IGxpc3RlbmVycyBBcnJheSBvZiBsaXN0ZW5lcnMgdG8gc2VhcmNoIHRocm91Z2guXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgTWV0aG9kIHRvIGxvb2sgZm9yLlxuICAgICAqIEByZXR1cm4ge051bWJlcn0gSW5kZXggb2YgdGhlIHNwZWNpZmllZCBsaXN0ZW5lciwgLTEgaWYgbm90IGZvdW5kXG4gICAgICogQGFwaSBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVycywgbGlzdGVuZXIpIHtcbiAgICAgICAgdmFyIGkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFsaWFzIGEgbWV0aG9kIHdoaWxlIGtlZXBpbmcgdGhlIGNvbnRleHQgY29ycmVjdCwgdG8gYWxsb3cgZm9yIG92ZXJ3cml0aW5nIG9mIHRhcmdldCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgdGFyZ2V0IG1ldGhvZC5cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGFsaWFzZWQgbWV0aG9kXG4gICAgICogQGFwaSBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWxpYXMobmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYWxpYXNDbG9zdXJlKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbbmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsaXN0ZW5lciBhcnJheSBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBXaWxsIGluaXRpYWxpc2UgdGhlIGV2ZW50IG9iamVjdCBhbmQgbGlzdGVuZXIgYXJyYXlzIGlmIHJlcXVpcmVkLlxuICAgICAqIFdpbGwgcmV0dXJuIGFuIG9iamVjdCBpZiB5b3UgdXNlIGEgcmVnZXggc2VhcmNoLiBUaGUgb2JqZWN0IGNvbnRhaW5zIGtleXMgZm9yIGVhY2ggbWF0Y2hlZCBldmVudC4gU28gL2JhW3J6XS8gbWlnaHQgcmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGJhciBhbmQgYmF6LiBCdXQgb25seSBpZiB5b3UgaGF2ZSBlaXRoZXIgZGVmaW5lZCB0aGVtIHdpdGggZGVmaW5lRXZlbnQgb3IgYWRkZWQgc29tZSBsaXN0ZW5lcnMgdG8gdGhlbS5cbiAgICAgKiBFYWNoIHByb3BlcnR5IGluIHRoZSBvYmplY3QgcmVzcG9uc2UgaXMgYW4gYXJyYXkgb2YgbGlzdGVuZXIgZnVuY3Rpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gcmV0dXJuIHRoZSBsaXN0ZW5lcnMgZnJvbS5cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbltdfE9iamVjdH0gQWxsIGxpc3RlbmVyIGZ1bmN0aW9ucyBmb3IgdGhlIGV2ZW50LlxuICAgICAqL1xuICAgIHByb3RvLmdldExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldExpc3RlbmVycyhldnQpIHtcbiAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2dldEV2ZW50cygpO1xuICAgICAgICB2YXIgcmVzcG9uc2U7XG4gICAgICAgIHZhciBrZXk7XG5cbiAgICAgICAgLy8gUmV0dXJuIGEgY29uY2F0ZW5hdGVkIGFycmF5IG9mIGFsbCBtYXRjaGluZyBldmVudHMgaWZcbiAgICAgICAgLy8gdGhlIHNlbGVjdG9yIGlzIGEgcmVndWxhciBleHByZXNzaW9uLlxuICAgICAgICBpZiAoZXZ0IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IHt9O1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIGV2dC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2Vba2V5XSA9IGV2ZW50c1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0gZXZlbnRzW2V2dF0gfHwgKGV2ZW50c1tldnRdID0gW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUYWtlcyBhIGxpc3Qgb2YgbGlzdGVuZXIgb2JqZWN0cyBhbmQgZmxhdHRlbnMgaXQgaW50byBhIGxpc3Qgb2YgbGlzdGVuZXIgZnVuY3Rpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3RbXX0gbGlzdGVuZXJzIFJhdyBsaXN0ZW5lciBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9uW119IEp1c3QgdGhlIGxpc3RlbmVyIGZ1bmN0aW9ucy5cbiAgICAgKi9cbiAgICBwcm90by5mbGF0dGVuTGlzdGVuZXJzID0gZnVuY3Rpb24gZmxhdHRlbkxpc3RlbmVycyhsaXN0ZW5lcnMpIHtcbiAgICAgICAgdmFyIGZsYXRMaXN0ZW5lcnMgPSBbXTtcbiAgICAgICAgdmFyIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgZmxhdExpc3RlbmVycy5wdXNoKGxpc3RlbmVyc1tpXS5saXN0ZW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmxhdExpc3RlbmVycztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgcmVxdWVzdGVkIGxpc3RlbmVycyB2aWEgZ2V0TGlzdGVuZXJzIGJ1dCB3aWxsIGFsd2F5cyByZXR1cm4gdGhlIHJlc3VsdHMgaW5zaWRlIGFuIG9iamVjdC4gVGhpcyBpcyBtYWlubHkgZm9yIGludGVybmFsIHVzZSBidXQgb3RoZXJzIG1heSBmaW5kIGl0IHVzZWZ1bC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gZXZ0IE5hbWUgb2YgdGhlIGV2ZW50IHRvIHJldHVybiB0aGUgbGlzdGVuZXJzIGZyb20uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBBbGwgbGlzdGVuZXIgZnVuY3Rpb25zIGZvciBhbiBldmVudCBpbiBhbiBvYmplY3QuXG4gICAgICovXG4gICAgcHJvdG8uZ2V0TGlzdGVuZXJzQXNPYmplY3QgPSBmdW5jdGlvbiBnZXRMaXN0ZW5lcnNBc09iamVjdChldnQpIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXJzKGV2dCk7XG4gICAgICAgIHZhciByZXNwb25zZTtcblxuICAgICAgICBpZiAobGlzdGVuZXJzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0ge307XG4gICAgICAgICAgICByZXNwb25zZVtldnRdID0gbGlzdGVuZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IGxpc3RlbmVycztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGxpc3RlbmVyIGZ1bmN0aW9uIHRvIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogVGhlIGxpc3RlbmVyIHdpbGwgbm90IGJlIGFkZGVkIGlmIGl0IGlzIGEgZHVwbGljYXRlLlxuICAgICAqIElmIHRoZSBsaXN0ZW5lciByZXR1cm5zIHRydWUgdGhlbiBpdCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgaXQgaXMgY2FsbGVkLlxuICAgICAqIElmIHlvdSBwYXNzIGEgcmVndWxhciBleHByZXNzaW9uIGFzIHRoZSBldmVudCBuYW1lIHRoZW4gdGhlIGxpc3RlbmVyIHdpbGwgYmUgYWRkZWQgdG8gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gYXR0YWNoIHRoZSBsaXN0ZW5lciB0by5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBNZXRob2QgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGV2ZW50IGlzIGVtaXR0ZWQuIElmIHRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUgdGhlbiBpdCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgY2FsbGluZy5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZExpc3RlbmVyKGV2dCwgbGlzdGVuZXIpIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXJzQXNPYmplY3QoZXZ0KTtcbiAgICAgICAgdmFyIGxpc3RlbmVySXNXcmFwcGVkID0gdHlwZW9mIGxpc3RlbmVyID09PSAnb2JqZWN0JztcbiAgICAgICAgdmFyIGtleTtcblxuICAgICAgICBmb3IgKGtleSBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBpbmRleE9mTGlzdGVuZXIobGlzdGVuZXJzW2tleV0sIGxpc3RlbmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnNba2V5XS5wdXNoKGxpc3RlbmVySXNXcmFwcGVkID8gbGlzdGVuZXIgOiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyOiBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgb25jZTogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBbGlhcyBvZiBhZGRMaXN0ZW5lclxuICAgICAqL1xuICAgIHByb3RvLm9uID0gYWxpYXMoJ2FkZExpc3RlbmVyJyk7XG5cbiAgICAvKipcbiAgICAgKiBTZW1pLWFsaWFzIG9mIGFkZExpc3RlbmVyLiBJdCB3aWxsIGFkZCBhIGxpc3RlbmVyIHRoYXQgd2lsbCBiZVxuICAgICAqIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZCBhZnRlciBpdHMgZmlyc3QgZXhlY3V0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gYXR0YWNoIHRoZSBsaXN0ZW5lciB0by5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBNZXRob2QgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGV2ZW50IGlzIGVtaXR0ZWQuIElmIHRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUgdGhlbiBpdCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgY2FsbGluZy5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5hZGRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRPbmNlTGlzdGVuZXIoZXZ0LCBsaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldnQsIHtcbiAgICAgICAgICAgIGxpc3RlbmVyOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIG9uY2U6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIGFkZE9uY2VMaXN0ZW5lci5cbiAgICAgKi9cbiAgICBwcm90by5vbmNlID0gYWxpYXMoJ2FkZE9uY2VMaXN0ZW5lcicpO1xuXG4gICAgLyoqXG4gICAgICogRGVmaW5lcyBhbiBldmVudCBuYW1lLiBUaGlzIGlzIHJlcXVpcmVkIGlmIHlvdSB3YW50IHRvIHVzZSBhIHJlZ2V4IHRvIGFkZCBhIGxpc3RlbmVyIHRvIG11bHRpcGxlIGV2ZW50cyBhdCBvbmNlLiBJZiB5b3UgZG9uJ3QgZG8gdGhpcyB0aGVuIGhvdyBkbyB5b3UgZXhwZWN0IGl0IHRvIGtub3cgd2hhdCBldmVudCB0byBhZGQgdG8/IFNob3VsZCBpdCBqdXN0IGFkZCB0byBldmVyeSBwb3NzaWJsZSBtYXRjaCBmb3IgYSByZWdleD8gTm8uIFRoYXQgaXMgc2NhcnkgYW5kIGJhZC5cbiAgICAgKiBZb3UgbmVlZCB0byB0ZWxsIGl0IHdoYXQgZXZlbnQgbmFtZXMgc2hvdWxkIGJlIG1hdGNoZWQgYnkgYSByZWdleC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gY3JlYXRlLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLmRlZmluZUV2ZW50ID0gZnVuY3Rpb24gZGVmaW5lRXZlbnQoZXZ0KSB7XG4gICAgICAgIHRoaXMuZ2V0TGlzdGVuZXJzKGV2dCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVc2VzIGRlZmluZUV2ZW50IHRvIGRlZmluZSBtdWx0aXBsZSBldmVudHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBldnRzIEFuIGFycmF5IG9mIGV2ZW50IG5hbWVzIHRvIGRlZmluZS5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5kZWZpbmVFdmVudHMgPSBmdW5jdGlvbiBkZWZpbmVFdmVudHMoZXZ0cykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2dHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIHRoaXMuZGVmaW5lRXZlbnQoZXZ0c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBsaXN0ZW5lciBmdW5jdGlvbiBmcm9tIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogV2hlbiBwYXNzZWQgYSByZWd1bGFyIGV4cHJlc3Npb24gYXMgdGhlIGV2ZW50IG5hbWUsIGl0IHdpbGwgcmVtb3ZlIHRoZSBsaXN0ZW5lciBmcm9tIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gZXZ0IE5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIgZnJvbS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBNZXRob2QgdG8gcmVtb3ZlIGZyb20gdGhlIGV2ZW50LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZ0LCBsaXN0ZW5lcikge1xuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcnNBc09iamVjdChldnQpO1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIHZhciBrZXk7XG5cbiAgICAgICAgZm9yIChrZXkgaW4gbGlzdGVuZXJzKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGluZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lcnNba2V5XSwgbGlzdGVuZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnNba2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBbGlhcyBvZiByZW1vdmVMaXN0ZW5lclxuICAgICAqL1xuICAgIHByb3RvLm9mZiA9IGFsaWFzKCdyZW1vdmVMaXN0ZW5lcicpO1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBsaXN0ZW5lcnMgaW4gYnVsayB1c2luZyB0aGUgbWFuaXB1bGF0ZUxpc3RlbmVycyBtZXRob2QuXG4gICAgICogSWYgeW91IHBhc3MgYW4gb2JqZWN0IGFzIHRoZSBzZWNvbmQgYXJndW1lbnQgeW91IGNhbiBhZGQgdG8gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuIFRoZSBvYmplY3Qgc2hvdWxkIGNvbnRhaW4ga2V5IHZhbHVlIHBhaXJzIG9mIGV2ZW50cyBhbmQgbGlzdGVuZXJzIG9yIGxpc3RlbmVyIGFycmF5cy4gWW91IGNhbiBhbHNvIHBhc3MgaXQgYW4gZXZlbnQgbmFtZSBhbmQgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIHRvIGJlIGFkZGVkLlxuICAgICAqIFlvdSBjYW4gYWxzbyBwYXNzIGl0IGEgcmVndWxhciBleHByZXNzaW9uIHRvIGFkZCB0aGUgYXJyYXkgb2YgbGlzdGVuZXJzIHRvIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKiBZZWFoLCB0aGlzIGZ1bmN0aW9uIGRvZXMgcXVpdGUgYSBiaXQuIFRoYXQncyBwcm9iYWJseSBhIGJhZCB0aGluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxSZWdFeHB9IGV2dCBBbiBldmVudCBuYW1lIGlmIHlvdSB3aWxsIHBhc3MgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIG5leHQuIEFuIG9iamVjdCBpZiB5b3Ugd2lzaCB0byBhZGQgdG8gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbltdfSBbbGlzdGVuZXJzXSBBbiBvcHRpb25hbCBhcnJheSBvZiBsaXN0ZW5lciBmdW5jdGlvbnMgdG8gYWRkLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLmFkZExpc3RlbmVycyA9IGZ1bmN0aW9uIGFkZExpc3RlbmVycyhldnQsIGxpc3RlbmVycykge1xuICAgICAgICAvLyBQYXNzIHRocm91Z2ggdG8gbWFuaXB1bGF0ZUxpc3RlbmVyc1xuICAgICAgICByZXR1cm4gdGhpcy5tYW5pcHVsYXRlTGlzdGVuZXJzKGZhbHNlLCBldnQsIGxpc3RlbmVycyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgbGlzdGVuZXJzIGluIGJ1bGsgdXNpbmcgdGhlIG1hbmlwdWxhdGVMaXN0ZW5lcnMgbWV0aG9kLlxuICAgICAqIElmIHlvdSBwYXNzIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IHlvdSBjYW4gcmVtb3ZlIGZyb20gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuIFRoZSBvYmplY3Qgc2hvdWxkIGNvbnRhaW4ga2V5IHZhbHVlIHBhaXJzIG9mIGV2ZW50cyBhbmQgbGlzdGVuZXJzIG9yIGxpc3RlbmVyIGFycmF5cy5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBpdCBhbiBldmVudCBuYW1lIGFuZCBhbiBhcnJheSBvZiBsaXN0ZW5lcnMgdG8gYmUgcmVtb3ZlZC5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBpdCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVycyBmcm9tIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxSZWdFeHB9IGV2dCBBbiBldmVudCBuYW1lIGlmIHlvdSB3aWxsIHBhc3MgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIG5leHQuIEFuIG9iamVjdCBpZiB5b3Ugd2lzaCB0byByZW1vdmUgZnJvbSBtdWx0aXBsZSBldmVudHMgYXQgb25jZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uW119IFtsaXN0ZW5lcnNdIEFuIG9wdGlvbmFsIGFycmF5IG9mIGxpc3RlbmVyIGZ1bmN0aW9ucyB0byByZW1vdmUuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8ucmVtb3ZlTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJzKGV2dCwgbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFBhc3MgdGhyb3VnaCB0byBtYW5pcHVsYXRlTGlzdGVuZXJzXG4gICAgICAgIHJldHVybiB0aGlzLm1hbmlwdWxhdGVMaXN0ZW5lcnModHJ1ZSwgZXZ0LCBsaXN0ZW5lcnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFZGl0cyBsaXN0ZW5lcnMgaW4gYnVsay4gVGhlIGFkZExpc3RlbmVycyBhbmQgcmVtb3ZlTGlzdGVuZXJzIG1ldGhvZHMgYm90aCB1c2UgdGhpcyB0byBkbyB0aGVpciBqb2IuIFlvdSBzaG91bGQgcmVhbGx5IHVzZSB0aG9zZSBpbnN0ZWFkLCB0aGlzIGlzIGEgbGl0dGxlIGxvd2VyIGxldmVsLlxuICAgICAqIFRoZSBmaXJzdCBhcmd1bWVudCB3aWxsIGRldGVybWluZSBpZiB0aGUgbGlzdGVuZXJzIGFyZSByZW1vdmVkICh0cnVlKSBvciBhZGRlZCAoZmFsc2UpLlxuICAgICAqIElmIHlvdSBwYXNzIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IHlvdSBjYW4gYWRkL3JlbW92ZSBmcm9tIG11bHRpcGxlIGV2ZW50cyBhdCBvbmNlLiBUaGUgb2JqZWN0IHNob3VsZCBjb250YWluIGtleSB2YWx1ZSBwYWlycyBvZiBldmVudHMgYW5kIGxpc3RlbmVycyBvciBsaXN0ZW5lciBhcnJheXMuXG4gICAgICogWW91IGNhbiBhbHNvIHBhc3MgaXQgYW4gZXZlbnQgbmFtZSBhbmQgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIHRvIGJlIGFkZGVkL3JlbW92ZWQuXG4gICAgICogWW91IGNhbiBhbHNvIHBhc3MgaXQgYSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWFuaXB1bGF0ZSB0aGUgbGlzdGVuZXJzIG9mIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVtb3ZlIFRydWUgaWYgeW91IHdhbnQgdG8gcmVtb3ZlIGxpc3RlbmVycywgZmFsc2UgaWYgeW91IHdhbnQgdG8gYWRkLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxSZWdFeHB9IGV2dCBBbiBldmVudCBuYW1lIGlmIHlvdSB3aWxsIHBhc3MgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIG5leHQuIEFuIG9iamVjdCBpZiB5b3Ugd2lzaCB0byBhZGQvcmVtb3ZlIGZyb20gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbltdfSBbbGlzdGVuZXJzXSBBbiBvcHRpb25hbCBhcnJheSBvZiBsaXN0ZW5lciBmdW5jdGlvbnMgdG8gYWRkL3JlbW92ZS5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5tYW5pcHVsYXRlTGlzdGVuZXJzID0gZnVuY3Rpb24gbWFuaXB1bGF0ZUxpc3RlbmVycyhyZW1vdmUsIGV2dCwgbGlzdGVuZXJzKSB7XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIHZhciBzaW5nbGUgPSByZW1vdmUgPyB0aGlzLnJlbW92ZUxpc3RlbmVyIDogdGhpcy5hZGRMaXN0ZW5lcjtcbiAgICAgICAgdmFyIG11bHRpcGxlID0gcmVtb3ZlID8gdGhpcy5yZW1vdmVMaXN0ZW5lcnMgOiB0aGlzLmFkZExpc3RlbmVycztcblxuICAgICAgICAvLyBJZiBldnQgaXMgYW4gb2JqZWN0IHRoZW4gcGFzcyBlYWNoIG9mIGl0cyBwcm9wZXJ0aWVzIHRvIHRoaXMgbWV0aG9kXG4gICAgICAgIGlmICh0eXBlb2YgZXZ0ID09PSAnb2JqZWN0JyAmJiAhKGV2dCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgICAgIGZvciAoaSBpbiBldnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZ0Lmhhc093blByb3BlcnR5KGkpICYmICh2YWx1ZSA9IGV2dFtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFzcyB0aGUgc2luZ2xlIGxpc3RlbmVyIHN0cmFpZ2h0IHRocm91Z2ggdG8gdGhlIHNpbmd1bGFyIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaW5nbGUuY2FsbCh0aGlzLCBpLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdGhlcndpc2UgcGFzcyBiYWNrIHRvIHRoZSBtdWx0aXBsZSBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUuY2FsbCh0aGlzLCBpLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBTbyBldnQgbXVzdCBiZSBhIHN0cmluZ1xuICAgICAgICAgICAgLy8gQW5kIGxpc3RlbmVycyBtdXN0IGJlIGFuIGFycmF5IG9mIGxpc3RlbmVyc1xuICAgICAgICAgICAgLy8gTG9vcCBvdmVyIGl0IGFuZCBwYXNzIGVhY2ggb25lIHRvIHRoZSBtdWx0aXBsZSBtZXRob2RcbiAgICAgICAgICAgIGkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIHNpbmdsZS5jYWxsKHRoaXMsIGV2dCwgbGlzdGVuZXJzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMgZnJvbSBhIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBJZiB5b3UgZG8gbm90IHNwZWNpZnkgYW4gZXZlbnQgdGhlbiBhbGwgbGlzdGVuZXJzIHdpbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiBUaGF0IG1lYW5zIGV2ZXJ5IGV2ZW50IHdpbGwgYmUgZW1wdGllZC5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBhIHJlZ2V4IHRvIHJlbW92ZSBhbGwgZXZlbnRzIHRoYXQgbWF0Y2ggaXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB9IFtldnRdIE9wdGlvbmFsIG5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci4gV2lsbCByZW1vdmUgZnJvbSBldmVyeSBldmVudCBpZiBub3QgcGFzc2VkLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLnJlbW92ZUV2ZW50ID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnQoZXZ0KSB7XG4gICAgICAgIHZhciB0eXBlID0gdHlwZW9mIGV2dDtcbiAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2dldEV2ZW50cygpO1xuICAgICAgICB2YXIga2V5O1xuXG4gICAgICAgIC8vIFJlbW92ZSBkaWZmZXJlbnQgdGhpbmdzIGRlcGVuZGluZyBvbiB0aGUgc3RhdGUgb2YgZXZ0XG4gICAgICAgIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnRcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbZXZ0XTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChldnQgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgZXZlbnRzIG1hdGNoaW5nIHRoZSByZWdleC5cbiAgICAgICAgICAgIGZvciAoa2V5IGluIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChldmVudHMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBldnQudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBldmVudHNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgYWxsIGxpc3RlbmVycyBpbiBhbGwgZXZlbnRzXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIHJlbW92ZUV2ZW50LlxuICAgICAqXG4gICAgICogQWRkZWQgdG8gbWlycm9yIHRoZSBub2RlIEFQSS5cbiAgICAgKi9cbiAgICBwcm90by5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBhbGlhcygncmVtb3ZlRXZlbnQnKTtcblxuICAgIC8qKlxuICAgICAqIEVtaXRzIGFuIGV2ZW50IG9mIHlvdXIgY2hvaWNlLlxuICAgICAqIFdoZW4gZW1pdHRlZCwgZXZlcnkgbGlzdGVuZXIgYXR0YWNoZWQgdG8gdGhhdCBldmVudCB3aWxsIGJlIGV4ZWN1dGVkLlxuICAgICAqIElmIHlvdSBwYXNzIHRoZSBvcHRpb25hbCBhcmd1bWVudCBhcnJheSB0aGVuIHRob3NlIGFyZ3VtZW50cyB3aWxsIGJlIHBhc3NlZCB0byBldmVyeSBsaXN0ZW5lciB1cG9uIGV4ZWN1dGlvbi5cbiAgICAgKiBCZWNhdXNlIGl0IHVzZXMgYGFwcGx5YCwgeW91ciBhcnJheSBvZiBhcmd1bWVudHMgd2lsbCBiZSBwYXNzZWQgYXMgaWYgeW91IHdyb3RlIHRoZW0gb3V0IHNlcGFyYXRlbHkuXG4gICAgICogU28gdGhleSB3aWxsIG5vdCBhcnJpdmUgd2l0aGluIHRoZSBhcnJheSBvbiB0aGUgb3RoZXIgc2lkZSwgdGhleSB3aWxsIGJlIHNlcGFyYXRlLlxuICAgICAqIFlvdSBjYW4gYWxzbyBwYXNzIGEgcmVndWxhciBleHByZXNzaW9uIHRvIGVtaXQgdG8gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdCBhbmQgZXhlY3V0ZSBsaXN0ZW5lcnMgZm9yLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFthcmdzXSBPcHRpb25hbCBhcnJheSBvZiBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIGVhY2ggbGlzdGVuZXIuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uZW1pdEV2ZW50ID0gZnVuY3Rpb24gZW1pdEV2ZW50KGV2dCwgYXJncykge1xuICAgICAgICB2YXIgbGlzdGVuZXJzTWFwID0gdGhpcy5nZXRMaXN0ZW5lcnNBc09iamVjdChldnQpO1xuICAgICAgICB2YXIgbGlzdGVuZXJzO1xuICAgICAgICB2YXIgbGlzdGVuZXI7XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICB2YXIgcmVzcG9uc2U7XG5cbiAgICAgICAgZm9yIChrZXkgaW4gbGlzdGVuZXJzTWFwKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzTWFwLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnNNYXBba2V5XS5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICBpID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybnMgdHJ1ZSB0aGVuIGl0IHNoYWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGZ1bmN0aW9uIGlzIGV4ZWN1dGVkIGVpdGhlciB3aXRoIGEgYmFzaWMgY2FsbCBvciBhbiBhcHBseSBpZiB0aGVyZSBpcyBhbiBhcmdzIGFycmF5XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci5vbmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2dCwgbGlzdGVuZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBsaXN0ZW5lci5saXN0ZW5lci5hcHBseSh0aGlzLCBhcmdzIHx8IFtdKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRoaXMuX2dldE9uY2VSZXR1cm5WYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2dCwgbGlzdGVuZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIGVtaXRFdmVudFxuICAgICAqL1xuICAgIHByb3RvLnRyaWdnZXIgPSBhbGlhcygnZW1pdEV2ZW50Jyk7XG5cbiAgICAvKipcbiAgICAgKiBTdWJ0bHkgZGlmZmVyZW50IGZyb20gZW1pdEV2ZW50IGluIHRoYXQgaXQgd2lsbCBwYXNzIGl0cyBhcmd1bWVudHMgb24gdG8gdGhlIGxpc3RlbmVycywgYXMgb3Bwb3NlZCB0byB0YWtpbmcgYSBzaW5nbGUgYXJyYXkgb2YgYXJndW1lbnRzIHRvIHBhc3Mgb24uXG4gICAgICogQXMgd2l0aCBlbWl0RXZlbnQsIHlvdSBjYW4gcGFzcyBhIHJlZ2V4IGluIHBsYWNlIG9mIHRoZSBldmVudCBuYW1lIHRvIGVtaXQgdG8gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdCBhbmQgZXhlY3V0ZSBsaXN0ZW5lcnMgZm9yLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gT3B0aW9uYWwgYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIGVhY2ggbGlzdGVuZXIuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZ0KSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZW1pdEV2ZW50KGV2dCwgYXJncyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgdmFsdWUgdG8gY2hlY2sgYWdhaW5zdCB3aGVuIGV4ZWN1dGluZyBsaXN0ZW5lcnMuIElmIGFcbiAgICAgKiBsaXN0ZW5lcnMgcmV0dXJuIHZhbHVlIG1hdGNoZXMgdGhlIG9uZSBzZXQgaGVyZSB0aGVuIGl0IHdpbGwgYmUgcmVtb3ZlZFxuICAgICAqIGFmdGVyIGV4ZWN1dGlvbi4gVGhpcyB2YWx1ZSBkZWZhdWx0cyB0byB0cnVlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgbmV3IHZhbHVlIHRvIGNoZWNrIGZvciB3aGVuIGV4ZWN1dGluZyBsaXN0ZW5lcnMuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uc2V0T25jZVJldHVyblZhbHVlID0gZnVuY3Rpb24gc2V0T25jZVJldHVyblZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX29uY2VSZXR1cm5WYWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgY3VycmVudCB2YWx1ZSB0byBjaGVjayBhZ2FpbnN0IHdoZW4gZXhlY3V0aW5nIGxpc3RlbmVycy4gSWZcbiAgICAgKiB0aGUgbGlzdGVuZXJzIHJldHVybiB2YWx1ZSBtYXRjaGVzIHRoaXMgb25lIHRoZW4gaXQgc2hvdWxkIGJlIHJlbW92ZWRcbiAgICAgKiBhdXRvbWF0aWNhbGx5LiBJdCB3aWxsIHJldHVybiB0cnVlIGJ5IGRlZmF1bHQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHsqfEJvb2xlYW59IFRoZSBjdXJyZW50IHZhbHVlIHRvIGNoZWNrIGZvciBvciB0aGUgZGVmYXVsdCwgdHJ1ZS5cbiAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgKi9cbiAgICBwcm90by5fZ2V0T25jZVJldHVyblZhbHVlID0gZnVuY3Rpb24gX2dldE9uY2VSZXR1cm5WYWx1ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoJ19vbmNlUmV0dXJuVmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uY2VSZXR1cm5WYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGV2ZW50cyBvYmplY3QgYW5kIGNyZWF0ZXMgb25lIGlmIHJlcXVpcmVkLlxuICAgICAqXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgZXZlbnRzIHN0b3JhZ2Ugb2JqZWN0LlxuICAgICAqIEBhcGkgcHJpdmF0ZVxuICAgICAqL1xuICAgIHByb3RvLl9nZXRFdmVudHMgPSBmdW5jdGlvbiBfZ2V0RXZlbnRzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldmVydHMgdGhlIGdsb2JhbCB7QGxpbmsgRXZlbnRFbWl0dGVyfSB0byBpdHMgcHJldmlvdXMgdmFsdWUgYW5kIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhpcyB2ZXJzaW9uLlxuICAgICAqXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IE5vbiBjb25mbGljdGluZyBFdmVudEVtaXR0ZXIgY2xhc3MuXG4gICAgICovXG4gICAgRXZlbnRFbWl0dGVyLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICAgICAgICBleHBvcnRzLkV2ZW50RW1pdHRlciA9IG9yaWdpbmFsR2xvYmFsVmFsdWU7XG4gICAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfTtcblxuICAgIC8vIEV4cG9zZSB0aGUgY2xhc3MgZWl0aGVyIHZpYSBBTUQsIENvbW1vbkpTIG9yIHRoZSBnbG9iYWwgb2JqZWN0XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBleHBvcnRzLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcbiAgICB9XG59LmNhbGwodGhpcykpO1xuIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0ZXZlbnRzID0gcmVxdWlyZSgnLi4vLi4vZXZlbnRzL2V2ZW50cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2xhc3NOYW1lOiAnJyxcblx0XHRcdGNsaXA6IHt9LFxuXHRcdFx0aXNFZGl0YWJsZTogZmFsc2UsXG5cdFx0XHRpc0JlaW5nRWRpdGVkOiBmYWxzZSxcblx0XHRcdGNsaXBIYXNDb250ZW50czogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXHRcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRwID0gc2VsZi5wcm9wcyxcblx0XHRcdGJ1dHRvbk5vZGVzID0ge307XG5cdFx0XHRcblx0XHRpZiAoIXAuaXNCZWluZ0VkaXRlZCkge1xuXHRcdFx0YnV0dG9uTm9kZXMucGxheSA9IDxidXR0b24gY2xhc3NOYW1lPVwicGxheS1idXR0b25cIiB0aXRsZT1cIlBsYXkgQ2xpcFwiIG9uQ2xpY2s9eyBmdW5jdGlvbigpIHsgZXZlbnRzLnRyaWdnZXIoZXZlbnRzLkNMSVBfUExBWSwgW3AuY2xpcF0pOyB9fT4mI3hmMDRiOzwvYnV0dG9uPjtcblx0XHRcdFxuXHRcdFx0aWYgKHAuaXNFZGl0YWJsZSkge1xuXHRcdFx0XHRidXR0b25Ob2Rlcy5lZGl0ID0gPGJ1dHRvbiBjbGFzc05hbWU9XCJlZGl0LWJ1dHRvblwiIHRpdGxlPVwiRWRpdCBDbGlwXCIgb25DbGljaz17IGZ1bmN0aW9uKCkgeyBldmVudHMudHJpZ2dlcihldmVudHMuQ0xJUF9FRElULCBbcC5jbGlwXSk7IH19PiYjeGYwNDQ7PC9idXR0b24+O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGJ1dHRvbk5vZGVzLmRlbGV0ZSA9IDxidXR0b24gY2xhc3NOYW1lPVwiZGVsZXRlLWJ1dHRvblwiIHRpdGxlPVwiRGVsZXRlIENsaXBcIiBvbkNsaWNrPXsgZnVuY3Rpb24oKSB7IGV2ZW50cy50cmlnZ2VyKGV2ZW50cy5DTElQX0RFTEVURSwgW3AuY2xpcF0pOyB9fT4mI3hmMDBkOzwvYnV0dG9uPjtcblx0XHRcdFxuXHRcdFx0aWYgKHAuY2xpcEhhc0NvbnRlbnRzKSB7XG5cdFx0XHRcdGJ1dHRvbk5vZGVzLnNhdmUgPSA8YnV0dG9uIGNsYXNzTmFtZT1cInNhdmUtYnV0dG9uXCIgdGl0bGU9XCJTYXZlIENsaXBcIiBvbkNsaWNrPXsgZnVuY3Rpb24oKSB7IGV2ZW50cy50cmlnZ2VyKGV2ZW50cy5DTElQX1NBVkUsIFtwLmNsaXBdKTsgfX0+JiN4RjBDNzs8L2J1dHRvbj47XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17IHAuY2xhc3NOYW1lIH0+XG5cdFx0XHRcdHsgYnV0dG9uTm9kZXMucGxheSB9XG5cdFx0XHRcdHsgYnV0dG9uTm9kZXMuZWRpdCB9XG5cdFx0XHRcdFxuXHRcdFx0XHR7IGJ1dHRvbk5vZGVzLmRlbGV0ZSB9XG5cdFx0XHRcdHsgYnV0dG9uTm9kZXMuc2F2ZSB9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTsiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRCdXR0b25zID0gcmVxdWlyZSgnLi9jbGlwLWJ1dHRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNsaXA6IHt9LFxuXHRcdFx0aXNFZGl0YWJsZTogZmFsc2UsXG5cdFx0XHRpc0JlaW5nUGxheWVkOiBmYWxzZSxcblx0XHRcdGlzQmVpbmdFZGl0ZWQ6IGZhbHNlLFxuXHRcdFx0aXNCdXR0b25zVmlzaWJsZTogdHJ1ZVxuXHRcdH07XG5cdH0sXG5cdFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGlwSGFzQ29udGVudHM6IHRoaXMucHJvcHMuY2xpcC5oYXNDb250ZW50cygpXG5cdFx0fTtcblx0fSxcdFxuXHRcblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbihwcm9wLCB2YWwpIHtcblx0XHR0aGlzLnByb3BzLmNsaXBbcHJvcF0gPSB2YWw7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGNsaXBIYXNDb250ZW50czogdGhpcy5wcm9wcy5jbGlwLmhhc0NvbnRlbnRzKCkgfSk7XG5cdH0sXG5cdFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdHAgPSBzZWxmLnByb3BzLFxuXHRcdFx0Y2xhc3Nlcz17XG5cdFx0XHRcdGNvbnRhaW5lcjogJ2NsaXAnLFxuXHRcdFx0XHRjbGlwUGxheWluZzogcC5pc0JlaW5nUGxheWVkID8gJ2NsaXAtcGxheWluZycgOiAnJyxcblx0XHRcdFx0Y2xpcEVkaXQ6IHAuaXNCZWluZ0VkaXRlZCA/ICdjbGlwLWVkaXQnIDogJycsXG5cdFx0XHRcdG5hbWU6ICdjbGlwLW5hbWUnLFxuXHRcdFx0XHRzdGFydFRpbWU6ICdjbGlwLXN0YXJ0LXRpbWUnLFxuXHRcdFx0XHRlbmRUaW1lOiAnY2xpcC1lbmQtdGltZScsXG5cdFx0XHRcdGJ1dHRvbnM6ICdjbGlwLWJ1dHRvbnMnXG5cdFx0XHR9LFxuXHRcdFx0Y2xpcE5vZGVzID0gW107XG5cdFx0XHRcblx0XHRpZiAoIXAuaXNCZWluZ0VkaXRlZCkge1xuXHRcdFx0Y2xpcE5vZGVzLnB1c2goPHNwYW4ga2V5PXsgY2xhc3Nlcy5uYW1lIH0gY2xhc3NOYW1lPXsgY2xhc3Nlcy5uYW1lIH0+eyBwLmNsaXAubmFtZSB9PC9zcGFuPik7XG5cdFx0XHRjbGlwTm9kZXMucHVzaCg8c3BhbiBrZXk9eyBjbGFzc2VzLnN0YXJ0VGltZSB9IGNsYXNzTmFtZT17IGNsYXNzZXMuc3RhcnRUaW1lIH0+eyBwLmNsaXAuc3RhcnRUaW1lIH08L3NwYW4+KTtcblx0XHRcdGNsaXBOb2Rlcy5wdXNoKDxzcGFuIGtleT17IGNsYXNzZXMuZW5kVGltZSB9IGNsYXNzTmFtZT17IGNsYXNzZXMuZW5kVGltZSB9PnsgcC5jbGlwLmVuZFRpbWUgfTwvc3Bhbj4pO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGNsaXBOb2Rlcy5wdXNoKDxpbnB1dCBrZXk9eyBjbGFzc2VzLm5hbWUgfSBjbGFzc05hbWU9eyBjbGFzc2VzLm5hbWUgfSB0eXBlPVwidGV4dFwiIGRlZmF1bHRWYWx1ZT17IHAuY2xpcC5uYW1lIH0gb25DaGFuZ2U9eyBmdW5jdGlvbihlKSB7IHNlbGYuaGFuZGxlQ2hhbmdlKCduYW1lJywgZS50YXJnZXQudmFsdWUpIH19IC8+KTtcblx0XHRcdGNsaXBOb2Rlcy5wdXNoKDxpbnB1dCBrZXk9eyBjbGFzc2VzLnN0YXJ0VGltZSB9IGNsYXNzTmFtZT17IGNsYXNzZXMuc3RhcnRUaW1lIH0gdHlwZT1cInRleHRcIiBkZWZhdWx0VmFsdWU9eyBwLmNsaXAuc3RhcnRUaW1lIH0gb25DaGFuZ2U9eyBmdW5jdGlvbihlKSB7c2VsZi5oYW5kbGVDaGFuZ2UoJ3N0YXJ0VGltZScsIGUudGFyZ2V0LnZhbHVlKSB9fSAvPik7XG5cdFx0XHRjbGlwTm9kZXMucHVzaCg8aW5wdXQga2V5PXsgY2xhc3Nlcy5lbmRUaW1lIH0gY2xhc3NOYW1lPXsgY2xhc3Nlcy5lbmRUaW1lIH0gdHlwZT1cInRleHRcIiBkZWZhdWx0VmFsdWU9eyBwLmNsaXAuZW5kVGltZSB9IG9uQ2hhbmdlPXsgZnVuY3Rpb24oZSkgeyBzZWxmLmhhbmRsZUNoYW5nZSgnZW5kVGltZScsIGUudGFyZ2V0LnZhbHVlKSB9fSAvPik7XG5cdFx0fVxuXHRcdFxuXHRcdGlmIChwLmlzQnV0dG9uc1Zpc2libGUpIHtcblx0XHRcdGNsaXBOb2Rlcy5wdXNoKDxCdXR0b25zIGtleT17IGNsYXNzZXMuYnV0dG9ucyB9IGNsYXNzTmFtZT17IGNsYXNzZXMuYnV0dG9ucyB9IGNsaXA9eyBwLmNsaXAgfSBpc0VkaXRhYmxlPXsgcC5pc0VkaXRhYmxlIH0gaXNCZWluZ0VkaXRlZD17IHAuaXNCZWluZ0VkaXRlZCB9IGNsaXBIYXNDb250ZW50cz17IHNlbGYuc3RhdGUuY2xpcEhhc0NvbnRlbnRzIH0gLz4pO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGxpIGNsYXNzTmFtZT17IGNsYXNzZXMuY29udGFpbmVyICsgJyAnICsgY2xhc3Nlcy5jbGlwUGxheWluZyArICcgJyArIGNsYXNzZXMuY2xpcEVkaXQgfT5cblx0XHRcdFx0eyBjbGlwTm9kZXMgfVxuXHRcdFx0PC9saT5cblx0XHQpO1xuXHR9XG59KTsiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuXHRDbGlwID0gcmVxdWlyZSgnLi9jbGlwJyksXG5cdGV2ZW50cyA9IHJlcXVpcmUoJy4uLy4uL2V2ZW50cy9ldmVudHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGZ1bGxWaWRlbzoge30sXG5cdFx0XHRjbGlwczogW10sXG5cdFx0XHRjbGlwQmVpbmdQbGF5ZWQ6IG51bGwsXG5cdFx0XHRjbGlwQmVpbmdFZGl0ZWQ6IG51bGxcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0cCA9IHNlbGYucHJvcHMsXG5cdFx0XHRuZXdCdXR0dG9uTm9kZTtcblx0XHRcdFxuXHRcdGlmICghcC5jbGlwQmVpbmdFZGl0ZWQpIHtcblx0XHRcdG5ld0J1dHR0b25Ob2RlID0gPGJ1dHRvbiBjbGFzc05hbWU9XCJuZXctYnV0dG9uXCIgdGl0bGU9XCJOZXcgQ2xpcFwiIG9uQ2xpY2s9eyBmdW5jdGlvbigpIHsgZXZlbnRzLnRyaWdnZXIoZXZlbnRzLkNMSVBfTkVXKTsgfX0+JiN4RjA2Nzs8L2J1dHRvbj47XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiAoXG5cdFx0XHQ8dWwgaWQ9XCJjbGlwc1wiPlxuXHRcdFx0XHQ8Q2xpcCBcblx0XHRcdFx0XHRrZXk9XCIwXCIgXG5cdFx0XHRcdFx0Y2xpcD17IHAuZnVsbFZpZGVvIH0gXG5cdFx0XHRcdFx0aXNCZWluZ1BsYXllZD17IHAuZnVsbFZpZGVvID09PSBwLmNsaXBCZWluZ1BsYXllZCB9IFxuXHRcdFx0XHRcdGlzQnV0dG9uc1Zpc2libGU9eyAhcC5jbGlwQmVpbmdFZGl0ZWQgfHwgcC5jbGlwQmVpbmdFZGl0ZWQgPT09IHAuZnVsbFZpZGVvIH0gLz5cblx0XHRcdFx0XHRcblx0XHQgICAgICAgIHsgcC5jbGlwcy5tYXAoZnVuY3Rpb24oY2xpcCkge1xuXHRcdCAgICAgICAgXHRyZXR1cm4gPENsaXAgXG5cdFx0ICAgICAgICBcdFx0XHRcdGtleT17IGNsaXAuaWQgfSBcblx0XHQgICAgICAgIFx0XHRcdFx0Y2xpcD17IGNsaXAgfSBcblx0XHQgICAgICAgIFx0XHRcdFx0aXNFZGl0YWJsZT1cInRydWVcIlxuXHRcdCAgICAgICAgXHRcdFx0XHRpc0JlaW5nUGxheWVkPXsgY2xpcCA9PT0gcC5jbGlwQmVpbmdQbGF5ZWQgfSBcblx0XHQgICAgICAgIFx0XHRcdFx0aXNCZWluZ0VkaXRlZD17IGNsaXAgPT09IHAuY2xpcEJlaW5nRWRpdGVkIH1cblx0XHQgICAgICAgIFx0XHRcdFx0aXNCdXR0b25zVmlzaWJsZT17ICFwLmNsaXBCZWluZ0VkaXRlZCB8fCBwLmNsaXBCZWluZ0VkaXRlZCA9PT0gY2xpcCB9IC8+XG5cdFx0ICAgICAgICB9KX1cblx0XHQgICAgICAgIFxuXHRcdCAgICAgICAgeyBuZXdCdXR0dG9uTm9kZSB9XG5cdFx0ICAgIDwvdWw+XHRcdCAgICBcblx0XHQpO1xuXHR9XG59KTsiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpLFxuICAgIFJlYWN0RE9NID0gcmVxdWlyZSgncmVhY3QtZG9tJyksXG4gICAgYXBwRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKSxcbiAgICBTaXRlID0gUmVhY3QuY3JlYXRlRmFjdG9yeShyZXF1aXJlKCcuL3NpdGUvc2l0ZScpKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVuZGVyOiBmdW5jdGlvbih2aWV3TW9kZWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIFJlYWN0RE9NLnJlbmRlcihcbiAgICAgICAgXHRTaXRlKHZpZXdNb2RlbCksXG4gICAgICAgIFx0YXBwRWxlbWVudCxcbiAgICAgICAgXHRjYWxsYmFja1xuICAgICAgICApO1xuICAgIH1cbn07IiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKSxcblx0Q2xpcHMgPSByZXF1aXJlKCcuLi9jbGlwcy9jbGlwcycpLFxuXHRWaWRlbyA9IHJlcXVpcmUoJy4uL3ZpZGVvL3ZpZGVvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdHAgPSBzZWxmLnByb3BzO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgaWQ9XCJzaXRlXCI+XG5cdFx0XHRcdDxoMSBpZD1cImhlYWRlclwiPlxuXHRcdFx0XHQgICAgPGltZyBpZD1cImxvZ29cIiBzcmM9XCJhc3NldHMva3Jvc3NvdmVyLWxvZ28ucG5nXCIgYWx0PVwiS3Jvc3NvdmVyXCIgLz5cblx0XHRcdFx0PC9oMT5cblx0XHRcdFx0PHNlY3Rpb24gaWQ9XCJjb250ZW50XCI+XG5cdFx0XHRcdCAgICA8Q2xpcHMgZnVsbFZpZGVvPXsgcC5jbGlwcy5mdWxsVmlkZW8gfSBjbGlwcz17IHAuY2xpcHMuY29sbGVjdGlvbiB9IGNsaXBCZWluZ1BsYXllZD17IHAuY2xpcHMuY2xpcEJlaW5nUGxheWVkIH0gY2xpcEJlaW5nRWRpdGVkPXsgcC5jbGlwcy5jbGlwQmVpbmdFZGl0ZWQgfSAvPlxuXHRcdFx0ICAgIFx0PFZpZGVvIGZ1bGxWaWRlbz17IHAuY2xpcHMuZnVsbFZpZGVvIH0gY2xpcD17IHAuY2xpcHMuY2xpcEJlaW5nUGxheWVkIH0gLz5cblx0XHRcdFx0PC9zZWN0aW9uPlxuXHRcdFx0PC9kaXY+XHRcdCAgICBcblx0XHQpO1xuXHR9XG59KTsiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4ge1xuXHRcdCAgICBmdWxsVmlkZW86IHt9LFxuXHQgICAgICAgIGNsaXA6IG51bGxcblx0ICAgIH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRwID0gc2VsZi5wcm9wcyxcblx0XHRcdHZpZGVvVVJMID0gcC5mdWxsVmlkZW8udXJsLFxuXHRcdFx0dmlkZW9Ob2RlO1xuXHRcdFx0XG5cdFx0aWYgKHAuY2xpcCkge1xuXHRcdCAgICB2aWRlb1VSTCA9IHZpZGVvVVJMICsgJyN0PScgKyBwLmNsaXAuc3RhcnRUaW1lICsgJywnICsgcC5jbGlwLmVuZFRpbWUgKyAnJnM9JyArIERhdGUubm93KCk7XG5cdFx0fVxuXHRcblx0XHRyZXR1cm4gKFxuXHRcdCAgICA8ZGl2IGlkPVwidmlkZW8tY29udGFpbmVyXCI+XG4gICAgICAgICAgICAgICAgPHZpZGVvIGlkPVwidmlkZW9cIiBzcmM9eyB2aWRlb1VSTCB9IGF1dG9QbGF5PXsgISFwLmNsaXAgfSBjb250cm9scz17ICEhcC5jbGlwIH0+XHRcbiAgICAgICAgICAgICAgICAgICAgWW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdGhlIDxjb2RlPnZpZGVvPC9jb2RlPiBlbGVtZW50LlxuICAgICAgICAgICAgICAgIDwvdmlkZW8+XG4gICAgICAgICAgICA8L2Rpdj5cdFx0ICAgIFxuXHRcdCk7XG5cdH1cbn0pOyIsIi8qXG4gKiBUcmlnZ2VycyBhbmQgcmVzcG9uZHMgdG8gZXZlbnRzIHRocm91Z2hvdXQgdGhlIGFwcFxuICogT3ZlcnJpZGVzIGV2ZW50IGVtaXR0ZXIgc28gb24oKSwgb2ZmKCksIHRyaWdnZXIoKSwgb25jZSgpIGNhbiBiZSB1c2VkIGRpcmVjdGx5IG9uIHRoaXMgbW9kZWwuXG4gKiBleC4gZXZlbnRzLm9uKGV2ZW50cy5MT0dJTl9TVEFUVVNfQ0hBTkdFRCk7IGV2ZW50cy50cmlnZ2VyKGV2ZW50cy5MT0dJTl9TVEFUVVNfQ0hBTkdFRCk7XG4gKi9cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ3dvbGZ5ODctZXZlbnRlbWl0dGVyJyksXG5cdEV2ZW50cztcblxuRXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRzZWxmLkNMSVBfUExBWSA9ICdDTElQX1BMQVknO1xuXHRzZWxmLkNMSVBfRURJVCA9ICdDTElQX0VESVQnO1xuXHRzZWxmLkNMSVBfU0FWRSA9ICdDTElQX1NBVkUnO1xuXHRzZWxmLkNMSVBfREVMRVRFID0gJ0NMSVBfREVMRVRFJztcblx0c2VsZi5DTElQX05FVyA9ICdDTElQX05FVyc7XG5cblx0c2VsZi5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcblxuXHRyZXR1cm4gc2VsZjtcbn07XG5cbkV2ZW50cy5wcm90b3R5cGUgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlO1xuXG5FdmVudHMucHJvdG90eXBlLm9uID0gZnVuY3Rpb24obmFtZSwgbGlzdGVuZXJGdW5jdGlvbikge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHJldHVybiBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyLmNhbGwoc2VsZiwgbmFtZSwgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc29sZS5sb2cobmFtZSk7XG5cdFx0bGlzdGVuZXJGdW5jdGlvbi5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEV2ZW50cygpOyIsInZhciBldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cy9ldmVudHMnKSxcbiAgICBtb2RlbHMgPSByZXF1aXJlKCcuL21vZGVscy9tb2RlbHMnKSxcbiAgICBjb21wb25lbnRzID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2NvbXBvbmVudHMnKTtcblxuLy8gbG9hZCBkYXRhIGFuZCBkbyBpbml0aWFsIHJlbmRlclxubW9kZWxzLmxvYWRBbGwoZnVuY3Rpb24oKSB7XG4gICAgcmVuZGVyKCk7XG59KTtcblxuZXZlbnRzLm9uKGV2ZW50cy5DTElQX1BMQVksIGZ1bmN0aW9uKGNsaXApIHtcbiAgICBtb2RlbHMuY2xpcHMuY2xpcEJlaW5nUGxheWVkID0gY2xpcDtcbiAgICByZW5kZXIoKTtcbn0pO1xuXG5ldmVudHMub24oZXZlbnRzLkNMSVBfRURJVCwgZnVuY3Rpb24oY2xpcCkge1xuICAgIG1vZGVscy5jbGlwcy5jbGlwQmVpbmdFZGl0ZWQgPSBjbGlwO1xuICAgIG1vZGVscy5jbGlwcy5jbGlwQmVpbmdQbGF5ZWQgPSBudWxsO1xuICAgIHJlbmRlcigpO1xufSk7XG5cbmV2ZW50cy5vbihldmVudHMuQ0xJUF9ERUxFVEUsIGZ1bmN0aW9uKGNsaXApIHtcbiAgICBtb2RlbHMuY2xpcHMucmVtb3ZlQ2xpcChjbGlwKTtcbiAgICBtb2RlbHMuY2xpcHMuY2xpcEJlaW5nRWRpdGVkID0gbnVsbDtcbiAgICByZW5kZXIoKTtcbn0pO1xuXG5ldmVudHMub24oZXZlbnRzLkNMSVBfU0FWRSwgZnVuY3Rpb24oY2xpcCkge1xuICAgIG1vZGVscy5jbGlwcy5jbGlwQmVpbmdFZGl0ZWQgPSBudWxsO1xuICAgIHJlbmRlcigpO1xufSk7XG5cbmV2ZW50cy5vbihldmVudHMuQ0xJUF9ORVcsIGZ1bmN0aW9uKCkge1xuICAgIG1vZGVscy5jbGlwcy5jbGlwQmVpbmdFZGl0ZWQgPSBtb2RlbHMuY2xpcHMuYWRkQ2xpcCgpO1xuICAgIG1vZGVscy5jbGlwcy5jbGlwQmVpbmdQbGF5ZWQgPSBudWxsO1xuICAgIHJlbmRlcigpO1xufSk7XG5cbmZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBjb21wb25lbnRzLnJlbmRlcihtb2RlbHMpO1xufVxuIiwiZnVuY3Rpb24gQ2xpcE1vZGVsKGNsaXBEYXRhKSB7XG4gICAgY2xpcERhdGEgPSBjbGlwRGF0YSB8fCB7fTtcbiAgICB0aGlzLmlkID0gY2xpcERhdGEuaWQgfHwgbnVsbDtcbiAgICB0aGlzLm5hbWUgPSBjbGlwRGF0YS5uYW1lIHx8IG51bGw7XG4gICAgdGhpcy5zdGFydFRpbWUgPSBjbGlwRGF0YS5zdGFydFRpbWUgfHwgbnVsbDtcbiAgICB0aGlzLmVuZFRpbWUgPSBjbGlwRGF0YS5lbmRUaW1lIHx8IG51bGw7XG59XG5cbkNsaXBNb2RlbC5wcm90b3R5cGUuaGFzQ29udGVudHMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gISF0aGlzLm5hbWUgfHwgISF0aGlzLnN0YXJ0VGltZSB8fCAhIXRoaXMuZW5kVGltZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xpcE1vZGVsOyIsInZhciBGdWxsVmlkZW8gPSByZXF1aXJlKCcuL2Z1bGwtdmlkZW8tbW9kZWwnKSxcbiAgICBDbGlwID0gcmVxdWlyZSgnLi9jbGlwLW1vZGVsJyk7XG4gICAgXG5mdW5jdGlvbiBDbGlwc01vZGVsKCkge1xuICAgIHRoaXMuZnVsbFZpZGVvID0gbnVsbDtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSBbXTtcbiAgICB0aGlzLmNsaXBCZWluZ1BsYXllZCA9IG51bGw7XG4gICAgdGhpcy5jbGlwQmVpbmdFZGl0ZWQgPSBudWxsO1xufTtcblxuQ2xpcHNNb2RlbC5wcm90b3R5cGUubG9hZEZ1bGxWaWRlbyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5mdWxsVmlkZW8gPSBuZXcgRnVsbFZpZGVvKCk7XG4gICAgdGhpcy5mdWxsVmlkZW8uaWQgPSAwO1xuICAgIHRoaXMuZnVsbFZpZGVvLnVybCA9ICdodHRwOi8vZ3JvY2h0ZHJlaXMuZGUvZnVlci1qc2ZpZGRsZS92aWRlby9zaW50ZWxfdHJhaWxlci00ODAubXA0JztcbiAgICB0aGlzLmZ1bGxWaWRlby5uYW1lID0gJ1NJTlRFTCBUUkFJTEVSJztcbiAgICB0aGlzLmZ1bGxWaWRlby5lbmRUaW1lID0gJzAwOjAwOjUyJztcbiAgICBcbiAgICByZXR1cm4gY2FsbGJhY2sodGhpcyk7XG59O1xuXG5DbGlwc01vZGVsLnByb3RvdHlwZS5sb2FkQ2xpcHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgY2xpcHNEYXRhID0gW1xuICAgICAgICAgICAgeyBpZDogMSwgbmFtZTogJ1doYXQgYnJpbmdzIHlvdS4uLicsIHN0YXJ0VGltZTogJzAwOjAwOjEyJywgZW5kVGltZTogJzAwOjAwOjIyJyB9LFxuICAgICAgICAgICAgeyBpZDogMiwgbmFtZTogJ0EgZGFuZ2Vyb3VzIHF1ZXN0Li4uJywgc3RhcnRUaW1lOiAnMDA6MDA6MzYnLCBlbmRUaW1lOiAnMDA6MDA6NDAnIH0sXG4gICAgICAgICAgICB7IGlkOiAzLCBuYW1lOiAnSVxcJ3ZlIGJlZW4gYWxvbmUuLicsIHN0YXJ0VGltZTogJzAwOjAwOjQxJywgZW5kVGltZTogJzAwOjAwOjQ5JyB9XG4gICAgICAgIF07XG4gICAgXG4gICAgY2xpcHNEYXRhLmZvckVhY2goZnVuY3Rpb24oY2xpcERhdGEpIHtcbiAgICAgICAgc2VsZi5jb2xsZWN0aW9uLnB1c2gobmV3IENsaXAoY2xpcERhdGEpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjYWxsYmFjayhzZWxmKTtcbn07XG5cbkNsaXBzTW9kZWwucHJvdG90eXBlLmFkZENsaXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3Q2xpcCA9IG5ldyBDbGlwKCk7XG4gICAgbmV3Q2xpcC5pZCA9IHRoaXMuY29sbGVjdGlvbi5sZW5ndGggKyAxO1xuICAgIHRoaXMuY29sbGVjdGlvbi5wdXNoKG5ld0NsaXApO1xuICAgIHJldHVybiBuZXdDbGlwO1xufTtcblxuQ2xpcHNNb2RlbC5wcm90b3R5cGUucmVtb3ZlQ2xpcCA9IGZ1bmN0aW9uKGNsaXApIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSB0aGlzLmNvbGxlY3Rpb24uZmlsdGVyKGZ1bmN0aW9uKGN1cnJlbnRDbGlwKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50Q2xpcCAhPT0gY2xpcDtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xpcHNNb2RlbDsiLCJ2YXIgQ2xpcE1vZGVsID0gcmVxdWlyZSgnLi9jbGlwLW1vZGVsJyk7XG4gICAgXG5mdW5jdGlvbiBGdWxsVmlkZW9Nb2RlbChjbGlwRGF0YSkge1xuICAgIENsaXBNb2RlbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyBcbiAgICB0aGlzLnVybCA9IG51bGw7XG4gICAgdGhpcy5zdGFydFRpbWUgPSAnMDA6MDA6MDAnO1xufTtcblxuRnVsbFZpZGVvTW9kZWwucHJvdG90eXBlID0gQ2xpcE1vZGVsLnByb3RvdHlwZTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdWxsVmlkZW9Nb2RlbDsiLCJ2YXIgQ2xpcHMgPSByZXF1aXJlKCcuL2NsaXBzL2NsaXBzLW1vZGVsJyksXG4gICAgbmltYmxlID0gcmVxdWlyZSgnbmltYmxlJyk7XG4gICAgXG5mdW5jdGlvbiBNb2RlbHMoKSB7XG4gICAgdGhpcy5jbGlwcyA9IG5ldyBDbGlwcygpO1xufTtcblxuTW9kZWxzLnByb3RvdHlwZS5sb2FkQWxsID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgLy8gbG9hZCBkYXRhIGluIHBhcmFsbGVsIGZyb20gYXN5bmMgc291cmNlc1xuICAgIG5pbWJsZS5wYXJhbGxlbChbXG4gICAgICAgIGZ1bmN0aW9uKGZpbmlzaCkge1xuICAgICAgICAgICAgc2VsZi5jbGlwcy5sb2FkQ2xpcHMoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGZpbmlzaCgpXG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbihmaW5pc2gpIHtcbiAgICAgICAgICAgIHNlbGYuY2xpcHMubG9hZEZ1bGxWaWRlbyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmaW5pc2goKVxuICAgICAgICAgICAgfSk7ICAgICAgXG4gICAgICAgIH1cbiAgICBdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBNb2RlbHMoKTsiXX0=
