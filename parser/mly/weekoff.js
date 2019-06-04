var WOModel = require("../../models/WeekOffRequest"),
    UserModel = require("../../models/User"),
    mongoose = require("mongoose"),
    mongoosePaginate = require("mongoose-paginate"),
    async = require("async");
    moment = require("moment");
    _ = require("lodash");

function getLoad (totalWO, totaldays) {
  var runningcount = 0;
  var resultArray = [];
  for (var i = totaldays - 1; i >= 0; i--) {
    resultArray.push({
      index:i,
      load:0
    });
  };

  while(runningcount < totalWO){
    for (var i = resultArray.length - 1; i >= 0; i--) {
      resultArray[i].load++;
      runningcount++;
      if(runningcount == totalWO)
        break;
    };
  };
  return resultArray;
};

function isBestUser(expectedDiff,dateObj,user){
    if(!user.dates.length)
        return true;
    var dates = _.sortByOrder(user.dates,['date'],['desc']);
    //var diff = dateObj.date.diff( dates[0].date ,'days');
    
    var valid = true;
    for (var i = dates.length - 1; i >= 0; i--) {
        var diff = dateObj.date.diff( dates[i].date ,'days');
        if(diff < 0 ){
            diff*= -1;
        }
        if(diff < expectedDiff){
            valid = false;
            break;
        }
    };
    return valid;

    
    // var randomGaps = [expectedDiff+ 1,expectedDiff - 1]
    // var randomExpectedDiff = _.shuffle(randomGaps)[0];

    // if(diff > expectedDiff)
    //     return true;
}

function getDateIndex (date, dates) {
    // console.log(dates);
    for (var i = 0; i < dates.length; i++) {
        if (moment(dates[i].date).diff(date, 'days') == 0)
            return i;
    };
}

function getDateParam (currentmonth, startdate,enddate) {
    var nextMonth = 0, year = moment().year();
    
    if (currentmonth != 11)
        nextMonth = parseInt(currentmonth) + 1;
    else if(currentmonth == 11){
        year++ //next year incase of december
    }
    
    var dateParams = {
        startDate:moment().month(parseInt(currentmonth)).date(startdate),
        endDate:moment([year]).month(parseInt(nextMonth)).date(enddate),
        noOfDays:moment([year]).month(parseInt(nextMonth)).date(enddate).diff(moment().month(parseInt(currentmonth)).date(startdate),'days')
    }
    
    return dateParams;
     
}

exports.getWO = function(req, res, next) {
    var totalWOPerUser = 4;
    var totalSundayWOPercentage = 0.3;
    var startDate = 17;
    var endDate = 18;
    var month = req.params.month;
    var dateParams = getDateParam(month,startDate,endDate), loop = 0;
    //Total weekoffs in a period to per user.
    // var dummyUser = [ { _id: "55f03a8e9dd4b89c1a10af2d", name: undefined, sundayleave: undefined, dates: [], woCount: 0, index: 0, descDates: [] }, { _id: "565c4cd3746849a44713df50", name: 'callcenter', dates: [], woCount: 0, index: 1, descDates: [] }, { _id: "565c4e27746849a44713df51", name: 'mobile', dates: [], woCount: 0, index: 2, descDates: [] }, { _id: "566c2cfce7cd6c9c0343fed4", name: 'Arbaz', dates: [], woCount: 0, index: 3, descDates: [] }, { _id: "55f69443e2b569110086cb05", name: 'Admin', sundayleave: true, dates: [ ], woCount: 2, index: 4, descDates: [  ], gap: 13 }, { _id: "56554fb5a9907511001c1721", name: 'Prashant', dates: [  ], woCount: 1, index: 5, descDates: [  ], gap: 18 }, { _id: "565844746ff8475440f469a3", name: 'New', sundayleave: true, dates: [], woCount: 0, index: 6, descDates: [] }, { _id: "5658503b6e5f8a684379543c", name: 'demp', sundayleave: true, dates: [], woCount: 0, index: 7, descDates: [] }, { _id: "56585c768e2c98924d98eb9d", name: 'add new sample', sundayleave: true, dates: [], woCount: 0, index: 8, descDates: [] }, { _id: "56596238e8298efa0c8b93e0", name: 'buser', sundayleave: true, dates: [], woCount: 0, index: 9, descDates: [] }, { _id: "565e9ad4b1cda14c12c8a87a", name: 'Delhi User', sundayleave: true, dates: [ ,  ], woCount: 2, index: 10, descDates: [ ,  ], gap: 6 }, { _id: "565e9b9db1cda14c12c8a87b", name: 'demo', sundayleave: true, dates: [], woCount: 0, index: 11, descDates: [] } ];
    // console.log(_.sortByOrder(dummyUser, ['gap'], ['desc']));
    // return res.json(_.sortByOrder(dummyUser, ['gap'], ['asc']))
    //var userX = {"_id":"565844746ff8475440f469a3","name":"New","sundayleave":true,"dates":[{"date":"2015-12-05T18:30:00.000Z","type":"assigned"},{"date":"2015-12-10T18:30:00.000Z","type":"assigned"}],"wocount":2};
    async.waterfall([
        //get dates
        function (nextFunction) {
            var monthDates = {
                dates: [],
                checkPoints:{
                    totalSundays:0,
                    totalDays:0,
                    totalWO:0,
                    totalAssignedWO:0
                }
            },dateObj = {};
            while(loop<dateParams.noOfDays){
                
                console.log(loop);
                dateObj = {}
                dateObj.date = moment(dateParams.startDate).utc().add(parseInt(loop),'days');
                // dateObj.date.set('hour', 18);
                // dateObj.date.set('minute', 30);
                // dateObj.date.set('second', 00);
                // dateObj.date.set('millisecond', 000);
                dateObj.day = dateObj.date.format("ddd");
                dateObj.dayIndex = dateObj.date.day();

                if(dateObj.dayIndex == 0) monthDates.checkPoints.totalSundays ++;
                dateObj.index = loop;
                loop++;
                dateObj.assignedWO = 0;
                monthDates.dates.push(dateObj);
                
            };
            monthDates.checkPoints.totalDays = monthDates.dates.length;
            // console.log(monthDates)
            return nextFunction(null,monthDates)
        },
        //get users
        function (monthDates, nextFunction) {
            var userSearch = {} // ToDo: Define search for only active phlebo 
            var userList = [], userObj = {}, i = 0; 
            var columns = 'profile.name availability.sundayleave'
            UserModel.find(userSearch,columns,{lean:true},function (err, users) {
                if(err) return next();
                users.forEach(function (user) {
                    userObj = {};
                    userObj._id = user._id;
                    userObj.name = user.profile.name;
                    if(user.availability)
                        userObj.sundayleave = user.availability.sundayleave;
                    userObj.dates = [];
                    userObj.assignedWO = 0;
                    userObj.assignedSundayWO = 0;
                    userObj.index = i;
                    i++;
                    userList.push(userObj);    
                })                
                return nextFunction(null,monthDates, userList)
            })            
            
        },
        function(monthDates,users,nextFunction){
            //assignment of requested wos
            var woSearch = {
                requestdate :{
                    $gte:monthDates.dates[0].date.toDate(),
                    $lte:monthDates.dates[monthDates.dates.length-1].date.toDate()
                }
            }
            var option = {
                sort:{requestdate:1}
            }

            WOModel.find(woSearch,'',option,function(e,woRequests){
                if(e) return nextFunction(e);

                users.forEach(function (user) {
                    woRequests.forEach(function (woObj) {
                        //If WO found for User
                        if(woObj.user_id._id.equals(user._id)){
                            user.dates.push({
                                type:'requested',
                                date:moment.utc(woObj.requestdate),
                                day:moment(woObj.requestdate).format("ddd")
                            });
                            user.assignedWO++; //increament total WO count
                            if(user.assignedWO <= totalWOPerUser){
                                monthDates.checkPoints.totalAssignedWO++;
                                var i = getDateIndex(moment.utc(woObj.requestdate),monthDates.dates)
                                if(i)
                                    monthDates.dates[i].assignedWO ++; 
                            }else{
                                if(!user.excludedFromTotalWO){
                                    monthDates.checkPoints.totalAssignedWO = monthDates.checkPoints.totalAssignedWO - totalWOPerUser;
                                }
                                user.excludedFromTotalWO = true;
                            }
                        }
                    }) 
                })
                return nextFunction(null,monthDates,users)
            })
        },
        function(monthDates,users,nextFunction){
            //get loads for sunday and other days
            var excluded = _.filter(users,{'excludedFromTotalWO':true}).length;

            monthDates.checkPoints.totalWO = ( users.length - excluded ) * totalWOPerUser;
            var sundayWOs = Math.round(monthDates.checkPoints.totalWO * totalSundayWOPercentage)
            var sundayWOLoad = getLoad(sundayWOs,monthDates.checkPoints.totalSundays)
            var otherDaysWOLoad = getLoad(monthDates.checkPoints.totalWO - sundayWOs,monthDates.checkPoints.totalDays - monthDates.checkPoints.totalSundays)
            var userMaxSunday = getLoad(sundayWOs,users.length)
            var overAllMaxLoad = Math.ceil( monthDates.checkPoints.totalWO/monthDates.checkPoints.totalDays );
            var overAllMinLoad = Math.floor( monthDates.checkPoints.totalWO/monthDates.checkPoints.totalDays );
            monthDates.checkPoints.overAllMaxLoad = overAllMaxLoad;
            monthDates.checkPoints.overAllMinLoad = overAllMinLoad; 
            monthDates.checkPoints.otherDaysWOLoad = _.mapValues(_.groupBy(otherDaysWOLoad,function(n){return n.load}),function(n){ return n.length});
            monthDates.checkPoints.sundayWOLoad = _.mapValues(_.groupBy(sundayWOLoad,function(n){return n.load}),function(n){ return n.length});
            monthDates.checkPoints.userMaxSundayLoad = _.mapValues(_.groupBy(userMaxSunday,function(n){return n.load}),function(n){ return n.length});;

            var sundays = _.filter(monthDates.dates,{ 'dayIndex': 0 })
            var otherDays = _.filter(monthDates.dates,function(d){ return d.dayIndex != 0 });
            
            //To assign maxSundayLoad to users
            for (var i = users.length - 1; i >= 0; i--) {
                users[i].maxSundayLoad = userMaxSunday[i].load;
            };

            for (var i = sundays.length - 1; i >= 0; i--) {
                monthDates.dates[sundays[i].index].maxLoad = sundayWOLoad[i].load;
            };
            
            //otherDaysWOLoad = _.shuffle(otherDaysWOLoad);
            for (var i = otherDays.length - 1; i >= 0; i--) {
                monthDates.dates[otherDays[i].index].maxLoad = otherDaysWOLoad[i].load;
            };
            return nextFunction(null,monthDates,users);
        },
        function (monthDates,users,nextFunction){
            
            monthDates.dates.forEach(function(d){
                var temp = 0;
                var bestUserAvailable = true;
                var averageDiff = Math.floor(monthDates.checkPoints.totalDays / totalWOPerUser);
                while(bestUserAvailable && d.assignedWO < d.maxLoad && monthDates.checkPoints.totalAssignedWO < monthDates.checkPoints.totalWO){
                    temp++;
                    for (var i = users.length - 1; i >= 0; i--) {

                        if(users[i].assignedWO >= totalWOPerUser)
                            continue;
                        if(!isBestUser(averageDiff,d,users[i]))
                            continue;
                        if(users[i].maxSundayLoad <= users[i].assignedSundayWO && d.dayIndex == 0)
                           continue;

                        users[i].dates.push({
                            type:'assigned',
                            date:d.date,
                            day:d.day,
                            index:d.index,
                            dayIndex:d.dayIndex
                        })
                        monthDates.checkPoints.totalAssignedWO++;
                        users[i].assignedWO++;
                        d.assignedWO++;
                        if(d.dayIndex == 0){
                            users[i].assignedSundayWO++;
                        }
                        if(d.assignedWO == d.maxLoad)
                            break;
                    };

                    averageDiff --;
                    if(averageDiff <= 4)
                        bestUserAvailable = false;
                }
            })
            //users = _.shuffle(users);
            return nextFunction(null,monthDates,users);
        },
        function (monthDates, users, nextFunction) {
            var filteredUsers = _.filter(users,function(u){
                 return u.assignedWO < totalWOPerUser
            })
            filteredUsers.forEach(function(u){
                u.dates.forEach(function(d){
                    if(d.type == 'assigned'){
                        monthDates.checkPoints.totalAssignedWO --;
                        users[u.index].assignedWO --;
                        if(d.dayIndex == 0){
                            users[u.index].assignedSundayWO --;
                            monthDates.dates[d.index].assignedWO --;
                        }
                        _.remove(users[u.index].dates,function(e){
                            return e.index == d.index;
                        })
                        
                    }
                })
            })
            _.sortBy(monthDates.dates,function(n){ return n.dayIndex }).forEach(function(d){
                
                var bestUserAvailable = true;
                var averageDiff = Math.floor(monthDates.checkPoints.totalDays / totalWOPerUser);
                while(bestUserAvailable && ( ( d.assignedWO < monthDates.checkPoints.overAllMaxLoad && d.dayIndex !=0 ) || ( d.assignedWO < d.maxLoad && d.dayIndex == 0 ) ) && monthDates.checkPoints.totalAssignedWO < monthDates.checkPoints.totalWO){
                    for (var i = filteredUsers.length - 1; i >= 0; i--) {

                        if(users[ filteredUsers[i].index ].assignedWO >= totalWOPerUser)
                            continue;
                        if(!isBestUser(averageDiff,d,users[ filteredUsers[i].index ]))
                            continue;
                        if(users[ filteredUsers[i].index ].maxSundayLoad <= users[ filteredUsers[i].index ].assignedSundayWO && d.dayIndex == 0)
                           continue;

                        users[ filteredUsers[i].index ].dates.push({
                            type:'assigned',
                            date:d.date,
                            day:d.day,
                            index:d.index,
                            dayIndex:d.dayIndex
                        })

                        monthDates.checkPoints.totalAssignedWO++;
                        users[ filteredUsers[i].index ].assignedWO++;
                        d.assignedWO++;
                        if(d.dayIndex == 0){
                            users[ filteredUsers[i].index ].assignedSundayWO++;
                        }
                        if(d.assignedWO == monthDates.checkPoints.overAllMaxLoad)
                            break;
                    };
                    averageDiff --;
                    if(averageDiff <= 4)
                        bestUserAvailable = false;
                }
            })
            return nextFunction(null,monthDates, users)
            
        }
        
    ],
    //Final function
    function (e, monthDates, users) {
        return res.json({
            users:users,
            dates:monthDates
        });
    })
}

function getTotalOverLap (totalDays, totalWOForMonth) {
    var result = totalWOForMonth - totalDays;
    if (result < 0) result = 0;
    return result;
}

function getPerdayMaxLoad (totalDays, totalOverLap) {
    if (totalOverLap < totalDays && totalOverLap != 0) return 2;
    else if (totalOverLap == 0) return 1;
    else return Math.ceil(totalOverLap/totalDays);
}

function getPerdayMinLoad (totalDays, totalWO) {    
    if (totalWO < totalDays || totalWO == 0) return 1;
    else return Math.floor(totalWO/totalDays);
}
