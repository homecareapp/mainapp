var Model = require('../models/Partner');
var async = require("async")
var mongoose = require('mongoose');
var mongoosePaginate = require("mongoose-paginate");
var AreaModel = require("../models/Area");
var UserModel = require("../models/User");
var CityModel = require("../models/City");
var OrderModel = require("../models/Order");
var _ = require("lodash");
var globalTimeSlot = require("../data/timeSlot");
var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;

exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assign To This User"));

    var sort = (req.query.sort && req.query.sort != "asc") ? -1 : 1;

    var option = {
        "page": req.query.page,
        "limit": (req.query.limit) ? parseInt(req.query.limit) : null,
        "sortBy": {
            "info.name": sort,
        }
    }

    var advancesearch = {}
    var search = {};
    search["provider_id"] = req.user.provider_id._id;

    if (req.user.userinfo.partners) {
        // console.log(req.user.userinfo.partners.length);
        if (req.user.userinfo.partners.length > 0) {
            var tempArray = []
            async.eachSeries(req.user.userinfo.partners, function(partner, nextpartner) {
                tempArray.push(partner._id)
                return nextpartner()
            }, function(error) {
                search["_id"] = {
                    $in: tempArray
                }
            })
        }
    }

    if (req.query.partnertype) {

        if (req.user.userinfo.partners && req.user.userinfo.partners.length) {
            var tempArray = [];
            req.user.userinfo.partners.forEach(function(partObj) {
                if (req.query.partnertype == 'b2b') {
                    if (partObj.partnertype == 'b2b' || !partObj.partnertype) {
                        tempArray.push(partObj._id)
                        search["_id"] = {
                            $in: tempArray
                        }
                    }
                } else {
                    if (partObj.partnertype == 'b2c') {
                        tempArray.push(partObj._id)
                        search["_id"] = {
                            $in: tempArray
                        }
                    }
                }
            })
        } else {
            if (req.query.partnertype == 'b2b') {
                search['$or'] = [{
                    'partnertype': req.query.partnertype
                }, {
                    'partnertype': null
                }];
            } else {
                search["partnertype"] = req.query.partnertype;
            }
        }
    }

    /*if (req.query.name) {
        search["info.name"] = new RegExp(req.query.name, "i");
    };*/

    if (req.query.name) {
        search['$or'] = [{
            'info.name': new RegExp(req.query.name, 'i')
        }, {
            'info.code': new RegExp(req.query.name, 'i')
        }];
    }

    if (req.query.areasearch) {
        advancesearch['$or'] = [{
            'name': new RegExp(req.query.areasearch, 'i')
        }, {
            'pincodes': new RegExp(req.query.areasearch, 'i')
        }];
    };

    if (req.query.city_id) {
        search['info.city_id'] = req.query.city_id
    }

    if (req.query.active == "true") search["_Deleted"] = false;
    else if (req.query.active == "false") search["_Deleted"] = true;

    async.waterfall([
        /*
        [ if req.query.areasearch get all partners according to area]
         */
        function(nextfun) {
            if (req.query.areasearch) {
                AreaModel.find(advancesearch, '_id', function(error, result) {
                    if (error) return next(error);
                    return nextfun(null, result)
                })
            } else {
                return nextfun(null)
            }
        }
    ], function(error, result) {
        if (req.query.areasearch) {
            search["areas.area_id"] = {
                "$in": result
            }
        }
        if (!req.params.id) {
            if (req.query.page) {
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
            } else {
                search._Deleted=false
                Model.find(search, function(error, result) {
                    if (error) return next(error);
                    res.json({
                        response: result
                    });
                });
            }
        } else {
            partnerByID(req.params.id, function(err, result) {
                res.json({
                    response: result
                })
            });
        }
    })
};

function partnerList(search, next) {
    Model.find(search, function(err, result) {
        if (err) return next(new Error(err));
        next(null, result);
    })
}

function partnerByID(id, next) {
    Model.findById(id, function(err, result) {
        if (err) return next(new Error(err));
        return next(null, result);
    })
}


exports.add = function(req, res, next) {
    var data = req.body;
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    data["provider_id"] = req.user.provider_id._id
    var partner = new Model(data);
    partner.save(function(err, partner) {
        if (err) {
            return next(err)
        };
        return res.json(partner);
    })
};

exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assign To This User"));

    var id = req.params.id;
    var data = req.body;
    // console.log("id:" + req.params.id);

    Model.findById(id, function(err, partner) {
        // console.log("error:" + err);
        if (err) return next(err);
        if (!partner) return next(new Error("Partner not found."));
        partner.info = data.info;
        partner.partnertype = data.partnertype;
        partner.externalId = data.externalId;
        partner.reportdeliverymode = data.reportdeliverymode;
        partner.visitcharges = data.visitcharges;
        partner.areas = [];
        partner.areas = data.areas;
        partner.workinghour = data.workinghour;
        partner.droppoints = data.droppoints;
        partner.autoscheduling = data.autoscheduling;
        partner.autoschedulingtime = data.autoschedulingtime;
        partner.sharetubes = data.sharetubes;
        partner.provider_id = req.user.provider_id._id
        partner.paymentoptions = data.paymentoptions
        partner.discounts = data.discounts;
        partner._Deleted = data._Deleted;
        // console.log("after update object:" + partner);
        partner.save(function(err, result) {
            //console.log("partner:" + partner);
            if (err) return next(err);
            if (!result) return next(new Error("Result not found"));
            if (!result._id) return next(new Error("Result ID not found"));

            partnerByID(result._id, function(e, partnerRst) {
                if (e) return next(e);
                if(partnerRst._Deleted==true){
                    var searchUser = {};
                    searchUser["userinfo.partners"] = partnerRst._id;

                    UserModel.find(searchUser,null,{ lean: true }, function(error, users) {
                        if (error) return next(error);
                        if(users.length)
                        {    
                            async.each(users, function(user, nextrow) {
                                UserModel.findById({"_id":user._id}, function(error, userobj) {
                                    for (var i = 0; i < userobj.userinfo.partners.length; i++) {
                                        if(userobj.userinfo.partners[i]._id.toString() == partnerRst._id.toString() ){
                                            userobj.userinfo.partners.splice(i,1);
                                            userobj.save(function (e,r) {
                                                return nextrow()
                                            })
                                        }
                                    };    
                                    
                                })
                                
                            }, function(error) {
                                // console.log("error from client update");
                                if (error) return next(error)
                                return res.json(partnerRst);
                            })
                        }else
                        {
                            return res.json(partnerRst);
                        }
                        
                    })
                }
                else{
                    return res.json(partnerRst);
                }
            });
        })
    })
    
};

exports.updatearea = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assign To This User"));

    var id = req.params.id;
    var data = req.body;
    // console.log("id:" + req.params.id);

    Model.findById(id, function(err, partner) {
        // console.log("error:" + err);
        if (err) return next(err);
        if (!partner) return next(new Error("Partner not found."));

        partner.areas = [];
        partner.areas = data.areas;
        // console.log("after update object:" + partner);
        partner.save(function(err, result) {
            //console.log("partner:" + partner);
            if (err) return next(err);
            if (!result) return next(new Error("Result not found"));
            if (!result._id) return next(new Error("Result ID not found"));

            partnerByID(result._id, function(e, partnerRst) {
                if (e) return next(e);

                return res.json(partnerRst);
            });
        })
    })
};

function getGlobalTimeSlot() {
    return JSON.parse(JSON.stringify(globalTimeSlot));
}

//     [ advance search based on areas.name and areas.pincodes to find partner based on pincodes and area name ]

// function advancePartnerSearch(partnersearch, callback) {

// }

exports.avblSlot = function(req, res, next) {
    // availableTimeSlot(req.query, function(error, timeslot){
    //     if(error) return next(new Error(error));

    //     return res.json({
    //         response:timeslot
    //     });
    // });

    //fasting date and pp date are same and today
    // fasting date and pp date same and future
    // fasting date and pp date are diff and today
    // fasting date and pp date are diff and future

    var currentDate = moment().tz(TIMEZONE).startOf('day').toISOString();

    var params = req.query;
    if (params.fastingdate)
        var nextFastingDate = moment(params.fastingdate).tz(TIMEZONE).startOf('day').add(1, 'days').toISOString(); //add one day in fasting day
    var partnerCuttoff = 75 //in mins
    var ppCuttOff = 120 // in mins
    var providerCuttoff = 30 // in mins

    if (params.ppOrder && (!params.fastingtime || !params.fastingdate)) return next(new Error("ppOrder, fastingtime and fastingdate missing "));

    if (req.user.role == "partnerfrontoffice") {
        //if fasting order
        if (params.orderdate == currentDate && !params.ppOrder) params.time = parseInt(params.time) + partnerCuttoff

        //if todays PP order with same fastingdate   
        else if (params.ppOrder &&
            params.orderdate == params.fastingdate &&
            params.orderdate == currentDate) {

            if ((parseInt(params.fastingtime) < parseInt(params.time) && (parseInt(params.time) - parseInt(params.fastingtime)) < 120) ||
                (parseInt(params.fastingtime) > parseInt(params.time))) //fasting time is greater than current time
                params.time = parseInt(params.fastingtime) + ppCuttOff;

            else if (parseInt(params.fastingtime) < parseInt(params.time) && (parseInt(params.time) - parseInt(params.fastingtime)) > 120)
                params.time = parseInt(params.time) + partnerCuttoff;
        }
        //if Future PP order with same fastingdate  
        else if (params.ppOrder &&
            params.orderdate == params.fastingdate &&
            params.orderdate != currentDate)
            params.time = parseInt(params.fastingtime) + ppCuttOff;

        //if Future PP order with diff fastingdate  
        else if (params.ppOrder &&
            params.orderdate != params.fastingdate &&
            params.orderdate == currentDate)
            params.time = parseInt(params.time) + partnerCuttoff;

        //if Next day PP order from fastingdate  
        else if (params.ppOrder &&
            params.orderdate != params.fastingdate &&
            params.orderdate == nextFastingDate) {
            if (parseInt(params.fastingtime) + ppCuttOff > 1440) {
                var cut = (parseInt(params.fastingtime) + ppCuttOff) - 1440
                params.time = cut;
            } else {
                params.time = "0";
            }
            // params.time = parseInt(params.time) + partnerCuttoff;
        } else params.time = "0";
    } else {
        if (params.orderdate == currentDate && !params.ppOrder) params.time = parseInt(params.time) + providerCuttoff;

        //if todays PP order with same fastingdate   
        else if (params.ppOrder &&
            params.orderdate == params.fastingdate &&
            params.orderdate == currentDate) {

            if ((parseInt(params.fastingtime) < parseInt(params.time) && (parseInt(params.time) - parseInt(params.fastingtime)) < 120) ||
                (parseInt(params.fastingtime) > parseInt(params.time))) //fasting time is greater than current time
                params.time = parseInt(params.fastingtime) + ppCuttOff;

            else if (parseInt(params.fastingtime) < parseInt(params.time) && (parseInt(params.time) - parseInt(params.fastingtime)) > 120)
                params.time = parseInt(params.time) + providerCuttoff;
        }
        //if Future PP order with same fastingdate  
        else if (params.ppOrder &&
            params.orderdate == params.fastingdate &&
            params.orderdate != currentDate)
            params.time = parseInt(params.fastingtime) + ppCuttOff;

        //if Future PP order with diff fastingdate  
        else if (params.ppOrder &&
            params.orderdate != params.fastingdate &&
            params.orderdate == currentDate)
            params.time = parseInt(params.time) + providerCuttoff;

        //if Next day PP order from fastingdate  
        else if (params.ppOrder &&
            params.orderdate != params.fastingdate &&
            params.orderdate == nextFastingDate) {
            if (parseInt(params.fastingtime) + ppCuttOff > 1440) {
                var cut = (parseInt(params.fastingtime) + ppCuttOff) - 1440
                params.time = cut;
            } else {
                params.time = "0";
            }
            // params.time = parseInt(params.time) + providerCuttoff;
        } else params.time = "0";
    }

    params.time = lastSlotCheck(params.time);

    availableTimeSlot(params, function(error, timeslot) {
        if (error) return next(new Error(error));

        return res.json({
            response: timeslot
        });
    })
};

exports.avblSlotsAddress = function(params, next) {
    availableTimeSlot(params, function(error, timeslot) {
        if (error) return next(new Error(error));

        return next(null, timeslot);
    })
}

function lastSlotCheck(time) {
    switch (time) {
        case "1440":
            return "0";
        case "1470":
            return "30";
        default:
            return time;
    }
}

function availableTimeSlot(params, callback) {
    if (!params.partner_id) return callback("no partner_id found");
    if (!params.area_id) return callback("no area_id found");
    if (!params.day) return callback("no day found");
    if (!params.orderdate) return callback("no orderdate found");
    if (!params.time) return callback("no time found"); // cutoff time

    //params.addressid

    var partnerObj, orders, timeSlot = [],
        timeDuration = 30,
        tempTimeSlot = getGlobalTimeSlot();
    async.waterfall([
        //get partner object
        function(next) {
            Model.findById(params.partner_id, {}, { lean: true }, function(error, partner) {
                if (error) return callback(error);
                if (!partner) return callback("partner not found");

                partnerObj = partner;
                return next(null)
            })
        },
        //orders for the given date
        function(next) {
            var search = {
                fromdate: params.orderdate,
                status: { $ne: "Cancelled" },
                "servicedeliveryaddress.area_id._id": params.area_id,
                partner_id: params.partner_id
            }

            OrderModel.find(search, { fromtime: 1, status: 1, servicedeliveryaddress: 1, orderGroupId: 1 }, { lean: true }, function(error, orderList) {
                if (error) return callback(error);

                orders = orderList;
                return next(null);
            })
        },
        //timeslot based on area and workinghour
        function(next) {
            var areaSlot = _.find(partnerObj.areas, function(a) {
                return a.area_id._id == params.area_id;
            });
            var workinghours = [];

            partnerObj.workinghour.forEach(function(w) {
                var dayWH = _.find(w.day, function(d) { return d.toLowerCase() == params.day.toLowerCase(); })
                if (dayWH) {
                    // workinghours.push(w);
                    if (w.from < w.to) {
                        if ((w.from <= parseInt(params.time) && w.to >= parseInt(params.time)) || (w.from > parseInt(params.time)))
                            workinghours.push(w);
                    } else {
                        if ((w.from <= parseInt(params.time) && parseInt(params.time) <= 1380) || (0 <= parseInt(params.time) && parseInt(params.time) <= w.to))
                            workinghours.push(w);
                    }
                };
            });

            //making timeSlot array
            tempTimeSlot.forEach(function(t) {
                if ((t.time <= 1380 && parseInt(params.time) <= parseInt(t.time)) || (t.time <= 1380 && parseInt(params.time) <= (parseInt(t.time) + 30)))
                //if timeSlot already inserted
                    if (_.findIndex(timeSlot, function(ts) { return ts.time == t.time }) == -1) {

                    if (!areaSlot) areaSlot = { slots: [] };
                    //find slot count from slots array for the given time
                    var tempSlot = _.find(areaSlot.slots, function(s) {
                        return s.time == t.time;
                    });
                    if (tempSlot)
                        t.totalSlot = tempSlot[params.day.toLowerCase()]

                    // find working hours object of given time from working hours array
                    var i = _.find(workinghours, function(wh) {
                        if (wh.from < wh.to) return (wh.from <= t.time && wh.to >= t.time)
                        else return (wh.from <= t.time && t.time <= 1380) || (0 <= t.time && t.time <= wh.to)
                    });
                    if (i) timeSlot.push(t);
                }
            });
            return next(null);
        },
        //update timeslot with orders
        function(next) {

            function getMinMaxTime(whs) {
                var returnObj = {
                    min: 5000,
                    max: 0
                }
                whs.forEach(function(wh) {
                    if (wh.from < returnObj.min) returnObj.min = parseInt(wh.from);
                    if (wh.to > returnObj.max) returnObj.max = parseInt(wh.to);
                });

                return returnObj;
            }

            var minMax = getMinMaxTime(partnerObj.workinghour);

            var slotLength = timeSlot.length;
            // loop on timeslot
            timeSlot.forEach(function(ts, slotIndex) {
                //loop for time subSlots
                ts.subSlots = [];
                var subSlot = ts.time;
                var index = 0;
                for (var index = 0; index < 2; index++) { //ToDo: How many time the loop is required
                    subSlot = parseInt(ts.time) + index * timeDuration
                    if (subSlot >= parseInt(params.time))
                        ts.subSlots.push(subSlot.toString());
                    if (slotIndex === (slotLength - 1)) {
                        if (!(minMax.min == 0 && minMax.max == 1380)) {
                            index = 2; //incase last slot than one slot 
                        }
                    }
                };

                ts.slots = [];
                var bookOrders = _.filter(orders, function(bo) {
                    return (bo.fromtime == ts.time) || (bo.fromtime == (parseInt(ts.time) + 30).toString())
                });
                //grouping order by goupID so that it should
                var groupedOrders = _.groupBy(bookOrders, function(bo) {
                    return [bo.orderGroupId, bo.servicedeliveryaddress._id];
                });

                // to get all unique group order ids
                var uniqueGrpIds = _.groupBy(bookOrders, function(bo) {
                    return [bo.orderGroupId];
                });

                var tempGrpIds = [];

                for (var key in uniqueGrpIds) { //loop for booked slots
                    tempGrpIds.push(key);
                };


                function getGroupId() {
                    //if group id and address is not same than available false;
                    if (params.addressid != groupedOrders[key][0].servicedeliveryaddress._id)
                        return _.find(tempGrpIds, function(gid) { return gid == groupedOrders[key][0].orderGroupId });
                    return null;
                }

                var totalSlot = ts.totalSlot;
                for (var key in groupedOrders) { //loop for booked slots
                    //check for grouporders in same address
                    if (getGroupId()) {
                        var slotObj = {
                            available: false,
                            time: groupedOrders[key][0].fromtime,
                            text: groupedOrders[key][0].fromtime,
                            groupIds: []
                        };
                        ts.slots.push(slotObj);
                        totalSlot--;
                    }
                };

                if (parseInt(totalSlot) > 0) ts.available = true;
                else ts.available = false;
                while (parseInt(totalSlot) > 0) { //loop for available slots 
                    var slotObj = {
                        available: true,
                        time: ts.time.toString(),
                        text: "Open"
                    };
                    ts.slots.push(slotObj);
                    totalSlot--;
                };
            });
            return next(null);
        }
    ], function(error) { //final function of waterfall
        if (error) return callback(error);

        return callback(null, timeSlot);
    }); // end of waterfall
} //end of availableTimeSlot

exports.prtrAreaSlot = function(req, res, next) {
    partnerAreaSlot(req.query, function(error, timeslot) {
        if (error) return next(new Error(error));

        return res.json({
            response: timeslot
        });
    });
};

function partnerAreaSlot(params, callback) {
    if (!params.partner_id) return callback("Partner id not found");
    if (!params.area_id) return callback("Area id not found");

    var partnerObj, timeSlot = [],
        tempTimeSlot = getGlobalTimeSlot();
    async.waterfall([
            //get partner object
            function(next) {
                Model.findById(params.partner_id, {}, { lean: true }, function(error, partner) {
                    if (error) return callback(error);
                    if (!partner) return callback("partner not found");

                    partnerObj = partner;
                    return next(null)
                })
            },
            //timeslot based on area and workinghour
            function(next) {
                var areaSlot = _.find(partnerObj.areas, function(a) {
                    return a.area_id._id == params.area_id;
                });
                if (!areaSlot) areaSlot = { slots: [] };
                var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

                //making timeSlot array
                tempTimeSlot.forEach(function(t, t_Index) {
                    //loop on each day
                    days.forEach(function(day) {
                        // loop on each wH
                        partnerObj.workinghour.forEach(function(w) {
                            // find if the day exist in WH
                            var dayWH = _.find(w.day, function(d) { return d.toLowerCase() == day.toLowerCase(); })
                                //if WH from time is smaller than totime and time is in between in WH
                            if (w.from < w.to &&
                                (w.from <= parseInt(t.time) && w.to >= parseInt(t.time))) //if time exist in the given wh
                            {
                                if (dayWH) t[dayWH.toLowerCase() + "Flag"] = true; // if day found in WH than dayFlag = true
                                else if (!t[day.toLowerCase() + "Flag"]) // not found than make dayFlag false only if dayFlag doesnot exist
                                    t[day.toLowerCase() + "Flag"] = false;

                                //find in area slot if time exist than update slots
                                var tempSlot = _.find(areaSlot.slots, function(s) {
                                    return s.time == t.time;
                                });
                                if (tempSlot) {
                                    t["sunday"] = tempSlot["sunday"]
                                    t["saturday"] = tempSlot["saturday"]
                                    t["friday"] = tempSlot["friday"]
                                    t["thursday"] = tempSlot["thursday"]
                                    t["wednesday"] = tempSlot["wednesday"]
                                    t["tuesday"] = tempSlot["tuesday"]
                                    t["monday"] = tempSlot["monday"]
                                }
                                if (_.findIndex(timeSlot, function(ts) { return ts.time == t.time }) == -1) //new
                                    timeSlot.push(t);
                                // else
                                //     timeSlot[t_Index] = t;
                            }

                        });
                    });
                });
                return next(null);
            }
        ],
        // final method of waterfall
        function(error) {
            if (error) return callback(error);

            return callback(null, timeSlot);
        }); //end of waterfall 
} // end of partnerAreaSlot

exports.getPartnerInfoList = function (req, res, callback) {
    var searchPartner = {}, partners = [], cities, page, items, option, populateQuery, params = req.query;
    var sort = (req.query.sort && req.query.sort != "asc") ? -1 : 1;

    function makePartnerSearchObj() {
        if (params.active == "true") searchPartner._Deleted = false
        if (params.active == "false") searchPartner._Deleted = true
        if (params.partnertype) searchPartner.partnertype = params.partnertype;
        if (params.city_id) searchPartner['info.city_id'] = params.city_id;
        if (params.name) {
            searchPartner['$or'] = [];
            searchPartner['$or'] = [{
                'info.name': new RegExp(params.name, 'i')
            }, {
                'info.code': new RegExp(params.name, 'i')
            }];
    }
    }
    function populatePartnerObj() {
        populateQuery = [
            { path: 'info.city_id', select: '_id name'}
        ];
    }
    function optionObj() {
        option = {
            page: params.page,
            limit: parseInt(params.limit),
            populate:populateQuery,
            sortBy: {
                "info.name": sort,
            },
            columns:`info.name info.city_id info.address info.type partnertype _Deleted`
        }
    }
    function getPartners(next) {
        makePartnerSearchObj()
        populatePartnerObj()
        optionObj()
        if(params.page && params.limit){
            Model.paginate(searchPartner, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) return next(error);
                partners = paginatedResults;
                page = pageCount;
                items = itemCount;
                return next(null);
            });
        }
    }
    function getCities(next) {
        if(params.citylist != "true") return next(null)
        CityModel.find( {}, {"name":1}, {lean:true},function(error, result) {
                if (error) return next(error);
                cities = result;
                return next(null);
            });
    }
    function response() {
        if(params.citylist == "true"){
            return res.json(
            {
                cities: cities,
                partners: partners,
                pageCount: page,
                itemCount: items
            })
        }
        else  {
            return res.json({
                partners: partners,
                pageCount: page,
                itemCount: items
            })
        }
    }
    async.waterfall([getCities, getPartners], function(err){
        if(err) return callback(err);
        response();
    })
}