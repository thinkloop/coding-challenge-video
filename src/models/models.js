var Clips = require('./clips/clips-model'),
    nimble = require('nimble');
    
function Models() {
    this.clips = new Clips();
};

Models.prototype.loadAll = function(callback) {
    var self = this;
    
    // load data in parallel from async sources
    nimble.parallel([
        function(finish) {
            self.clips.loadClips(function () {
                finish()
            }); 
        },
        
        function(finish) {
            self.clips.loadFullVideo(function() {
                finish()
            });      
        }
    ], function() {
        return callback();
    });
};

module.exports = new Models();