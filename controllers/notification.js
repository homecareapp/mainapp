var http = require('http');
var https = require('https');
var urlParser = require("url");
var secrets = require('../config/secrets');
var Notification = require('../models/Notification');

exports.getList = function(req, res, next) { 
    var url = secrets.notification.url;
    url += "/api/identity";
    console.log(url);

    var postData = {};
    postData.devices = {};
    postData.devices.gcm = [];
    postData.devices.gcm.push("fsfiwe894rwe4242irwhfs");   //req.body.gcmID; /todo by devoloper

    var postStringData = JSON.stringify(postData);
    var x_user_id = req.user._id.toString();    //"56a8d0b9576f97df297442f3";
    
    var options = {
        hostname: urlParser.parse(url).hostname,
        path: urlParser.parse(url).path,
        port:urlParser.parse(url).port,
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': x_user_id
        }
    };

    var body = "";

    var protocol = urlParser.parse(url).protocol;
    var httpHelper = http;
    if(protocol == 'https:')
        httpHelper = https;

    httpHelper.get(options, function(response) {
        //response.setEncoding('utf8');
        response.on('data', function (chunk) {
          body += chunk;
        });
        response.on('end', function () {
            try{
                var data = JSON.parse(body);
                res.json({ response : data });
            }catch (e){
                res.json({ response : e });
            };
        });
    }).on('error', function(e) { 
        res.json({ response : e });
    });
};

exports.updateNotification = function(req, res, next) {    
    var url = secrets.notification.url;
    url += "/api/identity";
    console.log(url);

    var postData = {};
    postData.devices = {};
    postData.devices.gcm = [];
    if (req.body.device_id) {
        postData.devices.gcm.push(req.body.device_id);   //req.body.device_id; /todo by devoloper
    };

    var postStringData = JSON.stringify(postData);
    var x_user_id = req.user._id.toString();    //"56a8d0b9576f97df297442f3";
    
    var options = {
        hostname: urlParser.parse(url).hostname,
        path: urlParser.parse(url).path,
        port:urlParser.parse(url).port,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postStringData.length,
            'x-user-id': x_user_id
        }
    };
    var body = "";

    var protocol = urlParser.parse(url).protocol;
    var httpHelper = http;
    if(protocol == 'https:')
        httpHelper = https;

    var req = httpHelper.request(options, function(httpres) {
        //console.log('STATUS: ' + httpres.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(httpres.headers));
        httpres.setEncoding('utf8');
        httpres.on('data', function (chunk) {
            body += chunk;
        });
        httpres.on('end', function() {
            try{
                var data = JSON.parse(body);
                res.json({ response : data });
            }catch (e){
              res.json({ response : e });
            };
        });
    });
    req.on('error', function(e) { 
        res.json({ response : e });
    });
    // write data to request body
    req.write(postStringData);
    req.end();
};

exports.sendNotification = function(req, res, next) {
    var data = {};
    data = req.body;
    data.user = {};
    data.user._id = "56a8d0b9576f97df297442f3";
    data.message = "This is the body notification data";

    data.ntype = "push";
    
    Notification(data, function(e, r){
        if(e) return next(e);

        res.json(r);
    })
}