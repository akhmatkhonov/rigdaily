var gulp = require('gulp'),
    concat = require('gulp-concat'),
    cleanCss = require('gulp-clean-css'),
    connect = require('gulp-connect'),
    order = require('gulp-order'),
    sourcemaps = require('gulp-sourcemaps');

gulp.task('js', function () {
    gulp.src(['app/js/apiclient/*.js'])
        .pipe(sourcemaps.init())
        .pipe(concat('js/apiclient.js'))
        .pipe(sourcemaps.write('maps'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/rigdaily/*.js'])
        .pipe(order([
            'RigDaily.js',
            'Config.js',
            'FieldValidators.js',
            'DynamicCalculations.js',
            'ConfigFields.js',
            'ArrowNavigation.js'
        ]))
        .pipe(sourcemaps.init())
        .pipe(concat('js/rigdaily.js'))
        .pipe(sourcemaps.write('maps'))
        .pipe(gulp.dest('dist'));
    gulp.src(['app/js/*.js'])
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
        root: 'dist'
    });
});

gulp.task('watch', function () {
    gulp.watch('./app/css/**/*', ['css', 'images']);
    gulp.watch('./app/js/**/*', ['js']);
    gulp.watch('./app/*.htm', ['html']);
});

gulp.task('default', ['js', 'css', 'images', 'html', 'connect', 'watch']);
