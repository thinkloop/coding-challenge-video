var ClipModel = require('./clip-model');
    
function FullVideoModel(clipData) {
    ClipModel.apply(this, arguments); 
    this.url = null;
    this.startTime = '00:00:00';
};

FullVideoModel.prototype = ClipModel.prototype;

module.exports = FullVideoModel;