var React = require('react'),
	Buttons = require('./clip-buttons');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {
			clip: {},
			isEditable: false,
			isBeingPlayed: false,
			isBeingEdited: false,
			isButtonsVisible: true
		};
	},
	
	getInitialState: function() {
		return {
			clipHasContents: this.props.clip.hasContents()
		};
	},	
	
	handleChange: function(prop, val) {
		this.props.clip[prop] = val;
		this.setState({ clipHasContents: this.props.clip.hasContents() });
	},
	
	render: function() {
		var self = this,
			p = self.props,
			classes={
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
			clipNodes.push(<span key={ classes.name } className={ classes.name }>{ p.clip.name }</span>);
			clipNodes.push(<span key={ classes.startTime } className={ classes.startTime }>{ p.clip.startTime }</span>);
			clipNodes.push(<span key={ classes.endTime } className={ classes.endTime }>{ p.clip.endTime }</span>);
		}
		else {
			clipNodes.push(<input key={ classes.name } className={ classes.name } type="text" defaultValue={ p.clip.name } onChange={ function(e) { self.handleChange('name', e.target.value) }} />);
			clipNodes.push(<input key={ classes.startTime } className={ classes.startTime } type="text" defaultValue={ p.clip.startTime } onChange={ function(e) {self.handleChange('startTime', e.target.value) }} />);
			clipNodes.push(<input key={ classes.endTime } className={ classes.endTime } type="text" defaultValue={ p.clip.endTime } onChange={ function(e) { self.handleChange('endTime', e.target.value) }} />);
		}
		
		if (p.isButtonsVisible) {
			clipNodes.push(<Buttons key={ classes.buttons } className={ classes.buttons } clip={ p.clip } isEditable={ p.isEditable } isBeingEdited={ p.isBeingEdited } clipHasContents={ self.state.clipHasContents } />);
		}
		
		return (
			<li className={ classes.container + ' ' + classes.clipPlaying + ' ' + classes.clipEdit }>
				{ clipNodes }
			</li>
		);
	}
});