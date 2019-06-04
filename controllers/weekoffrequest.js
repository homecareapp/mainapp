var Model = require("../models/WeekOffRequest"),
    mongoose = require("mongoose"),
    mongoosePaginate = require("mongoose-paginate"),
    async = require("async");

var UserModel = require('../models/User');
var OrderModel = require('../models/Order');

var orderNewController = require('./order-new')

var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;

var populateList = [
    {
        path: 'log.updatedby',
        select: '_id profile.name profile.mobilenumber role'
    },
    {
        path: 'log.reason_id',
    }
]


exports.getList_old = function(req, res, next) {
    var search = {};
    var DateSort = req.query.date;
    var status = req.query.status;
    var option = {};
    var id = req.params.id;
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);

    if (req.query.fromdate && req.query.todate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(req.query.todate);
        // tdate.setDate(tdate.getDate() + 1);
        // tdate.setMilliseconds(tdate.getMilliseconds() - 1);

        // search["requestdate"] = {
        //     $gte: fdate,
        //     $lte: tdate
        // };
        search['$or'] = [
            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
        ];
    } else if (req.query.fromdate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(fdate);
        // tdate.setDate(tdate.getDate() + 1);
        // tdate.setMilliseconds(tdate.getMilliseconds() - 1);

        // search["requestdate"] = {
        //     $gte: fdate,
        //     $lte: tdate
        // };
        search['$or'] = [
            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
            { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
            { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
        ];
    }

    if (status) {
        search["status"] = req.query.status;

    }

    if (req.query.leavetype) {
        search["leavetype"] = req.query.leavetype;

    }

    //city_id
    //role
    //area_id
    //user_id

    if (req.user._id && req.user.role != "admin" && req.user.role != "hr") {
        search["user_id"] = req.user._id;
    }
    else
    {
        if(req.query.user_id)
        {
            var users = [];
            if (req.query.user_id) {
                users = req.query.user_id.split(',')
            }
            if(users.length)
            {
                for(var i=0;i<users.length;i++)
                {
                    users[i] = mongoose.Types.ObjectId(users[i]);
                }
                search["user_id"] = {
                    $in: users
                }
            }
        }
    }

        

    //
    var searchUser = {}
    if(req.query.city_id)
    {
        //find users with respective city_id
        searchUser["city_id"] = req.query.city_id
    }

    if(req.query.role)
    {
        //find users with respective role
        searchUser["role"] = req.query.role
    }

    if(req.query.area_id)
    {
        //find users with respective role
        var areas = [];
        if (req.query.area_id) {
            areas = req.query.area_id.split(',')
        }
        if(areas.length)
        {
            for(var i=0;i<areas.length;i++)
            {
                areas[i] = mongoose.Types.ObjectId(areas[i]);
            }
            searchUser["area_id"] = {
                $in: areas
            }
        }
    }


    //
    if (!id) {
        if (!req.query.page) {
            // console.log(search);
            Model.find(search, function(err, result) {
                if (err) {
                    return next(err);
                }
                res.json({
                    response: result
                });
            });
        } else {

            Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return next(error);
                }
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });

        }
    } else {
        Model.findById(id, function(error, result) {
            if (error) {
                return next(error);
            }
            res.json({
                response: result
            });
        });
    }

}

exports.getList = function(req, res, next) {
    var search = {};
    var option = {};
    var id = req.params.id;
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);

    async.waterfall([
        function(nextfun) {
            if (req.query.fromdate && req.query.todate) {
                var fdate = new Date(req.query.fromdate);
                var tdate = new Date(req.query.todate);
                // tdate.setDate(tdate.getDate() + 1);
                // tdate.setMilliseconds(tdate.getMilliseconds() - 1);

                // search["requestdate"] = {
                //     $gte: fdate,
                //     $lte: tdate
                // };
                search['$or'] = [
                    { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
                    { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                    { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                    { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
                ];
            } else if (req.query.fromdate) {
                var fdate = new Date(req.query.fromdate);
                var tdate = new Date(fdate);
                // tdate.setDate(tdate.getDate() + 1);
                // tdate.setMilliseconds(tdate.getMilliseconds() - 1);

                // search["requestdate"] = {
                //     $gte: fdate,
                //     $lte: tdate
                // };
                search['$or'] = [
                    { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
                    { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                    { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                    { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
                ];
            }

            if (req.query.status) {
                search["status"] = req.query.status;
            }

            if (req.query.leavetype) {
                search["leavetype"] = req.query.leavetype;
            }

            if (req.user._id && req.user.role != "admin" && req.user.role != "hr") {
                search["user_id"] = req.user._id;
            }
            else
            {
                if(req.query.user_id)
                {
                    var users = [];
                    if (req.query.user_id) {
                        users = req.query.user_id.split(',')
                    }
                    if(users.length)
                    {
                        for(var i=0;i<users.length;i++)
                        {
                            users[i] = mongoose.Types.ObjectId(users[i]);
                        }
                        search["user_id"] = {
                            $in: users
                        }
                    }
                }
            }
            return nextfun(null);
        },
        function(nextfun) {
            if(req.query.user_id) return nextfun(null);
            //search user
            var searchUser = {}
            searchUser['$or'] = [];
            if(req.query.city_id)
            {
                //find users with respective city_id
                searchUser["profile.city_id"] = req.query.city_id
            }

            if(req.query.role)
            {
                //find roles with respective role
                var roles = [];
                if (req.query.role) {
                    roles = req.query.role.split(',')
                }
                if(roles.length)
                {
                    searchUser["role"] = {
                        $in: roles
                    }
                }
            }

            if(req.query.area_id)
            {
                //find users with respective role
                var areas = [];
                if (req.query.area_id) {
                    areas = req.query.area_id.split(',')
                }
                if(areas.length)
                {
                    for(var i=0;i<areas.length;i++)
                    {
                        areas[i] = mongoose.Types.ObjectId(areas[i]);
                    }
                    // searchUser["availability.morningareas"] = {
                    //     $in: areas
                    // }
                    searchUser['$or'].push( {'availability.morningareas': {$in: areas}} )
                    searchUser['$or'].push( {'availability.eveningareas': {$in: areas}} )

                }
            }

            if(req.query.name)
            {
                searchUser['$or'].push({'profile.name': new RegExp(req.query.name, 'i')})
                searchUser['$or'].push({'profile.code': new RegExp(req.query.name, 'i')})
                searchUser['$or'].push({'username': new RegExp(req.query.name, 'i')})
                searchUser['$or'].push({'profile.mobilenumber': new RegExp(req.query.name, 'i')})
            }
            
            if(req.query.city_id || req.query.role || req.query.area_id || req.query.name)
            {
                if(!searchUser['$or'].length)
                {
                    delete searchUser['$or'];
                }
                searchUser["_Deleted"] = false;
                UserModel.find(searchUser, function(err, result) {
                    if (err) return next(new Error(err));
                    search["user_id"] = {
                        $in: result
                    }
                    return nextfun(null);
                })
            }
            else
            {
                return nextfun(null);
            }
        },        
    ],function(error) {
        var sort = 1;
        var sortfield = "requestdate";
        if (req.query.sort) {
            if (req.query.sort == "asc") {
                sort = 1;
            } else {
                sort = -1;
            }
        }
        option.sortBy = {};
        option.sortBy[sortfield] = sort;

        if (!id) {
            if (!req.query.page) {
                // console.log(search);
                Model.find(search,{},{ sort: { requestdate: sort } }, function(err, result) {
                    if (err) {
                        return next(err);
                    }
                    res.json({
                        response: result
                    });
                }).populate(populateList);
            } else {
                option.populate = populateList;
                Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                    if (error) {
                        return next(error);
                    }
                    res.json({
                        response: paginatedResults,
                        pageCount: pageCount,
                        itemCount: itemCount
                    });
                });

            }
        } else {
            Model.findById(id, function(error, result) {
                if (error) {
                    return next(error);
                }
                res.json({
                    response: result
                });
            }).populate(populateList);
        }
    })
}

exports.add = function(req, res, next) {
    var id = req.params.id;
    var message = [];
    var errormessage = []

    var data = req.body;
    if(!data.leavetype) return next(new Error('Type required'))
    if(!data.user_id) return next(new Error('user required'))
    if(!data.requestdate) return next(new Error('request date required'))
    if(!data.requesttodate) return next(new Error('request to date required'))
    if(!data.requesttype) return next(new Error('request type required'))

    if(!data.logobj) return next(new Error('log required'))

    if(data.requesttype == 'halfday')
    {
        if(!data.requesttime) return next(new Error('request from time required'))
        if(!data.requesttotime) return next(new Error('request to time required'))
    }

    if(!Array.isArray(data.user_id)) data.user_id = [data.user_id];

    var userids = data.user_id;
    async.waterfall([
        // function(nextfunc) {

        //     //weekof to currentmonth ka 5-10
        //     //currentmont 16 se nextmont ka 15
        //     if(data.leavetype == 'weekoff')
        //     {
        //         if(req.user.role == "admin" || req.user.role == "hr")
        //         {
        //             return nextfunc(null)
        //         }
        //         var currentdate = moment().tz(TIMEZONE).startOf('day').format('D');

        //         if(currentdate >= 5 && currentdate <= 10)
        //         {
        //             var requestdate = new Date(moment(data.requestdate).tz(TIMEZONE).startOf('day'));
        //             var currentMonth16= new Date(moment().tz(TIMEZONE).startOf('month').add(15, 'days'));
        //             var nextMonth15= new Date(moment().tz(TIMEZONE).startOf('month').add(1, 'months').add(14, 'days').endOf('day'));
        //             if(requestdate >= currentMonth16 && requestdate <= nextMonth15)
        //             {
        //                 return nextfunc(null)
        //             }
        //             else
        //             {
        //                 return next(new Error('not allowed for this month'))
        //             }

        //             // var isBetween = moment(requestdate).isBetween(currentMonth16, nextMonth15);
        //             // if(!isBetween)
        //             // {
        //             //     return next(new Error('not allowed for this month'))
        //             // }
        //             // else
        //             // {
        //             //     return nextfunc(null)
        //             // }
        //         }
        //         else
        //         {
        //             return next(new Error('not allowed request date expired'))
        //         }
        //     }
        //     else
        //     {
        //         return nextfunc(null)
        //     }
        // },

        function(nextfunc) {

            //weekof to currentmonth ka 5-10
            //currentmont 16 se nextmont ka 15
            if(data.leavetype == 'weekoff')
            {
                if(req.user.role == "admin" || req.user.role == "hr")
                {
                    return nextfunc(null)
                }
                var requestdate = new Date(moment(data.requestdate).tz(TIMEZONE).startOf('day'));
                var currentMonth16= new Date(moment().tz(TIMEZONE).startOf('month').add(15, 'days'));
                var nextMonth15= new Date(moment().tz(TIMEZONE).startOf('month').add(1, 'months').add(14, 'days').endOf('day'));
                if(requestdate >= currentMonth16 && requestdate <= nextMonth15)
                {
                    if(req.user.role == "admin" || req.user.role == "hr")
                    {
                        return nextfunc(null)
                    }
                    else
                    {
                        var currentdate = moment().tz(TIMEZONE).startOf('day').format('D');
                        if(currentdate >= 5 && currentdate <= 10)
                        {
                            return nextfunc(null)
                        }
                        else
                        {
                            errormessage.push('not allowed request date expired')
                            return nextfunc(new Error('not allowed request date expired'))
                        }
                    }
                }
                else
                {
                    errormessage.push('not allowed for this month')
                    return nextfunc(new Error('not allowed for this month'))
                }
            }
            else
            {
                return nextfunc(null)
            }
        },
        function(nextfunc) {
            async.each(userids, function (user_id, nextrow) {
                var selectedUser = {};
                if(typeof user_id == 'object')
                {
                    user_id = user_id._id;
                }
                var getUser = function(nextf)
                {
                    UserModel.findById(user_id, function(err, result) {
                        selectedUser = result;
                        return nextf(null);
                    })
                }
                    

                var checkVisits = function(nextf)
                {
                    if(data.status == "rejected") return nextf(null)
                    var search = {};
                    search["status"] = {$ne:"rejected"};
                    var fdate = new Date(data.requestdate);
                    var tdate = new Date(data.requesttodate);


                    if(selectedUser.role == 'logistic')
                    {
                        search['logistic.pickupdate'] = { $gte: fdate, $lte: tdate };
                        if(data.requesttype == 'halfday')
                        {
                            var ftime = data.requesttime;
                            var ttime = data.requesttotime;
                            search['fromtime'] = { $gte: ftime, $lte: ttime };
                        }
                        search['logistic.logistic_id'] = user_id;
                    }
                    else
                    {
                        search['fromdate'] = { $gte: fdate, $lte: tdate };
                        if(data.requesttype == 'halfday')
                        {
                            var ftime = data.requesttime;
                            var ttime = data.requesttotime;
                            search['fromtime'] = { $gte: ftime, $lte: ttime };
                        }
                        search['assignto'] = user_id;
                    }

                    OrderModel.find(search, function(err, result) {
                        //if(result.length) return next(new Error("Visit already assigned for selected date for selected few users"));
                        if(result.length) 
                        {
                            if(selectedUser.role == 'logistic')
                            {
                                message.push("Visit already assigned for selected date for logistic "+ selectedUser.profile.name)
                            }
                            else
                            {
                                message.push("Visit already assigned for selected date for "+ selectedUser.profile.name)
                            }
                            return nextf(new Error("Visit already assigned for selected date for selected few users"));
                            
                        }

                        return nextf(null)
                    })
                }

                var checkOverlap = function(nextf){
                    var search = {};
                    //data.leavetype == weekoff if role is not admin then they can apply only 2 request between 16 of current month to 15 of next month
                    var currentDate = new Date();
                    var currentMonth16= new Date(moment().tz(TIMEZONE).startOf('month').add(15, 'days'));
                    var nextMonth15= new Date(moment().tz(TIMEZONE).startOf('month').add(1, 'months').add(14, 'days').endOf('day'));
                    search["status"] = {$ne:"rejected"}

                    var fdate = new Date(data.requestdate);
                    var tdate = new Date(data.requesttodate);
                    // tdate.setDate(tdate.getDate() + 1);
                    // tdate.setMilliseconds(tdate.getMilliseconds() - 1);

                    search['$or'] = [
                        { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }},
                        { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                        { 'requestdate': { $gte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $gte: tdate }},
                        { 'requestdate': { $lte: fdate, $lte: tdate },'requesttodate': { $gte: fdate, $lte: tdate }}
                    ];

                    
                    search["user_id"] = user_id;

                    if(id)
                    {
                        search["_id"] = {$ne:id}
                    }
                    var overlap = false;
                    Model.find(search, function(err, result) {
                        if (err) {
                            return next(err);
                        }
                        if(result.length)
                        {
                            overlap = true;
                        }
                        return nextf(null, overlap)
                    })
                }

                var checkWeekOff = function(overlap, nextf){
                    //if(overlap) return next(new Error("leave/wo already registered for selected date for selected few users"));
                    if(overlap)
                    {
                        
                            message.push("leave/wo already registered for selected date for "+ selectedUser.profile.name)
                            return nextf(new Error("leave/wo already registered for selected date for few selected users"));
                    
                    }
                    
                    var createReq = false;
                    if(data.leavetype == 'weekoff')
                    {
                        if(!id)
                        {

                            var maxWeekOffCount = 4;
                            var maxWeekOffUserCount = 2;

                            var search = {};
                            
                            search["status"] = {$ne:"rejected"}

                            
                            var currentMonth16= new Date(moment().tz(TIMEZONE).startOf('month').add(15, 'days'));
                            var nextMonth15= new Date(moment().tz(TIMEZONE).startOf('month').add(1, 'months').add(14, 'days').endOf('day'));
                            search["leavetype"] = data.leavetype
                        
                            search['$or'] = [
                                { 'requestdate': { $gte: currentMonth16, $lte: nextMonth15 },'requesttodate': { $gte: currentMonth16, $lte: nextMonth15 }},
                                { 'requestdate': { $lte: currentMonth16, $lte: nextMonth15 },'requesttodate': { $gte: currentMonth16, $gte: nextMonth15 }},
                                { 'requestdate': { $gte: currentMonth16, $lte: nextMonth15 },'requesttodate': { $gte: currentMonth16, $gte: nextMonth15 }},
                                { 'requestdate': { $lte: currentMonth16, $lte: nextMonth15 },'requesttodate': { $gte: currentMonth16, $lte: nextMonth15 }}
                            ];
                            

                            if(typeof user_id == 'object')
                            {
                                user_id = user_id._id;
                            }
                            search["user_id"] = user_id;

                            Model.find(search, {}, {lean:true}, function(err, result) {
                                var count = 0;
                                var adminCount = 0;
                                var userCount = 0;
                                if (err) {
                                    return next(err);
                                }
                                result.forEach(function(obj){
                                    if(obj.createdby.role != "admin")
                                    {
                                        userCount += 1;
                                    }
                                    else
                                    {
                                        adminCount += 1;
                                    }
                                })
                                if(result.length)
                                {
                                     count = result.length;
                                }

                                if(count < maxWeekOffCount)
                                {
                                    if(req.user.role == "admin" || req.user.role == "hr")
                                    {
                                        createReq = true;
                                        return nextf(null, createReq)
                                    }
                                    else
                                    {
                                        if(userCount < maxWeekOffUserCount)
                                        {
                                            createReq = true;
                                            return nextf(null, createReq)
                                        }
                                        else
                                        {
                                            message.push(maxWeekOffUserCount+" weekoff request already created for "+selectedUser.profile.name)
                                            return nextf(null, createReq)
                                        }
                                    }
                                }
                                else
                                {
                                    message.push(maxWeekOffCount+" weekoff request already created for "+selectedUser.profile.name)
                                    return nextf(null, createReq)
                                }
                                
                                
                            }).populate([
                                {path: 'createdby',select: '_id profile.name profile.mobilenumber role'}
                            ])
                        }
                        else
                        {
                            createReq = true;
                            return nextf(null, createReq)
                        }
                    }

                    else
                    {
                        createReq = true;
                        return nextf(null, createReq)
                    }
                }

                async.waterfall([getUser, checkVisits, checkOverlap, checkWeekOff],function (err, createReq) {
                    if(err) return nextrow();
                    if(createReq)
                    {
                        if(!id)
                        {
                            if(req.user.role == "admin" || req.user.role == "hr")
                            {
                                data.status = 'accepted'
                            }
                            data.user_id = user_id;
                            data.createdby = req.user._id;
                            data.createdbyrole = req.user.role;
                            data.createddatetime = Date.now();

                            data.log = []
                            if(!data.logobj) data.logobj = {};
                            data.logobj.updatedby = req.user._id
                            data.logobj.updateddatetime = Date.now();
                            data.logobj.comment = "request created"

                            data.log.push(data.logobj);
                            delete data.logobj;

                            var weekoffrequest = new Model(data);
                            weekoffrequest.save(function(error, result) {
                                if(error) return next(error);
                                return nextrow();
                            });
                        }
                        else
                        {
                            Model.findById(id, function(error, result) {
                                if (error) {
                                    return next(error);
                                };

                                var oldObj = 
                                {
                                    user_id: result.user_id._id.toString(),
                                    requestdate: result.requestdate,
                                    requesttodate: result.requesttodate,
                                    leavereason: result.leavereason,
                                    status: result.status,
                                    type: result.type,
                                    leavetype: result.leavetype,
                                    requesttype: result.requesttype,
                                    requesttime: result.requesttime,
                                    requesttotime: result.requesttotime,
                                }

                                var newObj = 
                                {
                                    user_id: (typeof user_id == 'object')? user_id._id: user_id,
                                    requestdate: data.requestdate,
                                    requesttodate: data.requesttodate,
                                    leavereason: data.leavereason,
                                    status: data.status,
                                    type: data.type,
                                    leavetype: data.leavetype,
                                    requesttype: data.requesttype,
                                    requesttime: data.requesttime,
                                    requesttotime: data.requesttotime,
                                }

                                var newOldArr = orderNewController.getOldNewLogArray(oldObj, newObj)
                                var oldArr = newOldArr.oldArr;
                                var newArr = newOldArr.newArr;

                                if(!data.logobj) data.logobj ={}

                                data.logobj["new"] = newArr;
                                data.logobj["old"] = oldArr;


                                result.user_id = user_id;
                                result.requestdate = data.requestdate;
                                result.requesttodate = data.requesttodate;
                                result.leavereason = data.leavereason;
                                result.status = data.status;
                                result.type = data.type;
                                result.leavetype = data.leavetype;
                                result.requesttype = data.requesttype;
                                result.requesttime = data.requesttime;
                                result.requesttotime = data.requesttotime;

                                data.logobj.updatedby = req.user._id
                                data.logobj.updateddatetime = Date.now();

                                if(data.status == 'rejected')
                                    data.logobj.comment = "request cancelled";
                                else
                                    data.logobj.comment = "request edited"
                                

                                if(!result.log)
                                {
                                    result.log=[];
                                }
                                if(newArr.length)
                                {
                                    result.log.push(data.logobj);
                                }
                                delete data.logobj;
                                

                                // result.createdby = req.user._id;
                                // result.createdbyrole = req.user.role;
                                // result.createddatetime = Date.now();

                                result.save(function(error, result) {
                                    if (error) return next(error);
                                    return nextrow();
                                });
                            });
                            
                        }
                    
                    }
                    else
                        return nextrow()
                    
                });

                

                
            },function (error) {
                if(error) return nextFunc(error);
                return nextfunc(null)
            });
        },        
    ],function(error) {
        //if(error) return next(error);

        if(!id)
        {
            res.json({
                response: "request saved",
                message: message,
                errormessage: errormessage
            }); 
        }
        else
        {
            Model.findById(id, function(error, result) {
                res.json({
                    response: result,
                    message: message,
                    errormessage: errormessage
                });                   
            }).populate(populateList);
            
        }
    })
}

exports.addWOList = function(req, res, next) {
    if (req.user.provider_id)
        if (!req.user.provider_id._id)
            return next(new Error("No Provider Assigned To This User"))
    var data = req.body
    var errorLogs = []
    var counter = -1
    var counterObj = {
        updateCount: 0,
        errorCount: 0,
        insertCount: 0
    }
    if (!data.length) return next(new Error("Data Not Present To Add Or Update"))
    async.each(data, function(user, nextUser) {
        counter++
        var searchUser = {}
        searchUser["provider_id"] = req.user.provider_id._id
        searchUser["user_id"] = user.user_id
        searchUser["requestdate"] = user.requestdate
        var query = searchUser;
        var update = {};

        update["provider_id"] = req.user.provider_id._id
        if (!user.user_id) {
            counterObj.errorCount++
                errorLogs.push("UserId Not Present For ObjectCount " + counter)
            return nextUser()
        }
        update["user_id"] = user.user_id
        update["requestdate"] = user.requestdate
        update["reason"] = user.reason
        update["status"] = user.status
        update["type"] = user.type
        update["month"] = user.month
        update["year"] = user.year
        var option = {}
        Model.findOneAndUpdate(searchUser, update, option, function(error, result) {
            if (error) {
                errorLogs.push(error)
                counterObj.errorCount++
                    return nextUser()
            }
            if (result == null) {
                var addObj = new Model(update)
                addObj.save(function(error, result) {
                    if (error) {
                        counterObj.errorCount++
                            errorLogs.push(error)
                        return nextUser()
                    }
                    counterObj.insertCount++
                        return nextUser()
                })
            } else {
                counterObj.updateCount++
                    return nextUser()
            }
        });
    }, function(error) {
        if (error) {
            counterObj.errorCount++
                errorLogs.push(error)
        }
        res.json({
            response: counterObj,
            errorLogs: errorLogs
        })
    })
}
