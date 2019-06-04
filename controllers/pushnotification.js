var _ = require('lodash');
var async = require('async');
var gcm = require('node-gcm');
//var AWS = require('aws-sdk');
var secrets = require('../config/secrets');
var sender = new gcm.Sender('AIzaSyBxqsdzCI-6oKNZ4u73-7NgGkAyOc8gUJA');
var User = require('../models/User');
var Provider = require('../models/Provider');
var resonator = secrets.RESONATOR;
var request = require('request');

// AWS.config.update({
//     accessKeyId: secrets.AWS_KEY,
//     secretAccessKey: secrets.AWS_SECRET,
//     region: secrets.SNS_REGION
// });

// var sns = new AWS.SNS();

exports.send = function(data, callback) {

    var touser = data.touser;
    var messagetype = data.type;
    var details = data.details;
    var title = data.title;
    var message = data.message;
    
    //find user by id and get device ids.
    User.findById(touser, function(error, result) {
        if (error) return callback(error);

        if (!result) {
            console.error('user not found');
            return callback(new Error('user not found for sending push'));
        }

        var regids = [];
        var targetArns = [];

        sendMessage(resonator, title, message, messagetype, details, [touser], callback);
    });

};

exports.register = function(data, callback) {
    var url = resonator,
        userid = data.userid,
        device = data.device,
        deviceid = data.deviceid,
        name = data.name,
        mobilenumber = data.mobilenumber;


    async.waterfall([
        function(nextfunc) {
            //check if user exist?

            var postData = {
                _id: userid,
                "devices": {
                    "sms": (mobilenumber)?[mobilenumber]:[],
                    "email": [],
                    "phone": [],
                    "apn": (device == 'ios') ? [deviceid] : [],
                    "gcm": (device == 'android') ? [deviceid] : []
                },
                "channels": []
            }

            var options = {
                uri: url + '/api/identity',
                headers: { 'x-user-id': userid },
                method: 'GET'
            };

            request(options, function(err, httpResponse, body) {
                
                if (!err && httpResponse.statusCode == 200) {
                    //update the deviceid.
                    
                    var putOptions = {
                        uri: url + '/api/identity',
                        headers: { 'x-user-id': userid },
                        method: 'PUT',
                        json: postData
                    }
                    request(putOptions, function(err, postResponse, body) {
                        return nextfunc(err, postResponse)
                    })

                } else {
                    //create the identity
                    var postOptions = {
                        uri: url + '/api/identity',
                        headers: { 'x-user-id': userid },
                        method: 'POST',
                        json: postData
                    };

                    request(postOptions, function(err, postResponse, body) {
                        return nextfunc(err, postResponse)
                    })
                }
            })

        }
    ], function(err, result) {
        if (err){
            console.log('error while calling resonator')
            console.log(err);
            return callback(err);
        }
        return callback();
    })
}

exports.unregister = function (data,callback) {
      var userid = data.userid,
      device = data.device,
      url = resonator,
      deviceid = data.deviceid;

      async.waterfall([
        function(nextfunc) {

            var options = {
                uri: url + '/api/identity',
                headers: { 'x-user-id': userid },
                method: 'GET'
            };

            request(options, function(err, httpResponse, body) {
                
                if (!err && httpResponse.statusCode == 200) {
                    //update the deviceid.
                    var postData = JSON.parse(body);
                    
                    //TODO remove the unregistered device from devices.
                    if(device == 'android'){
                        postData.devices.gcm = [];
                    }

                    var putOptions = {
                        uri: url + '/api/identity',
                        headers: { 'x-user-id': userid },
                        method: 'PUT',
                        json: postData
                    }
                    request(putOptions, function(err, postResponse, body) {
                        return nextfunc(err, postResponse)
                    })
                }else{
                    return nextfunc();
                } 
            })
        }
        ], function(err, result) {
            if (err){
                console.log('error while  unregistering device resonator')
                console.log(err);
            }
            return callback(err);
        })
}

function sendMessage(url, title, text, messagetype, details, userids, callback) {

    var data = {
        "identities": userids,
        "content": {
            "gcm": {
                "message": {
                    "title": title,
                    "message": text,
                    "type": messagetype
                }
            }
        }
    }

    var options = {
        uri: url + '/api/notification/push',
        method: 'POST',
        json: data
    };

    console.log("options-------")
    console.log(options)

    request(options, function(error, response, body) {
        if(error)
          return callback(error);
        else if(response.statusCode != 204)
          return callback(body);
        else
          return callback();
    });
}
