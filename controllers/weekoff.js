var Model = require('../models/WeekOffRequest'),
    mongoose = require('mongoose'),
    mongoosePaginate = require("mongoose-paginate"),
    moment = require('moment'),
    async = require("async");

var ModelUser = require('../models/User');
_ = require("lodash");

var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;

exports.getWO = function(req, res, next) {

    return res.json({
        response:"generic"
    })
    
}

exports.getWORequests = function(req, res, next) {
	if (!req.query.from_date) return next(new Error("from_date Not Present"));
	if (!req.query.to_date) return next(new Error("to_date Not Present"));
	if (!req.query.city_id) return next(new Error("city_id Not Present"));

	if(new Date(req.query.from_date) > new Date(req.query.to_date))
	{
		return next(new Error("from_date should be less than to_date"));
	}

	async.waterfall([
        function(nextfun) {
			// to find users based on city_id, areas
        	var search = {};
            search['$or'] = [];
        	if(req.query.city_id) search["profile.city_id"] = req.query.city_id;

            // if(req.query.role)
        	   // search["role"] = req.query.role;

            if(req.query.role)
            {
                var roles = [];
                if (req.query.role) {
                    roles = req.query.role.split(',')
                }
                if(roles.length)
                {
                    search["role"] = {
                        $in: roles
                    }
                }
            }

        	var areas = [];
        	if(req.query.areas) // string comma seperated
        	{
				if (req.query.areas) {
					areas = req.query.areas.split(',')
				}
				if(areas.length)
				{
					// search["availability.morningareas"] = {
		   //              $in: areas
		   //          }
		            // search["availability.eveningareas"] = {
		            //     $in: areas
		            // }
                    search['$or'].push( {'availability.morningareas': {$in: areas}} )
                    search['$or'].push( {'availability.eveningareas': {$in: areas}} )
				}
        	}

        	var users = [];
			if (req.query.users) {
				if (req.query.users) {
					users = req.query.users.split(',')
				}
				if(users.length)
				{

					var  usersObjectIds = [];
					for (var i = 0; i < users.length; i++) {
						usersObjectIds.push(mongoose.Types.ObjectId(users[i]))
					}

					search["_id"]={$in: usersObjectIds}

					// ModelUser.find({
					//     '_id': { $in: usersObjectIds}
					// }, function(err, users){
					//      return nextfun(null, users)
					// });
				}
			}
            if(!search['$or'].length)
            {
                delete search['$or'];
            }
            search["_Deleted"] = false;
			ModelUser.find(search, function(err, users) {
                if (err) return nextfun(new Error(err));
                return nextfun(null, users)
            });
			
        },
        function(users, nextfun) {
            var reqSearch = {};

            reqSearch["user_id"]={$in: users}

            if (req.query.from_date && req.query.to_date) {

            	var fdate = new Date(req.query.from_date);
        		var tdate = new Date(req.query.to_date);
        		tdate.setDate(tdate.getDate() + 1);
        		tdate.setSeconds(tdate.getSeconds() - 1);

				reqSearch['$or'] = [
		            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
		            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
		            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
		            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
		        ];
			}
            Model.find(reqSearch, function(err, usersRequest){
			     return nextfun(null, users, usersRequest)
			});
        },
        function(users, usersRequest, nextfun) {
        	//to prepare attn task as req in gannt
        	var ganttData = [];
        	var temptask = usersRequest;
            users.forEach(function(dataObj){
                var temp ={};
                temp.name = dataObj.profile.name;
                temp.id = dataObj._id;
                temp.role = dataObj.role;
                temp.availability = dataObj.availability;
                temp.tasks=[];
                var task1 = [];
                temptask.forEach(function(taskObj){
                    if(taskObj.user_id._id.toString() == temp.id.toString()){
                        var temp1={};
                        temp1.data=taskObj;
                        temp1.id=taskObj._id;
                        //temp1.name = taskObj.user_id;
                        temp1.from = new Date(moment(taskObj.requestdate).tz(TIMEZONE).startOf('day')).toISOString();
                        temp1.to = new Date(moment(taskObj.requesttodate).tz(TIMEZONE).endOf('day')).toISOString();
                        //temp1.date = taskObj.att_date;

                        // if(taskObj.leavetype == 'weekoff')
                        //     temp1.name = 'WO';
                        // if(taskObj.leavetype == 'leave')
                        //     temp1.name = 'L';

                        if(taskObj.status == 'open'){
                            if(taskObj.leavetype == 'weekoff')
                            {
                                temp1.color = '#FF748C';//Pink
                                temp1.name = 'APPROVAL PENDING';
                            }
                            if(taskObj.leavetype == 'leave')
                            {
                                temp1.color = '#ffc900';//yellow
                                temp1.name = 'APPROVAL PENDING';
                            }
                            
                        }
                        else if(taskObj.status == 'rejected'){
                            if(taskObj.leavetype == 'weekoff')
                            {
                                temp1.color = '#c9302c';//red
                                temp1.name = 'WO CANCELLED';
                            }
                            if(taskObj.leavetype == 'leave')
                            {
                                temp1.color = '#c9302c';//red
                                temp1.name = 'LEAVE CANCELLED';
                            }
                        }
                        else if (taskObj.status == 'accepted'){
                            if(taskObj.leavetype == 'weekoff')
                            {
                                if(taskObj.createdbyrole == 'admin')
                                {
                                    temp1.color = '#87b1f9';//blue
                                    temp1.name = 'WO BY ADMIN';
                                }
                                else if(taskObj.createdbyrole != 'admin')
                                {
                                    temp1.color = '#5ab85c';//green
                                    temp1.name = 'APPROVED';
                                }
                                
                            }
                            if(taskObj.leavetype == 'leave')
                                {
                                    if(taskObj.createdbyrole == 'admin')
                                {
                                    temp1.color = '#87b1f9';//blue
                                    temp1.name = 'LEAVE BY ADMIN';
                                }
                                else if(taskObj.createdbyrole != 'admin')
                                {
                                    temp1.color = '#5ab85c';//green
                                    temp1.name = 'APPROVED';
                                }
                            }
                        }
                        // else if(taskObj.status == 'reopen'){
                        //     if(taskObj.leavetype == 'weekoff')
                        //         temp1.color = 'brown';//brown
                        //     if(taskObj.leavetype == 'leave')
                        //         temp1.color = 'brown';//brown
                        // }
                        temp.tasks.push(temp1);
                    }
                });
                ganttData.push(temp);
            });

            return nextfun(null, users,usersRequest, ganttData)
            
        }
    ], function(error, users, usersAttendance, data) {
        if(error) return next(error);
        
        res.json({
            //response: {"users":users,"usersAttendance":usersAttendance},
            response: {"usersRequest":data},
            message: "client wise request"
        });
        
    })
}
