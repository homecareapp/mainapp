var Model = require('../models/Attendance'),
    mongoose = require('mongoose'),
    mongoosePaginate = require("mongoose-paginate"),
    moment = require('moment'),
    async = require("async");

var ModelUser = require('../models/User');
_ = require("lodash");

var date = new Date();
var today = moment(date).format('ll');

var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;

exports.getList = function(req, res, next) {
	
	if(req.params.Id)
	{
		getByID(req.params.Id, function(error, result)
		{
			if(error) return next(new Error(error));
			return res.json({
				responce:result
			});
		})
	}
	else
	{
		var params = {}
		if (req.query.from_date) {
			if (req.query.to_date) {
				if(new Date(req.query.from_date) < new Date(req.query.to_date))
				{
					params.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(req.query.to_date) };
				}
				else if(new Date(req.query.from_date) == new Date(req.query.to_date)){
					var todate = moment(req.query.from_date).endOf('day');
					params.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(todate) };
				}
			}
			else
			{
				var todate = moment(req.query.from_date).endOf('day');
				params.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(todate) };
			}
		}
		
		if (req.query.user_id) {
			params.user_id=req.query.user_id
		}

		var users = [];
		if (req.query.users) {
			users = req.query.users.split(',')
		}
		if(users.length)
		{
			params["user_id"] = {
                $in: users
            }
		}
		
		list(params, function(error, results)
		{
			if(error) return next(new Error(error));
			return res.json({
				responce: results
			})
		})
	}
};
	function getByID(id, callback){
		//get attandence by id from MONGODB
		Model.findById(id, function(error, result)
		{
			if(error) return callback(error);
			return callback(null, result) // successful return
		})
	}
	function list(params, callback){
		var search = params;

		//get list of orders based on search criteria
		Model.find(search, function(error, results){
			if(error) return callback(error);
			return callback(null, results);
		});
	}

exports.add =function(req, res, next){

	var date = new Date();
	var currentDate = moment().tz(TIMEZONE).startOf('day').toISOString();

 	if (currentDate== req.body.att_date) {
 		req.body.user_id = req.user._id;
 	 	//console.log(req.body.user_id)
 	 	addAttendance(req.body, function(error, attendence)
		{
			if(error) return next(new Error(error));
			return res.json({
				responce:attendence
			})
 	 	});
 	}
	else
	{
		return next(new Error("You have change the correct date, Goto Setting and Select Automatic Date Time"));		
	}
}
	function addAttendance(data, callback){
		//add attandence by id from MONGODB
	    var attn = new Model(data);
	    attn.save(function(error, attendence) {
	    	if(error) return callback(error);
			return callback(null, attendence);
	    })
	}

exports.update = function(req, res, next) {
	
	if(req.params.id)
	{
		req.body.user_id = req.user._id;
		getByID_update(req.params.id, req.body	, function(error, result)
		{
			if(error) return next(new Error(error));
			return res.json({
				responce:result
			});
		})
	}
};
	function getByID_update(id, data, callback){
		//update attandence by id from MONGODB

	    Model.findById(id, function(error, attandence) 
	    {
	        if (error) return next(new Error(error));
	        if (!attandence) return next(new Error("Attandence not found."));
	        if (data.punchin_time)
	        	attandence.punchin_time = data.punchin_time;
	        if (data.punchout_time)
	        	attandence.punchout_time = data.punchout_time;
	        attandence.save(function(error, result) {
	        	if(error) return callback(error);
			
				return callback(null, result);
	        })
	    })
	}

exports.getUsersAttendance = function(req, res, next) {
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
        	if(req.query.city_id) search["profile.city_id"] = req.query.city_id;

        	search["role"] = {$in:["serviceagent","logistic"]}

        	var areas = [];
        	if(req.query.areas) // string comma seperated
        	{
				if (req.query.areas) {
					areas = req.query.areas.split(',')
				}
				if(areas.length)
				{
					search["availability.morningareas"] = {
		                $in: areas
		            }
		            // search["availability.eveningareas"] = {
		            //     $in: areas
		            // }
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
			search["_Deleted"] = false;
			ModelUser.find(search, function(err, users) {
                if (err) return nextfun(new Error(err));
                return nextfun(null, users)
            });
			
        },
        function(users, nextfun) {
            var attnSearch = {};

            attnSearch["user_id"]={$in: users}

            if (req.query.from_date) {
				if (req.query.to_date) {
					if(new Date(req.query.from_date) < new Date(req.query.to_date))
					{
						attnSearch.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(req.query.to_date) };
					}
					else if(req.query.from_date == req.query.to_date){
						var todate = moment(req.query.from_date).endOf('day');
						attnSearch.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(todate) };
					}
				}
				else
				{
					var todate = moment(req.query.from_date).endOf('day');
					attnSearch.att_date ={ '$gte': new Date(req.query.from_date), '$lte': new Date(todate) };
				}
			}
            Model.find(attnSearch, function(err, usersAttendance){
			     return nextfun(null, users, usersAttendance)
			});
        },
        function(users, usersAttendance, nextfun) {
        	//to prepare attn task as req in gannt
        	var ganttData = [];
        	var temptask = usersAttendance;
            users.forEach(function(dataObj){
                var temp ={};
                temp.name = dataObj.profile.name;
                temp.id = dataObj._id;
                temp.role = dataObj.role;
                temp.tasks=[];
                var task1 = [];
                temptask.forEach(function(taskObj){
                    if(taskObj.user_id._id.toString() == temp.id.toString()){
                        var temp1={};
                        temp1.id=taskObj._id;
                        //temp1.name = taskObj.user_id;
                        temp1.from = new Date(moment(taskObj.att_date).tz(TIMEZONE).startOf('day')).toISOString();
                        temp1.to = new Date(moment(taskObj.att_date).tz(TIMEZONE).endOf('day')).toISOString();
                        //temp1.date = taskObj.att_date;
                        if(taskObj.punchin_time && !taskObj.punchout_time){
                            //temp1.name ='Punched In @ '+taskObj.punchin_time
                            temp1.name = taskObj.punchin_time
                            temp1.color = '#f7f177';//yellow
                        }
                        else if(taskObj.punchin_time && taskObj.punchout_time){
                            temp1.color = '#77f793';//green
                            //temp1.name ='Punched In @ '+taskObj.punchin_time+','+'Punched Out @ '+taskObj.punchout_time
                            temp1.name ='In:- '+taskObj.punchin_time+',\n '+'Out:- '+taskObj.punchout_time
                        }
                        else{
                            //temp1.name ='Not Punched In'
                            temp1.name =''
                            temp1.color = '#f77777';//red
                        }
                        temp.tasks.push(temp1);
                    }
                });
                ganttData.push(temp);
            });

            //to prepare task not punched in/ punched out as req in gannt
            for (var i = 0; i < ganttData.length; i++)
            {
                if(!ganttData[i].tasks){
                    ganttData[i].tasks = [];
                }
                
                var attendanceCount = ganttData[i].tasks.length;
                if(attendanceCount)
                {
	               	for (var j = new Date(req.query.from_date),t=0; j <= new Date(req.query.to_date); j=new Date(moment(j).add(1,'days')),t++){
						for (var k = 0; k < attendanceCount; k++){
	                       var exist = false;
	                       if(ganttData[i].tasks[k].from == new Date(j).toISOString()){
	                            exist = true;
	                        }
	                       	if(!exist){
	                            var alreadyExists = _.filter(ganttData[i].tasks, function(ob){
	                                return ob.from == new Date(j).toISOString();
	                            });
	                           if(!alreadyExists.length){
	                               var newTaskObj = {};
	                               newTaskObj.id=t;
	                               //newTaskObj.name="Not Punched in";
	                               newTaskObj.name="";
	                               newTaskObj.color="#f77777";
	                               newTaskObj.from = new Date(j).toISOString();
	                               newTaskObj.to = new Date(moment(j).tz(TIMEZONE).endOf('day')).toISOString();
	                               ganttData[i].tasks.push(newTaskObj);
	                            }
	                        }
	                    }
	                }
                }
                else
                {
                	for (var j = new Date(req.query.from_date),t=0; j <= new Date(req.query.to_date); j=new Date(moment(j).add(1,'days')),t++){
                		var alreadyExists = _.filter(ganttData[i].tasks, function(ob){
                            return ob.from == new Date(j).toISOString();
                        });
                       	if(!alreadyExists.length){
                           var newTaskObj = {};
                           newTaskObj.id=t;
                           //newTaskObj.name="Not Punched in";
                           newTaskObj.name="";
                           newTaskObj.color="#f77777";
                           newTaskObj.from = new Date(j).toISOString();
                           newTaskObj.to = new Date(moment(j).tz(TIMEZONE).endOf('day')).toISOString();
                           ganttData[i].tasks.push(newTaskObj);
                        }
                	}
                }
            }
            return nextfun(null, users,usersAttendance, ganttData)
            
        }
    ], function(error, users, usersAttendance, data) {
        if(error) return next(error);
        
        res.json({
            //response: {"users":users,"usersAttendance":usersAttendance},
            response: {"usersAttendance":data},
            message: "client wise attence"
        });
        
    })
}
