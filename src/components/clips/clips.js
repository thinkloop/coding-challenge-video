var React = require('react'),
	Clip = require('./clip'),
	events = require('../../events/events');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {
			fullVideo: {},
			clips: [],
			clipBeingPlayed: null,
			clipBeingEdited: null
		};
	},

	render: function() {
		var self = this,
			p = self.props,
			newButttonNode;
			
		if (!p.clipBeingEdited) {
			newButttonNode = <button className="new-button" title="New Clip" onClick={ function() { events.trigger(events.CLIP_NEW); }}>&#xF067;</button>;
		}
		
		return (
			<ul id="clips">
				<Clip 
					key="0" 
					clip={ p.fullVideo } 
					isBeingPlayed={ p.fullVideo === p.clipBeingPlayed } 
					isButtonsVisible={ !p.clipBeingEdited || p.clipBeingEdited === p.fullVideo } />
					
		        { p.clips.map(function(clip) {
		        	return <Clip 
		        				key={ clip.id } 
		        				clip={ clip } 
		        				isEditable="true"
		        				isBeingPlayed={ clip === p.clipBeingPlayed } 
		        				isBeingEdited={ clip === p.clipBeingEdited }
		        				isButtonsVisible={ !p.clipBeingEdited || p.clipBeingEdited === clip } />
		        })}
		        
		        { newButttonNode }
		    </ul>		    
		);
	}
});