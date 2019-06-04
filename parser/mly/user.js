var _ = require('lodash');
var async = require('async');
var Model = require('../../models/User');
var ModelOrder = require('../../models/Order');
var ModelWo = require("../../models/WeekOffRequest");

exports.getUsersByArea = function (req, res, next) {
	var data = req.body;

	if (!data.area_id) return res.json({ error: "Area not found." })
	if (!data.date) return res.json({ error: "Date not found." })
	if (!data.time && parseInt(data.time) != 0) return res.json({ error: "Time not found." })

	var populateQuery = [{
	    path: 'client_id',
	    select: '_id demography.salutation demography.fullname demography.mobilenumber demography.gender demography.age'
	},{
	    path: 'servicedeliveryaddress.sublocation_id',
	    select: '_id  name'
	},
	{
	    path: 'partner_id',
	    select: '_id  info.name'
	}]

	async.waterfall([
			// get user by area and time
			function (userNextFunc) {
				var searchUser = {};
				searchUser.role = "serviceagent"; // as now added for 
				// if time is before 4:30 PM {day:true}
				if(data.time <= 990){					
					searchUser["provider_id"] = req.user.provider_id._id;
					searchUser["availability.day"] = true;
					searchUser["availability.morningareas"] = {$in:[data.area_id]};
				}
				// if time is after 4:30 PM {evening:true}
				else{										
					searchUser["provider_id"] = req.user.provider_id._id;
					searchUser["availability.evening"] = true;
					searchUser["availability.eveningareas"] = {$in:[data.area_id]};					
				}
				searchUser["_Deleted"] = false;
				Model.find(searchUser, {profile:1}, {lean:true}, function (err, resultUser) {
					if (err) res.json({ error: "Error while finding users: " + err});
					return userNextFunc(null,resultUser);
				})
			},

			//get wo/leave of the users for the date
			function (users, woNextFunc) {
				var searchWo = {};
				searchWo["requestdate"] = {$lte:data.date};
				searchWo["requesttodate"] = {$gte:data.date};
				searchWo["user_id"] = {$in:users};
				searchWo["status"] = 'accepted'
				
				// console.log(searchOrder);
				ModelWo.find(searchWo,{},{lean:true}, function (err, resultWo) {
					if (err) res.json({ error: "Error while finding userOrder: " + err});
					return woNextFunc(null,users, resultWo);
				});	
				//return woNextFunc(null,resultUser);
			},

			// function (users, wos, userWoNextFunc) {
			// 	var filteredUsers = [];
			// 	users.forEach(function (userObj) {
			// 		userObj.wos = [];
			// 		wos.forEach(function (woObj) {
			// 			if (userObj._id.toString() == woObj.user_id.toString()) userObj.wos.push(woObj);						
			// 		})
			// 		filteredUsers.push(userObj);
			// 	})
			// 	return userWoNextFunc(null, filteredUsers);	
			// },

			function (users, wos, userWoNextFunc) {
				var filteredUsers = users;

				
				if(wos)
				{
					

					for (var i = 0; i < wos.length; i++) {
						if(wos[i].requesttype == 'halfday')
						{
							if(wos[i].requesttime && wos[i].requesttotime)
							{
								if(wos[i].requesttime > data.time || data.time > wos[i].requesttotime)
								{
									wos.splice(i, 1);
								}
							}
						}
					}


					// users.forEach(function (userObj, userIndex) {
						
					// 	wos.forEach(function (woObj) {
					// 		if (userObj._id.toString() == woObj.user_id._id.toString())
					// 		{
					// 			filteredUsers.splice(userIndex, 1)
					// 		}						
					// 	})
					// })
					if(filteredUsers.length)
					{
						for (var i=0, count= filteredUsers.length; i < count; ) {
							_.find(wos, function (woObj) { 
								if(i < count)
								{
									if(filteredUsers[i]._id.toString() == woObj.user_id._id.toString())
									{
										filteredUsers.splice(i,1);
										count--;
									}
								}
							})
							i++;
						};
					}
				}



				return userWoNextFunc(null, filteredUsers);	
			},

			//get order of the users for the date
			function (users, orderNextFunc) {

				var searchOrder = {};
				searchOrder["fromdate"] = data.date;
				searchOrder["assignto"] = {$in:users};
				searchOrder["status"]= {$ne:"xyz"} ;   						// talat & burhan to include in search query for  indexing  
				searchOrder["provider_id"]=req.user.provider_id._id;
				
				ModelOrder.find(searchOrder,{client_id:1,assignto:1, fromtime:1, servicedeliveryaddress:1, partner_id: 1, status:1},{lean:true}, function (err, resultOrder) {
					if (err) res.json({ error: "Error while finding userOrder: " + err});
					return orderNextFunc(null,users, resultOrder);
				}).populate(populateQuery);	
			},

			//complete JSON structure
			function (users, orders, userOrderNextFunc) {
				var filteredUsers = [];
				users.forEach(function (userObj) {
					userObj.orders = [];
					orders.forEach(function (orderObj) {
						if (userObj._id.toString() == orderObj.assignto.toString()) userObj.orders.push(orderObj);						
					})
					filteredUsers.push(userObj);
				})
				return userOrderNextFunc(null, filteredUsers);	
			}
		],function (err, filteredUsers) {
			if (err) return next();
			return res.json({ response: {users:filteredUsers} });
		});
}