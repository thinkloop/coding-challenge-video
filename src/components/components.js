var React = require('react'),
    ReactDOM = require('react-dom'),
    appElement = document.getElementById('app'),
    Site = React.createFactory(require('./site/site'));

module.exports = {
    render: function(viewModel, callback) {
        ReactDOM.render(
        	Site(viewModel),
        	appElement,
        	callback
        );
    }
};