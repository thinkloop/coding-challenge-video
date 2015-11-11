var FullVideo = require('./full-video-model'),
    Clip = require('./clip-model');
    
function ClipsModel() {
    this.fullVideo = null;
    this.collection = [];
    this.clipBeingPlayed = null;
    this.clipBeingEdited = null;
};

ClipsModel.prototype.loadFullVideo = function(callback) {
    this.fullVideo = new FullVideo();
    this.fullVideo.id = 0;
    this.fullVideo.url = 'http://grochtdreis.de/fuer-jsfiddle/video/sintel_trailer-480.mp4';
    this.fullVideo.name = 'SINTEL TRAILER';
    this.fullVideo.endTime = '00:00:52';
    
    return callback(this);
};

ClipsModel.prototype.loadClips = function(callback) {
    var self = this,
        clipsData = [
            { id: 1, name: 'What brings you...', startTime: '00:00:12', endTime: '00:00:22' },
            { id: 2, name: 'A dangerous quest...', startTime: '00:00:36', endTime: '00:00:40' },
            { id: 3, name: 'I\'ve been alone..', startTime: '00:00:41', endTime: '00:00:49' }
        ];
    
    clipsData.forEach(function(clipData) {
        self.collection.push(new Clip(clipData));
    });

    return callback(self);
};

ClipsModel.prototype.addClip = function() {
    var newClip = new Clip();
    newClip.id = this.collection.length + 1;
    this.collection.push(newClip);
    return newClip;
};

ClipsModel.prototype.removeClip = function(clip) {
    this.collection = this.collection.filter(function(currentClip) {
        return currentClip !== clip;
    });
    return this;
};

module.exports = ClipsModel;