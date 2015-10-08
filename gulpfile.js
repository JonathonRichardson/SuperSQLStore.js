var gulp         = require('gulp'),
    sass         = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss    = require('gulp-minify-css'),
    jshint       = require('gulp-jshint'),
    uglify       = require('gulp-uglify'),
    rename       = require('gulp-rename'),
    concat       = require('gulp-concat'),
    notify       = require('gulp-notify'),
    livereload   = require('gulp-livereload'),
    replace      = require('gulp-replace'),
    bump         = require('gulp-bump'),
    wrapper      = require('gulp-module-wrapper'),
    insert       = require('gulp-insert'),
    _            = require('underscore'),
    eol          = require('gulp-eol'),
    del          = require('del');

gulp.task('bump', function(){
  return gulp.src(['package.json'])
  .pipe(bump())
  .pipe(gulp.dest('./'));
});

gulp.task('clean', function(cb) {
  del(['dist']);
  cb();
});

gulp.task('js', ['clean', 'bump'], function() {
  var fs = require('fs');
  var json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  var version = json.version;

  var code    = gulp.src('src/**/*.js').pipe(concat('supersqlstore.js'));
  var amdcode = gulp.src('src/**/*.js').pipe(concat('supersqlstore.js'));

  var pipes = [code, amdcode];

  _.each(pipes, function(value) {
    //Update the version number from the source file
    value = value.pipe(replace('{{VERSION}}', version));
  });

  var EOL = '\n';

  var noamd = code
    .pipe(insert.prepend("var SuperSQLStore = {};" + EOL + "(function() {" + EOL + EOL))
    .pipe(insert.append(EOL + EOL + "})();"))
    .pipe(eol())
    .pipe(rename('supersqlstore-no-amd.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename('supersqlstore-no-amd.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));

  var amd = amdcode.pipe(insert.prepend("var SuperSQLStore = {};" + EOL))
    .pipe(wrapper({
       name: false,
       deps: ['jquery', 'underscore', 'knockout'],
       args: ['$',      '_',          'ko'],
       exports: 'SuperSQLStore'
     }))
    .pipe(eol())
    .pipe(rename('supersqlstore.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename('supersqlstore.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .pipe(notify({ message: 'Scripts task complete' }));

  return amd;
});

gulp.task('default', ['js']);
