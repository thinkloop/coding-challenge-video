/*
 * Triggers and responds to events throughout the app
 * Overrides event emitter so on(), off(), trigger(), once() can be used directly on this model.
 * ex. events.on(events.LOGIN_STATUS_CHANGED); events.trigger(events.LOGIN_STATUS_CHANGED);
 */

var EventEmitter = require('wolfy87-eventemitter'),
	Events;

Events = function() {
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

Events.prototype.on = function(name, listenerFunction) {
	var self = this;
	return EventEmitter.prototype.addListener.call(self, name, function() {
		console.log(name);
		listenerFunction.apply(self, arguments);
	});
};

module.exports = new Events();