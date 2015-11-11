var React = require('react'),
	events = require('../../events/events');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {
			className: '',
			clip: {},
			isEditable: false,
			isBeingEdited: false,
			clipHasContents: false
		};
	},
	
	render: function() {
		var self = this,
			p = self.props,
			buttonNodes = {};
			
		if (!p.isBeingEdited) {
			buttonNodes.play = <button className="play-button" title="Play Clip" onClick={ function() { events.trigger(events.CLIP_PLAY, [p.clip]); }}>&#xf04b;</button>;
			
			if (p.isEditable) {
				buttonNodes.edit = <button className="edit-button" title="Edit Clip" onClick={ function() { events.trigger(events.CLIP_EDIT, [p.clip]); }}>&#xf044;</button>;
			}
		}
		else {
			buttonNodes.delete = <button className="delete-button" title="Delete Clip" onClick={ function() { events.trigger(events.CLIP_DELETE, [p.clip]); }}>&#xf00d;</button>;
			
			if (p.clipHasContents) {
				buttonNodes.save = <button className="save-button" title="Save Clip" onClick={ function() { events.trigger(events.CLIP_SAVE, [p.clip]); }}>&#xF0C7;</button>;
			}
		}
		
		return (
			<div className={ p.className }>
				{ buttonNodes.play }
				{ buttonNodes.edit }
				
				{ buttonNodes.delete }
				{ buttonNodes.save }
			</div>
		);
	}
});