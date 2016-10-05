
var gulp = require('gulp');
var runSequence = require('run-sequence');

//************* BROWSERIFY************
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');


gulp.task('browserify', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: [
    	'./test.js',
    ],
    debug: true,
  });

  return b.bundle()
    .pipe(source('bundle_app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        .on('error', gutil.log)
    .pipe(sourcemaps.write(dest_dev))
    .pipe(gulp.dest('./public/js'));
});

//******************* GULP SEQUENCES ********************
gulp.task('default', function(callback) {
	runSequence(
		'browserify',
		function(err) {
		if (err)
			console.log(err);
		else
			console.log('TESTING FILES CREATED SUCCESSFULLY');
		callback(err);
	});
}); 
