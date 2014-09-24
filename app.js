var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('config');
var moment = require('moment');
var Log = require('log'), log = new Log();
var stylus = require('stylus');
var nib = require('nib');
var shuffle = require('shuffle');

var routes = require('./routes/index');

var app = express();

// Initialization
var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
   log.notice('Initializing in development mode.');
	app.use(morgan('dev', {stream:log.info})); 
} else {
	log.info('Initializing...');
	app.use(morgan('combined', {stream:log.info}));
}

// view engine setup
var viewPath = path.join(__dirname, config.get('Application.viewPath'));
var viewEngine = config.get('Application.viewEngine');
app.set('views', viewPath);
app.set('view engine', viewEngine);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));

var publicPath = path.join(__dirname + config.get('Application.publicPath'));
app.use(express.static(publicPath));



app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
