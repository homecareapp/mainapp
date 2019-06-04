var dotenv = require('dotenv');
dotenv.load();
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var cors = require('cors');
var methodOverride = require('method-override');
var path = require('path');
var mongoose = require('mongoose');
var multer = require('multer');
var _ = require('lodash');
var passport = require('passport');
var expressValidator = require('express-validator');
var connectDomain = require('connect-domain');
var messageworker = require('./controllers/messageworker');
var addRequestId = require('express-request-id')();
//changes in burhan
//changes in development

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'mlyapi', // Required
    streams: [{
        path: './logs/debug.log',
        level: 'debug',
        type: 'rotating-file',
        period: '1d',
        count: 4
    }],
    serializers: {
        user: userLogSerializer
    },
    src: (process.env.NODE_ENV === 'development'), // Optional, see "src" section
});

function userLogSerializer(user) {
    return {
        username: user.username,
        name: user.profile.name,
        role: user.role
    }
}
/**
 * API keys and Passport configuration.
 */
var secrets = require('./config/secrets');
var passportConf = require('./config/passport');


var home = require('./routes/home');
var routes = require('./routes/index');
var api = require('./routes/api');
var mapi = require('./routes/mapi');

var app = express();
app.use(cors());
app.use(connectDomain());

/**
 * Connect to MongoDB.
 */
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
    console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

// mongoose.set('debug',true);

// var Integrator = require('okasintegrator');
// var integrator = new Integrator({
//     connectionString: secrets.db,
//     parserPath: __dirname + "/integrators/",
//     //cronTime:'0 * * * * *'
// });

//added firebase connection
// var firebase = require("firebase");
// firebase.initializeApp({
//     serviceAccount: secrets.firebaseConfig.firebaseSA,
//     databaseURL: secrets.firebaseConfig.firebaseDBURL
// });

// var db = firebase.database();
// var settings = db.ref("/settings");
// settings.on("value", function(snapshot) {
//   console.log(snapshot.val());
// }, function (errorObject) {
//   console.log("The read failed: " + errorObject.code);
// });

// var ref = db.ref("/users");
// var usersRef = ref.push();
// console.log(usersRef.key);
// usersRef.set({
//     date_of_birth: "June 23, 1912",
//     full_name: "Alan Turing"
// },function(data){
//     console.log('now');
//     console.log(data)
// });

// {
//     user_id: "5684d3c50afa45cc88f21b5a",
//     Notifications:[{
//             message:"vsdfs fsdf sd fsdfsd",
//             read:false
//         },
//         {
//             message:"vsdfs fsdf sd fsdfsd",
//             read:false
//         }]
    
// }

    
// comment as said by anil sir
// integrator.init();

/**
 * Express configuration.
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(logger('dev'));
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));
app.use(multer({
    dest: path.join(__dirname, 'uploads')
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressValidator());
app.use(methodOverride());

app.use(passport.initialize());

global.appRoot = path.resolve(__dirname);




/*init master data*/
var init = require('./controllers/initmasterdata');
// init.fillData();

app.use(addRequestId);

app.use(function(req, res, next) {
    req.log = logger.child({
        req_id: req.id
    });
    next();
})

/* open access routes */
app.use('/', home);
app.use('/api', api);



/* authenticated access */
app.use(passportConf.isAuthenticated);
app.use(function(req, res, next) {
    req.log.debug({ user: req.user, body: req.body, url: req.originalUrl }, 'request');
    next();
});
app.use('/mapi', mapi);
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
        req.log.error({ err: err, stack: err.stack }, err.message);
        res.status(err.status || 500);
        res.json({
            message: err.message,
            error: err,
            stack: err.stack
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    req.log.error({ err: err, stack: err.stack }, err.message);
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: {}
    });
});


Number.prototype.makeFloat = function(o){
    if (isNaN(o)) {
        return 0;
    }
    else
    {
        if(isNaN(parseFloat(o)))
            return 0;
        else
            return Math.round(parseFloat(o) * 100) / 100;   //return parseFloat(o);
    };
};

Number.prototype.waqt = function(minutes){ 
        var waqt = {};
        waqt.hour = Math.floor(parseInt(minutes) / 60);
        waqt.remainder = parseInt(minutes) % 60;
        waqt.fulltime;
        waqt.meridian;

        if (waqt.remainder == 0) waqt.remainder = "00"
        if (waqt.remainder == 15) waqt.remainder = "15"
        if (waqt.remainder == 30) waqt.remainder = "30"
        if (waqt.remainder == 45) waqt.remainder = "45"

        // if (waqt.hour == 1) waqt.remainder = "00"
        // if (waqt.hour == 1.25) waqt.remainder = "15"
        // if (waqt.hour == 1.5) waqt.remainder = "30"
        // if (waqt.hour == 1.75) waqt.remainder = "45"

        if (waqt.hour > 12) 
        {
            waqt.hour = waqt.hour - 12;
            if (waqt.hour < 10) {
                waqt.fulltime = "0" + waqt.hour + ":" + waqt.remainder + " PM";
                waqt.hour = "0" + waqt.hour;
                waqt.meridian = "PM";

            }
            else {
                waqt.fulltime = waqt.hour + ":" + waqt.remainder + " PM";
                waqt.hour = waqt.hour;
                waqt.meridian = "PM";
            }
        } 
        else if (waqt.hour < 12) 
        {
            //waqt.hour = "0" + waqt.hour + ":" + waqt.remainder + "AM";
            if (waqt.hour < 10) {
                waqt.fulltime = "0" + waqt.hour + ":" + waqt.remainder + " AM";
                waqt.hour = "0" + waqt.hour;
                waqt.meridian = "AM";
            }
            else {
                waqt.fulltime = waqt.hour + ":" + waqt.remainder + " AM";
                waqt.hour = waqt.hour;
                waqt.meridian = "AM";
            }
        } 
        else if(waqt.hour == 12) {
            waqt.fulltime = waqt.hour + ":" + waqt.remainder + "PM";
            waqt.hour = waqt.hour;
            waqt.meridian = "PM";
        }
        else 
        {
            waqt.fulltime = waqt.hour + ":" + waqt.remainder + " PM";
            waqt.hour = waqt.hour;
            waqt.meridian = "PM";
        }
        return waqt;
}

//format for Date   dd-MM-yyyy hh-mm:ss
Date.prototype.formatDate = function (format) {
    var date = this,
        day = date.getDate(),
        month = date.getMonth() + 1,
        year = date.getFullYear(),
        hours = date.getHours(),
        minutes = date.getMinutes(),
        seconds = date.getSeconds();

    if (!format) {
        format = "MM/dd/yyyy";
    };

    var monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var monthFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


    format = format.replace("MMM", monthShortNames[month - 1]);

    format = format.replace("MM", month.toString().replace(/^(\d)$/, '0$1'));

    if (format.indexOf("yyyy") > -1) {
        format = format.replace("yyyy", year.toString());
    } else if (format.indexOf("yy") > -1) {
        format = format.replace("yy", year.toString().substr(2, 2));
    }

    format = format.replace("dd", day.toString().replace(/^(\d)$/, '0$1'));

    if (format.indexOf("t") > -1) {
        if (hours > 11) {
            format = format.replace("t", "pm");
        } else {
            format = format.replace("t", "am");
        }
    }

    if (format.indexOf("T") > -1) {
        if (hours > 11) {
            format = format.replace("T", "PM");
        } else {
            format = format.replace("T", "AM");
        }
    }

    if (format.indexOf("HH") > -1) {
        format = format.replace("HH", hours.toString().replace(/^(\d)$/, '0$1'));
    }

    if (format.indexOf("hh") > -1) {
        if (hours > 12) {
            hours -= 12;
        }

        if (hours === 0) {
            hours = 12;
        }
        format = format.replace("hh", hours.toString().replace(/^(\d)$/, '0$1'));
    }

    if (format.indexOf("mm") > -1) {
        format = format.replace("mm", minutes.toString().replace(/^(\d)$/, '0$1'));
    }

    if (format.indexOf("ss") > -1) {
        format = format.replace("ss", seconds.toString().replace(/^(\d)$/, '0$1'));
    }

    return format;
};

//start message queue and start workers
messageworker.startworkers();
module.exports = app;
