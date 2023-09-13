'use strict';

var gulp = require('gulp'),
    sass = require('gulp-sass'),
    uglify = require('gulp-uglify-es').default,
    concat = require('gulp-concat'),
    order = require('gulp-order'),
    stripdebug = require('gulp-strip-debug'),
    revUrlhash = require('gulp-rev-urlhash'),
    insert = require('gulp-insert'),
    runSequence = require('run-sequence'),
    rename = require("gulp-rename");

var appPath = "capture-prototype/";
var cssPath = appPath+"css/";
var jsPath = appPath+"js/";
var jsBuildPath = jsPath+"build/";
var jsBuild;
var cssBuild;
var bundles = require("./bundles");

function createErrorHandler(name) {
    return function (err) {
        console.error('Error from ' + name + ' in compress task', err.toString());
    };
}

gulp.task('compress', function () {
    var jsFiles = [];
    for (var i in bundles) {
        bundles[i].items.forEach(function(item) {
            jsFiles.push(appPath + item);
        });
    }

    return gulp.src(jsFiles)
        .on('error', createErrorHandler('gulp.src'))
        .pipe(concat('bundle.js'))
        .on('error', createErrorHandler('concat'))
        .pipe(insert.append('//@ sourceURL=bundle.js?1'))
        .pipe(gulp.dest(jsBuildPath));
});

gulp.task("uglify", function() {
    return gulp.src(jsBuildPath + "bundle.js")
        .pipe(rename("bundle.min.js"))
        .pipe(uglify())
        .on('error', createErrorHandler('uglify'))
        .pipe(gulp.dest(jsBuildPath));
});

gulp.task("revision", function() {
    return gulp.src(jsBuildPath + "bundle.js")
        .pipe(revUrlhash())
        .pipe(revUrlhash.manifest())
        .pipe(gulp.dest(jsBuildPath)); // write manifest to build dir
});

gulp.task("revision-minified", function() {
    return gulp.src(jsBuildPath + "bundle.min.js")
        .pipe(revUrlhash())
        .pipe(revUrlhash.manifest())
        .pipe(gulp.dest(jsBuildPath)); // write manifest to build dir
});

gulp.task('prepare-js', function (done) {
    runSequence("compress", "uglify", "revision-minified", function() {
        console.log("js prepared");
        done();
    });
});

gulp.task('prepare-js-unminified', function (done) {
    runSequence("compress", "revision", function() {
        console.log("js prepared");
        done();
    });
});

gulp.task('sass', function () {
    cssBuild = gulp.src(cssPath+'src/style.scss')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest(cssPath+"build/"));

    return cssBuild.pipe(revUrlhash())
        .pipe(revUrlhash.manifest())
        .pipe(gulp.dest(cssPath+"build/")); // write manifest to build dir
});

gulp.task('copy-to-sep-folder', function () {
    var arFilesToCopy = [
        appPath+'index.html',
        appPath+'css/build/**',
        appPath+'fonts/**',
        appPath+'images/**',
        appPath+'js/build/bundle.min.js',
        appPath+'js/build/rev-manifest.json',
        appPath+'js/data/**',
        appPath+'js/vendor/jquery-2.1.3.min.js',
        appPath+'js/vendor/bootstrap-3.3.7-dist/**',
        appPath+'js/vendor/jquery-ui-1.12.1/jquery-ui.min.css',
        appPath+'templates/**'
    ];
    return gulp.src(arFilesToCopy, {base: 'capture-prototype/'})
        .pipe(gulp.dest("fp/"));
});

gulp.task('collect', function (done) {
    runSequence("prepare-js", "sass", "copy-to-sep-folder", function() {
        console.log("all stuff is processed and copied to /fp/");
        done();
    });
});

gulp.task('default', ["prepare-js", 'sass'], function () {
    gulp.watch(cssPath+'src/**/*.scss', ['sass']);
    gulp.watch([jsPath+"**/*.js"], ['prepare-js']);
});