var React = require('react'),
	Clips = require('../clips/clips'),
	Video = require('../video/video');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {};
	},

	render: function() {
		var self = this,
			p = self.props;

		return (
			<div id="site">
				<h1 id="header">
				    <img id="logo" src="assets/krossover-logo.png" alt="Krossover" />
				</h1>
				<section id="content">
				    <Clips fullVideo={ p.clips.fullVideo } clips={ p.clips.collection } clipBeingPlayed={ p.clips.clipBeingPlayed } clipBeingEdited={ p.clips.clipBeingEdited } />
			    	<Video fullVideo={ p.clips.fullVideo } clip={ p.clips.clipBeingPlayed } />
				</section>
			</div>		    
		);
	}
});