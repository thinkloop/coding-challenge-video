var events = require('./events/events'),
    models = require('./models/models'),
    components = require('./components/components');

// load data and do initial render
models.loadAll(function() {
    render();
});

events.on(events.CLIP_PLAY, function(clip) {
    models.clips.clipBeingPlayed = clip;
    render();
});

events.on(events.CLIP_EDIT, function(clip) {
    models.clips.clipBeingEdited = clip;
    models.clips.clipBeingPlayed = null;
    render();
});

events.on(events.CLIP_DELETE, function(clip) {
    models.clips.removeClip(clip);
    models.clips.clipBeingEdited = null;
    render();
});

events.on(events.CLIP_SAVE, function(clip) {
    models.clips.clipBeingEdited = null;
    render();
});

events.on(events.CLIP_NEW, function() {
    models.clips.clipBeingEdited = models.clips.addClip();
    models.clips.clipBeingPlayed = null;
    render();
});

function render() {
    components.render(models);
}
