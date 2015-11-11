var React = require('react');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {
		    fullVideo: {},
	        clip: null
	    };
	},

	render: function() {
		var self = this,
			p = self.props,
			videoURL = p.fullVideo.url,
			videoNode;
			
		if (p.clip) {
		    videoURL = videoURL + '#t=' + p.clip.startTime + ',' + p.clip.endTime + '&s=' + Date.now();
		}
	
		return (
		    <div id="video-container">
                <video id="video" src={ videoURL } autoPlay={ !!p.clip } controls={ !!p.clip }>	
                    Your browser does not support the <code>video</code> element.
                </video>
            </div>		    
		);
	}
});