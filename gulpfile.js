const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cssnano = require('gulp-cssnano');
const rename = require('gulp-rename');
const htmlreplace = require('gulp-html-replace');

const scriptsPath = 'js/**/*.js';
const stylesPath = 'css/**/*.css';
const imagesPath = 'images/**/*';
const htmlPath = 'index.htm';

gulp.task('scripts', function() {
    return gulp.src(scriptsPath)
            .pipe(concat('app.js'))
            .pipe(gulp.dest('dist/js'))
            .pipe(rename('app.min.js'))
            .pipe(uglify())
            .pipe(gulp.dest('dist/js'));
});

gulp.task('styles', function() {
    return gulp.src(stylesPath)
            .pipe(concat('app.css'))
            .pipe(gulp.dest('dist/css'))
            .pipe(rename('app.min.css'))
            .pipe(cssnano())
            .pipe(gulp.dest('dist/css'));
});

gulp.task('images', function() {
    return gulp.src(imagesPath)
            .pipe(gulp.dest('dist/images'));
});

gulp.task('html', function() {
    return gulp.src(htmlPath)
            .pipe(htmlreplace({
                css: 'css/app.min.css',
                js: 'js/app.min.js'
            }))
            .pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.series('scripts', 'styles', 'images', 'html'));
