var gulp = require('gulp'),
    concat = require('gulp-concat'),
    cleanCss = require('gulp-clean-css'),
    htmlmin = require('gulp-htmlmin');

gulp.task('js', function () {
    gulp.src(['app/js/apiclient/*.js'])
        .pipe(concat('js/apiclient.js'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/rigdaily/*.js'])
        .pipe(concat('js/rigdaily.js'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/jquery-*.js'])
        .pipe(gulp.dest('dist/js'));
});

gulp.task('css', function () {
    gulp.src(['app/css/stylesheet.css'])
        .pipe(cleanCss({compatibility: 'ie8'}))
        .pipe(gulp.dest('dist/css'));
    gulp.src(['app/css/jquery-*.css'])
        .pipe(gulp.dest('dist/css'));
});

gulp.task('images', function () {
    gulp.src(['app/css/images/*'])
        .pipe(gulp.dest('dist/css/images'));
});

gulp.task('page', function () {
    gulp.src(['app/*.htm'])
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['js', 'css', 'images', 'page'], function () {
});