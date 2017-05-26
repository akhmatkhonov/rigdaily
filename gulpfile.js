var gulp = require('gulp'),
    concat = require('gulp-concat'),
    cleanCss = require('gulp-clean-css'),
    livereload = require('gulp-livereload'),
    connect = require('gulp-connect');

gulp.task('js', function () {
    gulp.src(['app/js/apiclient/*.js'])
        .pipe(concat('js/apiclient.js'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/rigdaily/*.js'])
        .pipe(concat('js/rigdaily.js'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/jquery-*.js'])
        .pipe(gulp.dest('dist/js'))
        .pipe(connect.reload());
});

gulp.task('css', function () {
    gulp.src(['app/css/stylesheet.css'])
        .pipe(cleanCss({compatibility: 'ie8'}))
        .pipe(gulp.dest('dist/css'));
    gulp.src(['app/css/jquery-*.css'])
        .pipe(gulp.dest('dist/css'))
        .pipe(connect.reload());
});

gulp.task('images', function () {
    gulp.src(['app/css/images/*'])
        .pipe(gulp.dest('dist/css/images'))
        .pipe(connect.reload());
});

gulp.task('html', function () {
    gulp.src(['app/*.htm'])
        .pipe(gulp.dest('dist'))
        .pipe(connect.reload());
});

gulp.task('connect', function () {
    connect.server({
        root: 'dist',
        livereload: true
    });
});

gulp.task('watch', function () {
    gulp.watch('./app/css/**/*', ['css']);
    gulp.watch('./app/js/**/*', ['js']);
    gulp.watch('./app/*.html', ['html']);
});

gulp.task('default', ['js', 'css', 'images', 'html', 'connect', 'watch']);
