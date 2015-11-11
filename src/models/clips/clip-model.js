function ClipModel(clipData) {
    clipData = clipData || {};
    this.id = clipData.id || null;
    this.name = clipData.name || null;
    this.startTime = clipData.startTime || null;
    this.endTime = clipData.endTime || null;
}

ClipModel.prototype.hasContents = function() {
    return !!this.name || !!this.startTime || !!this.endTime;
};

module.exports = ClipModel;