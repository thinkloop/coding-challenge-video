var packageJSON = require('./package.json'),
	del = require('del'),
	runSequence = require('run-sequence'),
	vinylsource = require('vinyl-source-stream'),
	gutil = require('gulp-util'),
	
	htmlreplace = require('gulp-html-replace'),
	replace = require('gulp-replace'),
	rename = require('gulp-rename'),
	streamify = require('gulp-streamify'),
	
	gulp = require('gulp'),
	browserify = require('browserify'),
	watchify = require('watchify'),
	babelify = require('babelify'),
    less = require('gulp-less'),
	minifyCSS  = require('gulp-minify-css'),
	
	path = {
		SRC : 'src',
		
		INDEX_HTML : 'src/index.html',
		INDEX_JS : 'src/index.js',
		INDEX_LESS : 'src/styles/styles.less',
		LESS_FOLDER : 'src/styles',
		ASSETS : 'assets',
		
		DEST : 'dist',
		HTML_DESTINATION_FILENAME : 'index' + '-' + packageJSON.version + '.html',
		JS_DESTINATION_FILENAME : 'build.js',
		
	};

gulp.task('clean', function() {
	return del([path.DEST + '/**']);
});

gulp.task('copyAssets', function() {
	return gulp.src(path.SRC + '/' + path.ASSETS + '/**')
		.pipe(gulp.dest(path.DEST + '/' + packageJSON.version));
});

gulp.task('processLessCSS', function() {
	return gulp.src(path.INDEX_LESS)
        .pipe(less())
        .pipe(streamify(replace(path.ASSETS + '/', packageJSON.version + '/')))
        .pipe(minifyCSS())
        .pipe(gulp.dest(path.DEST));
});

gulp.task('replaceHTML', function() {
	return gulp.src(path.INDEX_HTML)
		.pipe(htmlreplace({
			'js': {
				src: [
					process.env.NODE_ENV === 'development' ? '//cdnjs.cloudflare.com/ajax/libs/react/0.14.1/react.js' : '//cdnjs.cloudflare.com/ajax/libs/react/0.14.0/react.min.js',
					process.env.NODE_ENV === 'development' ? '//cdnjs.cloudflare.com/ajax/libs/react/0.14.0/react-dom.min.js' : '//cdnjs.cloudflare.com/ajax/libs/react/0.14.0/react-dom.min.js',
					packageJSON.version + '/' + path.JS_DESTINATION_FILENAME
				],
				tpl: '<script src="%s" defer="defer"></script>'
			}
		}))
		.pipe(rename(path.HTML_DESTINATION_FILENAME))
		.pipe(gulp.dest(path.DEST));
});

/* * * * * * * * * * * /
/* * Runnable Tasks * */
/* * * * * * * * * * **/

gulp.task('default', function() {
	var watcher;
	
	process.env.NODE_ENV = 'development';

	runSequence('clean', ['copyAssets', 'processLessCSS'], 'replaceHTML');

	// watch index.html
	gulp.watch(path.INDEX_HTML, ['replaceHTML']);

	// watch css
	gulp.watch(path.LESS_FOLDER + '/*.less', ['processLessCSS']);

	// watch app
	watcher = watchify(browserify({
		entries : [path.INDEX_JS],
		transform : [babelify],
		debug : true,
		cache : {}, packageCache : {}, fullPaths : true
	}));

	watcher.on('update', function() {
		watcher.bundle().on("error", handleError)
			.pipe(vinylsource(path.JS_DESTINATION_FILENAME))
			.pipe(streamify(replace(path.ASSETS + '/', packageJSON.version + '/')))
			.pipe(gulp.dest(path.DEST + '/' + packageJSON.version));
		gutil.log('Updated JS');
	});

	watcher.bundle()
	    .on("error", handleError)
		.pipe(vinylsource(path.JS_DESTINATION_FILENAME))
		.pipe(streamify(replace(path.ASSETS + '/', packageJSON.version + '/')))
		.pipe(gulp.dest(path.DEST + '/' + packageJSON.version));
});

/* * * * * * * /
/* * Common * */
/* * * * * * **/

function handleError(err) {
	gutil.log(err.toString());
}