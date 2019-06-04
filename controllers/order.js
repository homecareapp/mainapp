var mongoose = require('mongoose');
var fs = require('fs');
var Model = require('../models/Order');
var ModelClient = require('../models/Client');
var ProviderModel = require('../models/Provider');
var PartnerModel = require('../models/Partner');
var AreaModel = require('../models/Area');
var ModelPartnerService = require('../models/PartnerService');
var functionList = require('./functionList');
var helperVisitCharge = require('./helpervisitcharge');
var _ = require("lodash");
require('lodash/function/before')
var ModelOrderRelation = require('../models/OrderRelation');
var pushnotification = require('../controllers/pushnotification');
var clientController = require('./client');
var orderNewController = require('./order-new')
var firebasenotification = require('../controllers/firebasenotification');
var partnerservice = require('../controllers/partnerservice');
// var loadash = require('loadash');
// var moment = require('moment');
var async = require('async');
var geocoderProvider = 'google';
var httpAdapter = 'http';
var tempNumber = new Number();
var loggedinuser;
var partnerShareTubeFlag = false;
var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;
var OptionMasterModel = require('../models/OptionMaster');
var ModelUser = require('../models/User');
var firebase = require("firebase");
// firebase.initializeApp({
//     serviceAccount: "mlytest-fbd9fdd8ad26.json",
//     databaseURL: "https://mlytest-24591.firebaseio.com"
// });
var populateQuery = [{
    path: 'client_id',
}, {
    path: 'call_id',
    select: '_id name externalId'
}, {
    path: 'area_id',
    select: '_id name pincodes city_id'
}, {
    path: 'servicedeliveryaddress.area_id',
    select: '_id name pincodes'
}, {
    path: 'servicedeliveryaddress.city_id',
    select: '_id name'
}, {
    path: 'servicedeliveryaddress.sublocation_id',
    select: '_id name'
}, {
    path: 'provider_id',
    select: '_id name'
}, {
    path: 'partner_id',
    select: '_id info.name info.acronym externalId info.code workinghour droppoints visitcharges areas discounts paymentoptions reportdeliverymode'
}, {
    path: 'services.service_id',
    select: 'name _id code price alias customerinstruction specialinstruction childs postsample postservices sampletype description tubes discountnotapplicable customerinstructiontype masterservice category'
}, {
    path: 'masterservices.service_id',
    select: 'name _id code price alias tubes externalId discountnotapplicable'
}, {
    path: 'assignby',
    select: '_id profile.name profile.mobilenumber'
}, {
    path: 'assignto',
    select: '_id profile.name profile.mobilenumber'
},{
    path: 'logistic.logistic_id',
    select: '_id profile.name profile.mobilenumber'
}, {
    path: 'createdby',
    select: '_id profile.name profile.mobilenumber'
}, {
    path: 'log.updatedby',
    select: '_id profile.name'
}, {
    path: 'log.newassignto',
    select: '_id profile.name'
}, {
    path: 'log.oldassignto',
    select: '_id profile.name'
}, {
    path: 'statuslog.statusby',
    select: '_id profile.name'
}];
var populateList = [
    {
        path: 'assignto',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'logistic.logistic_id',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'client_id',
        select: 'demography externalId'
    },
    {
        path: 'partner_id',
        select: '_id info.name info.acronym info.code'
    },
    {
        path: 'services.service_id',
        select: 'name _id'
    }
]
//orders should be in object
function getPrescriptionCount (orderObj, prescriptionCB) {
    if(!orderObj) return prescriptionCB(new Error("Order not found"));
    if(!orderObj._id)  return prescriptionCB(new Error("Order ID not found"));
    if (orderObj && orderObj.toObject && orderObj.toObject()) orderObj = orderObj.toObject();  //Convert it into plain javascript object
    Model.aggregate([
        { "$match" : { _id: orderObj._id }}, 
        { $project: { prescriptioncount: { $size: "$prescriptions" } } } ], function(e, orderaggr){
            if (e) return nextorder(e);
            if (orderObj.prescriptions)
                delete orderObj.prescriptions;
            orderObj.prescriptioncount = orderaggr[0].prescriptioncount;
            return prescriptionCB(null, orderObj);
    });
};
/*
function getById(id, callback) {
    Model.findById(id, function(error, result) {
        if (error) return callback(error);
        return callback(null, result);
    }).select("-signature -prescriptions").populate(populateQuery);
}
*/
exports.getOrderById = getById;
function getById(id, callback) {
    var result;
    async.waterfall([
        // get order by ID
        function(next) {
            getOrderById(id, function (error, resObj) {
                if(error) return next(error);
                result = resObj;
                //var ser = resObj.services;
                //var ser = ser.toObject();
                partnerservice.getOrderCustomerInstructions(resObj.services, function(e, data){
                    result.set('patientIntruction', data) 
                    return next(null)
                })
            })
        },
        // get PP Order
        function(next) {
            // PP
            if(result.ordertype == "PP") {
                getFastingOrder(result.parentorder_id, function(error, fastingOrder){
                    if(error) return next(error);
                    if(fastingOrder)
                        result.set('fastingOrder',fastingOrder);
                    
                    return next(null)
                })
            }
            else{
                // fasting
                getPPOrder(id, function (error, resObj) {
                    if(error) return next(error);
                    if(resObj)
                        result.set('ppOrder',resObj);
                    
                    return next(null)
                })  
            }
            
        },        
    ],function(error) {
        if(error) return callback(error);
        return callback(null, result); 
    })
}
function getOrderById(id, callback) { 
    Model.findById(id, function(error, result) {
        if (error) return callback(error);
        partnerservice.getOrderTubesPriority(result, 'TubeType', function(e, tubes){
            result.set('tubes', tubes);
            if (result.status == "Open" || result.status == "Unassigned" || result.status == "Reached" || result.status == "Recieved") {
                helperVisitCharge.calculateVisitCharge(result.orderGroupId,result.fromdate, result.fromtime, result.partner_id._id, function (e, visitcharge) {            
                    if (e) callback(null, result);
                    result.paymentdetails.visitingcharges = visitcharge;
                    return callback(null, result);
                });
            }
            else
                return callback(null, result);
        });
    }).select("-signature -prescriptions").populate(populateQuery);
};
function getPPOrder(parentId, callback) {
    // If Order type is fasting show   
    var search = {
        ordertype: "PP",
        parentorder_id: parentId,
        status:{$ne:"Cancelled"}
    }
    Model.findOne(search,{fromtime:1,fromdate:1,servicedeliveryaddress:1,orderGroupId:1,status:1, services:1},function(error, ppOrder) {
        if (error) return callback(error);
        return callback(null, ppOrder)           
    })
   
}
function getFastingOrder(Id, callback) {
    // If Order type is fasting show   
    
    Model.findById(Id,{fromtime:1,fromdate:1,servicedeliveryaddress:1,orderGroupId:1,status:1, services:1},function(error, fastingOrder) {
        if (error) return callback(error);
        return callback(null, fastingOrder)           
    });
   
}
exports.update = function(req, res, next) {
    var id = req.params.id;
    var data = req.body;
    var client_id = data.client_id;
    var logobj = data.logobj;
    if (!id) return next(new Error("Id Not Found To Update"));
    if (data.assignto) {
        if (!data.assignby) {
            return next(new Error("No Assigin By Given"));
        };
    };
    /*Commented by TalatM*/
    // if (data.geolocation) {
    //     if (data.geolocation.coordinates) {
    //         data.servicedeliveryaddress.geolocation = data.geolocation
    //     }
    // };
    async.waterfall([
        /*
        [ get client by id]
        */
        function(nextfun) {
            // var client_id = data.client_id._id
            var client_id = data.client_id
            if (!client_id) return next(new Error("No Client_id Assigned To This User"))
            ModelClient.findById(client_id, function(error, result) {
                if (error) return next(error)
                for (var key in data.client_id) {
                    if (typeof result[key] !== "function") {
                        result[key] = data.client_id[key];
                    };
                }
                result.save(function(error, result) {
                    if (error) return next(error);
                    if (result) {
                        if (result.demography.addresses.length > 0) {
                            async.each(result.demography.addresses, function(obj, nextrow) {
                                if (obj._id == data.servicedeliveryaddress._id) {
                                    obj.geolocation = {}
                                    obj.geolocation = data.servicedeliveryaddress.geolocation
                                }
                                return nextrow()
                            }, function(error) {
                                // console.log("error from client update");
                                if (error) return next(error)
                                return nextfun(null)
                            })
                        } else {
                            return nextfun(null)
                        }
                    }
                })
            })
        },
        /*
        [ get order based on id and update the order with client selected servicedelivery address true]
        */
        function(nextfun) {
            Model.findById(id, function(error, result) {
                if (error) return next(error);
                if (data.comment) {
                    if (!data.comments) {
                        data.comments = [];
                    };
                    data.comments.push(data.comment);
                };
                //STATUS LOG added by Talat and Paresh*/
                if (result.status != data.status) {
                    // if (data.statuslog) data.statuslog = [];
                    var statusLogObj = {
                        status: data.status,
                        statustimestamp: Date(),
                        statusby: req.user._id,
                        coordinates: data.coordinates
                    }
                    if (data.geolocation) statusLogObj.coordinates = data.geolocation.coordinates;
                    data.statuslog.push(statusLogObj);
                }
                else
                {
                    data.statuslog = result.statuslog;
                }
                if (logobj) {
                    logobj["oldstatus"] = result.status;
                    logobj["newstatus"] = data.status;
                    logobj["olddate"] = result.fromdate;
                    logobj["oldtime"] = result.fromtime;
                    logobj["newdate"] = data.fromdate;
                    logobj["newtime"] = data.fromtime;
                    logobj["oldassignto"] = result.assignto;
                    logobj["newassignto"] = data.assignto;
                    logobj["updatedby"] = req.user._id;
                    logobj["updateddatetime"] = Date();
                    data.log.push(logobj);
                };
                if (data.status == "Completed") {
                    result.servicetime = Date.now();
                    if (data.geolocation) {
                        if (data.geolocation.coordinates) {
                            data.servicedeliveryaddress.geolocation = data.geolocation
                        }
                    }
                }
                //To update result object with data object
                /*
                for (var key in data) {
                    if (typeof result[key] !== "function") {
                        result[key] = data[key];
                    }
                }
                */
                // if (!data.area_id) return next(new Error("Area not found"));
                // result.area_id = data.area_id;
                result.tubes = data.tubes;
                result.fromdate = data.fromdate;
                result.fromtime = data.fromtime;
                result.todate = data.todate;
                
                result.specialneed = data.specialneed;
                result.droppointaddress = data.droppointaddress;
                result.createdbyname = data.createdbyname;
                result.ordertype = data.ordertype;
                result.createdby = data.createdby;
                result.orderGroupId = data.orderGroupId;
                result.assignto = data.assignto;
                result.source = data.source;
                result.schedulenotification = data.schedulenotification;
                result.log = data.log;
                result.statuslog = data.statuslog;
                result.visitcomments = data.visitcomments;
                result.comments = data.comments;
                result.paymentdetails = data.paymentdetails;
                result.masterservices = data.masterservices;
                result.services = data.services;
                result.status = data.status;
                result.createdatetime = data.createdatetime;
                result.signature = data.signature;
                result.repeat = data.repeat;
                result.logistic = data.logistic;
                result.servicedeliveryaddress = data.servicedeliveryaddress;
                result.geolocation = data.geolocation;
                result.sampletype = data.sampletype;
                result.customerinstructionfalse = data.customerinstructionfalse;
                result.customerinstruction = data.customerinstruction;
                result.sampleinstruction = data.sampleinstruction;
                if (data.prescriptions) {
                    if (!result.prescriptions) {
                        result.prescriptions = [];
                    };
                    var datasign = false;
                    var datalogisticsign = false;
                    data.prescriptions.forEach(function(prep){
                        if(prep.description == "Patient Signature")
                        {
                            datasign = true
                        }
                        if(prep.description == "LabAssistant Signature" 
                            || prep.description == "Logistics Signature" 
                            || prep.description == "Delivery Signature")
                        {
                            datalogisticsign = true
                        }
                    })
                    var sign = false;
                    var logisticsign = false;
                    result.prescriptions.forEach(function(prep){
                        if(prep.description == "Patient Signature")
                        {
                            sign = true
                        }
                        if(prep.description == "LabAssistant Signature" 
                            || prep.description == "Logistics Signature" 
                            || prep.description == "Delivery Signature")
                        {
                            logisticsign = true
                        }
                    })
                    if( (!sign && datasign))
                    {
                        data.prescriptions.forEach(function(o){
                            if (o)
                                result.prescriptions.push(o);
                        });
                    }
                    if(!logisticsign && datalogisticsign)
                    {
                        data.prescriptions.forEach(function(o){
                            if (o)
                                result.prescriptions.push(o);
                        });
                    }
                    
                };
                result.save(function(error, result) {
                    if (error) return next(error);
                    Model.findById(result._id, function(error, result) {
                        if (error) return next(error);
                        getPPOrder(id, function (error, resObj) {
                            if(error) return next(error);
                            if(resObj)
                            {
                                result.set('ppOrder',resObj);
                                if(result.status == 'SampleCollected')
                                {
                                    result.visitcomments.forEach(function(visitcomm)
                                    {
                                        if (visitcomm)
                                        {
                                            var arr = visitcomm.split(':');
                                            var a = (arr[0].toUpperCase()).trim()
                                            if((a.toUpperCase()).trim() != 'SINGLE PRICK' && (a.toUpperCase()).trim() != 'DOUBLE PRICK' && (a.toUpperCase()).trim() != 'RESCUE PRICK')
                                            {
                                                if(!resObj.visitcomments)
                                                {
                                                    resObj.visitcomments = [];
                                                }
                                                resObj.visitcomments.push("Fasting comments : "+visitcomm)
                                            }
                                        }
                                        // if(!resObj.visitcomments)
                                        // {
                                        //     resObj.visitcomments = [];
                                        // }
                                        // resObj.visitcomments.push("Fasting comments : "+visitcomm)
                                    })
                                    result = result.toObject();
                                    resObj.paymentdetails.reportdeliverymode = result.paymentdetails.reportdeliverymode;
                                    for (var i = 0; i < resObj.paymentdetails.reportdeliverymode.length; i++) {
                                        if(resObj.paymentdetails.reportdeliverymode[i].charge)
                                        {
                                            resObj.paymentdetails.reportdeliverymode[i].charge = 0
                                        }
                                    }
                                    resObj.prescriptions = [];
                                    
                                }
                                //to update pp visit comments with fasting comments
                                resObj.save(function(error, ppresult) {
                                })
                            }
                            //OrderRelation object
                            var search = {};
                            if (result.parentorder_id) search.order_id = result.parentorder_id;
                            else search.order_id = result._id;
                            ModelOrderRelation.findOne(search, function (err, orResult) {
                                //result.set('orderjson', orResult); 
                                return nextfun(null, result)
                            });
                        })
                    }).populate(populateQuery);
                });
            }).populate(populateQuery)
        }
    ], function(error, result) {
        if (error) return next(error)
            // console.log("finally");
        res.json({
            response: result
        });
    })
}
exports.add = function(req, res, next) {
    var data = req.body;
    var order_id = data._id;
    var client_id = data.client_id._id;
    // console.log(req.user);
    // if (!req.user.userinfo.partner_id) return next(new Error("PartherId Missing"));
    if (!req.user.provider_id._id) return next(new Error("ProviderId Missing"));
    // if (!data.area_id    ) return next(new Error("Area id Missing"));
    var servicesadd = {};
    async.waterfall([
            /*** [if client present update if not add client pass client to another fun */
            function(nextfun) {
                if (client_id) {
                    ModelClient.findById(client_id, function(error, result) {
                        if (error) return next(error);
                        for (var key in data.client_id) {
                            if (typeof result[key] !== "function") {
                                result[key] = data.client_id[key];
                            };
                        }
                        result.save(function(error, result) {
                            if (error) return next(error);
                            if (result) {
                                return nextfun(null, result)
                            }
                        })
                    });
                } else {
                    data.client_id["user_id"] = req.user._id;
                    data.client_id["provider_id"] = req.user.provider_id._id;
                    var addClient = new ModelClient(data.client_id);
                    addClient.save(function(error, result) {
                        if (error) return next(error);
                        if (result) {
                            return nextfun(null, result)
                        };
                    });
                }
            },
            function(client, nextfun) {
                /*** [if order present update if not add order pass to another fun]*/
                data.client_id = client;
                if (order_id) {
                    Model.findById(order_id, function(error, result) {
                        if (error) return next(error);
                        if (result) {
                            for (var key in data) {
                                if (typeof result[key] !== "function") {
                                    result[key] = data[key];
                                }
                            }
                            result.save(function(error, result) {
                                if (error) return next(error);
                                if (result) {
                                    return nextfun(null, client, result);
                                };
                            })
                        };
                    });
                } else {
                    var addOrder = {};
                    addOrder["comments"] = [];
                    //addOrder["paymentdetails"] = {};
                    if (data.assignby) {
                        addOrder["assignby"] = data.assignby;
                        if (!data.assignto) {
                            return next(new Error("Order Not Created"));
                        } else {
                            addOrder["assignto"] = data.assignto;
                        }
                    };
                    addOrder["provider_id"] = req.user.provider_id._id;
                    addOrder["visitcomments"] = data.visitcomments;
                    addOrder["parentorder_id"] = data.parentorder_id;
                    addOrder["fromdate"] = data.fromdate;
                    addOrder["area_id"] = data.area_id;
                    addOrder["partner_id"] = data.partner_id;
                    addOrder["todate"] = data.todate;
                    addOrder["fromtime"] = data.fromtime;
                    addOrder["totime"] = data.totime;
                    addOrder["paymentdetails.amount"] = data.paymentdetails.amount;
                    addOrder["masterservices"] = data.masterservices;
                    addOrder["services"] = data.services;
                    addOrder["createdby"] = req.user._id;
                    addOrder["client_id"] = data.client_id;
                    addOrder["servicedeliveryaddress"] = data.servicedeliveryaddress;
                    addOrder["status"] = data.status;
                    if (data.status == "Completed") {
                        addOrder["servicetime"] = Date.now()
                        if (data.geolocation) {
                            // addOrder["geolocationtimestamp"] = Date.now()
                            addOrder.servicedeliveryaddress.geolocation = data.geolocation
                        };
                    };
                    if (data.call_id) {
                        addOrder["call_id"] = data.call_id;
                    };
                    //STATUS LOG added by Talat and Paresh*/
                    data.statuslog = [];
                    var statusLogObj = {
                        status: data.status,
                        statustimestamp: Date(),
                        statusby: req.user._id,
                        coordinates: data.coordinates
                    }
                    if (data.geolocation) statusLogObj.coordinates = data.geolocation.coordinates;
                    data.statuslog.push(statusLogObj);
                    addOrder["statuslog"] = data.statuslog;
                    data.log = [];
                    var logobj = {};
                    logobj.comments = "Visit created";
                    logobj["updatedby"] = req.user._id;
                    logobj["updateddatetime"] = Date();
                    data.log.push(logobj);
                    addOrder["log"] = data.log;
                    // console.log(addOrder);
                    var order = new Model(addOrder);
                    order.save(function(error, result) {
                        if (error) return next(error);
                        return nextfun(null, client, result);
                    });
                }
            }
        ],
        function(error, client, order) {
            if (error) return next(error);
            Model.findById(order._id, function(error, order) {
                if (error) return next(error);
                ModelClient.findById(client._id, function(error, client) {
                    if (error) return next(error);
                    var obj = {};
                    obj["response"] = {
                        client: client,
                        order: order
                    }
                    res.json(obj);
                })
            }).populate(populateQuery);
        });
}
exports.getCountsForDashboard = function(req, res, next) {
    var search = {};
    if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"));
    if (req.user.userinfo.partners) {
        // console.log(req.user.userinfo.partners.length);
        if (req.user.userinfo.partners.length > 0) {
            var tempArray = []
            async.eachSeries(req.user.userinfo.partners, function(partner, nextpartner) {
                tempArray.push(partner._id)
                return nextpartner()
            }, function(error) {
                search["partner_id"] = {
                    $in: tempArray
                }
            })
        }
    }
    if (req.user.provider_id) {
        search["provider_id"] = req.user.provider_id._id;
    };
    if (req.query.partner_id) {
        search["partner_id"] = req.query.partner_id;
    }
    if (req.query.fromdate && req.query.todate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(req.query.todate);
        //tdate.setDate(tdate.getDate() + 1);
        //tdate.setSeconds(tdate.getSeconds() - 1);
        search["fromdate"] = {
            $gte: fdate.toUTCString(),
            $lte: tdate.toUTCString()
        };
    } else if (req.query.fromdate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(fdate);
        tdate.setDate(tdate.getDate() + 1);
        tdate.setSeconds(tdate.getSeconds() - 1);
        search["fromdate"] = {
            $gte: fdate.toUTCString(),
            $lte: tdate.toUTCString()
        };
    }
    //console.log(search);
    var resret = {};
    async.waterfall
        (
            [
                function(nextfun) {
                    Model.count(search, function(error, allresult) {
                        if (error) return next(error);
                        //console.log(allresult)
                        resret.all = allresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    search["status"] = "Open"
                    Model.count(search, function(error, openresult) {
                        if (error) return next(error);
                        //console.log(openresult)
                        resret.open = openresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    search["status"] = "Cancelled"
                    Model.count(search, function(error, cancelledresult) {
                        if (error) return next(error);
                        //console.log(cancelledresult)
                        resret.cancelled = cancelledresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    search["status"] = "Completed"
                    Model.count(search, function(error, completedresult) {
                        if (error) return next(error);
                        //console.log(completedresult)
                        resret.completed = completedresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    search["status"] = "Unassigned"
                    Model.count(search, function(error, unassignedresult) {
                        if (error) return next(error);
                        //console.log(unassignedresult)
                        resret.unassigned = unassignedresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    delete search.status;
                    if (req.query.fromdate) {
                        var fdate = moment(req.query.fromdate).startOf('week');
                        var tdate = moment(req.query.fromdate).endOf('week');
                        // console.log(fdate);
                        // console.log(tdate);
                        search["fromdate"] = {
                            $gte: fdate,
                            $lte: tdate
                        };
                    }
                    // console.log(search);
                    Model.count(search, function(error, weekresult) {
                        if (error) return next(error);
                        //console.log(weekresult)
                        resret.weekresult = weekresult
                        nextfun(null);
                    });
                },
                function(nextfun) {
                    delete search.status;
                    if (req.query.fromdate) {
                        var fdate = moment(req.query.fromdate).startOf('month');
                        var tdate = moment(req.query.fromdate).endOf('month');
                        // console.log(fdate);
                        // console.log(tdate);
                        search["fromdate"] = {
                            $gte: fdate,
                            $lte: tdate
                        };
                    }
                    // console.log(search);
                    Model.count(search, function(error, monthresult) {
                        if (error) return next(error);
                        //console.log(monthresult)
                        resret.monthresult = monthresult
                        nextfun(null);
                    });
                }
            ],
            function(error) {
                res.json(resret);
            }
        );
}
exports.getOverview = function(req, res, next) {
    var search = {},
        fromdate = new Date(req.query.fromdate),
        todate = req.query.todate;
    if (req.user.userinfo.partners) {
        if (req.user.userinfo.partners.length > 0) {
            var tempArray = []
            async.eachSeries(req.user.userinfo.partners, function(partner, nextpartner) {
                tempArray.push(partner._id)
                return nextpartner()
            }, function(error) {
                search["partner_id"] = {
                    $in: tempArray
                }
            })
        }
    }
    if (req.user.provider_id)
        search["provider_id"] = req.user.provider_id._id;
    if (fromdate)
        search["fromdate"] = fromdate
    var returnObj = {};
    returnObj.total = 0;
    async.waterfall([
        // orders
        function(nextfun) {
            Model.find(search, { 'statuslog': 1 }, { lean:true }, function(err, allOrders) {
                returnObj.orders = allOrders;
                return nextfun();
            });
        },
        function(nextfun){
            //console.log(search);
            Model.aggregate([
                { "$match" : search }, 
                { $group: { _id: "$status", count: { $sum: 1 } } } ], function(e, orderaggr){
                if (e) return next(e);
                if (!orderaggr.length) return nextfun();
                orderaggr.forEach(function(o){
                    returnObj[o._id.toLocaleLowerCase()] = o.count;  
                    returnObj.total += o.count;  
                });
                return nextfun();
            });
        }
        /*,
        // All
        function(allStatusNextFun) {
            Model.count(search, function(err, allStatusCount) {
                returnObj.total = allStatusCount;
                return allStatusNextFun(null);
            });
        },
        //status unassigned
        function(unassignedNextFun) {
            search["status"] = "Unassigned"
            Model.count(search, function(err, unassignedOrderCount) {
                returnObj.unassigned = unassignedOrderCount;
                return unassignedNextFun();
            });
        },
        //status open
        function(openNextFun) {
            search["status"] = "Open"
            Model.count(search, function(err, openOrderCount) {
                returnObj.open = openOrderCount;
                return openNextFun();
            });
        },
        // samplecollected
        function(sampleCollectedNextFun) {
            search["status"] = "SampleCollected"
            Model.count(search, function(err, sampleCollectedOrderCount) {
                returnObj.samplecollected = sampleCollectedOrderCount;
                return sampleCollectedNextFun();
            });
        },
        // reached
        function(reachedNextFun) {
            search["status"] = "Reached"
            Model.count(search, function(err, reachedOrderCount) {
                returnObj.reached = reachedOrderCount;
                return reachedNextFun();
            });
        },
        // Recieved
        function(recievedNextFun) {
            search["status"] = "Recieved"
            Model.count(search, function(err, recievedOrderCount) {
                returnObj.recieved = recievedOrderCount;
                return recievedNextFun();
            });
        },
        // completed
        function(completedNextFun) {
            search["status"] = "Completed"
            Model.count(search, function(err, completedOrderCount) {
                returnObj.completed = completedOrderCount;
                return completedNextFun();
            });
        },
        // cancelled
        function(cancelledNextFun) {
            search["status"] = "Cancelled"
            Model.count(search, function(err, cancelledOrderCount) {
                returnObj.cancelled = cancelledOrderCount;
                return cancelledNextFun(null);
            });
        }*/
    ], function(err) {
        return res.json({ order: returnObj });
    });
}
exports.apiAdd = function(req, res, next) {
    res.json({
        message: "generic"
    });
}
// cancel order
exports.cancelorder = function(req, res, next) {
    var cancelppflag = req.body.cancelppflag;
    var reason = req.body.reason,
        id = req.params.id,
        coordinates = req.body.coordinates,
        orderObj;
    if (!reason) return next(new Error("Please send reason"));
    if(!Array.isArray(reason)) reason = [reason];
    if (!reason.length) return next(new Error("Please send atleast one reason"));
    if(!coordinates) coordinates = [];
    var reasontext = "";
    reason.forEach(function(resObj, index){
        if(reason.length-1 != index)
        {
            reasontext += resObj+", "
        }
        else
        {
            reasontext += resObj
        }
    })
    async.waterfall([
        function cancelOrder (nextFunc) {
            Model.findById(id, function(error, result) {
                if (error) return next(error);
                if (!result) return next(new Error ("Visit not found"));
                if (result.status == 'Cancelled') 
                {
                    return res.json({ "alreadycancelled": "Visit already cancelled." });
                    // return next(new Error("Visit already cancelled"));
                }
                var logobj = {};
                logobj["oldstatus"] = result.status;
                logobj["newstatus"] = "Cancelled";
                logobj["olddate"] = result.fromdate;
                logobj["oldtime"] = result.fromtime;
                logobj["comments"] = "Cancelled: " + reasontext;
                // logobj["newtime"] = new Date();
                logobj["old"] = [];
                logobj["new"] = [];
                logobj["new"].push({"key":'status',"value":'Cancelled'});
                logobj["old"].push({"key":'status',"value":result.status});
                //to do  checkn for reached status
                if(result.status != 'Reached')
                {
                    logobj["newassignto"] = undefined;
                }
               
                logobj["oldassignto"] = result.assignto;
                    
                logobj["updatedby"] = req.user._id;
                logobj["updateddatetime"] = Date();
                if(!result.log) result.log = [];
                result.log.push(logobj);
                // STATUS LOG
                if (result.status != "Cancelled") {
                    var statusLogObj = {
                        status: "Cancelled",
                        statustimestamp: Date(),
                        comment: reasontext,
                        statusby: req.user._id,
                        coordinates: coordinates
                    }
                    if(!result.statuslog) result.statuslog = [];
                    result.statuslog.push(statusLogObj);
                };
                
                if(!(result.status == 'Reached' || result.status == 'SampleCollected'  || result.status == 'SampleHandover'  || result.status == 'Completed'))
                {
                    result.assignto = undefined;
                }
                if(result.logistic.status == 'Reached'){
                    if(!(result.status == 'SampleHandover'  || result.status == 'Completed')){
                        result.logistic = undefined;
                    }
                }else{
                    result.logistic = undefined;
                }
                // if (result.logistic.status != 'Reached' ) result.logistic = undefined;
                
                result.status = "Cancelled";
                result.visitcomments.push("Cancelled: " + reasontext);
                orderObj = result; //copy to orderObj
                result.save(function(err, savedOrder) {
                    if (err) return next(err);
                    return nextFunc(null);
                    // return res.json({ message: "Visit cancelled successful." });
                })
            })
        },
        function cancelChildOrder (nextFunc) {
            if (orderObj.ordertype == "PP") 
                return nextFunc(null);
            else if (!cancelppflag){
                return nextFunc(null);
            }
            else {
                var search = {
                    parentorder_id:id,
                    ordertype: "PP",
                    // status:{$ne:'Completed'}
                    status:{$ne:'Cancelled'}
                }
                
                // console.log(search);
                Model.findOne(search, function (error, result) {
                    if (error) return next(new Error("Error while getting order by ID: " + error));
                    if (result.status == 'Cancelled') 
                    {
                        return res.json({ "alreadycancelled": "Visit already cancelled." });
                        //return next(new Error("Visit already cancelled"));
                    }
                    // console.log("result:" + result);
                    
                    if(result){
                        var logobj = {};
                        logobj["oldstatus"] = result.status;
                        logobj["newstatus"] = "Cancelled";
                        logobj["olddate"] = result.fromdate;
                        logobj["oldtime"] = result.fromtime;
                        logobj["comments"] = "Cancelled: " + reasontext;
                        // logobj["newtime"] = new Date();
                        logobj["old"] = [];
                        logobj["new"] = [];
                        logobj["new"].push({"key":'status',"value":'Cancelled'});
                        logobj["old"].push({"key":'status',"value":result.status});
                        if(result.status != 'Reached')
                        {
                            logobj["newassignto"] = undefined;
                        }
                        logobj["oldassignto"] = result.assignto;
                        
                        logobj["updatedby"] = req.user._id;
                        logobj["updateddatetime"] = Date();
                        result.log.push(logobj);
                        // STATUS LOG
                        if (result.status != "Cancelled") {
                            var statusLogObj = {
                                status: "Cancelled",
                                statustimestamp: Date(),
                                comment: reasontext,
                                statusby: req.user._id,
                                coordinates: coordinates
                            }
                            result.statuslog.push(statusLogObj);
                        };
                        // if(result.status != 'Reached')
                        // {
                        //     result.assignto = undefined;
                        // }
                        // result.logistic = undefined;
                        if(!(result.status == 'Reached' || result.status == 'SampleCollected'  || result.status == 'SampleHandover'  || result.status == 'Completed'))
                        {
                            result.assignto = undefined;
                        }
                        if(result.logistic.status == 'Reached'){
                            if(!(result.status == 'SampleHandover'  || result.status == 'Completed')){
                                result.logistic = undefined;
                            }
                        }else{
                            result.logistic = undefined;
                        }
                        result.status = "Cancelled";
                        result.visitcomments.push("Cancelled: " + reasontext);
                        result.save(function (err,savedOrder) {
                            if (err) return next(new Error("Error while saving PP order " + err));
                            return nextFunc(null)
                        });
                    }
                    else
                        return nextFunc(null)           
                });
            };
        }
        ],function final (error) {
            if (error) return next(new Error(error));
            /*Model.findById(id, function(error, returnOrder) {
                return res.json({ message: "Visit cancelled successful.", order: returnOrder });
            }).select("-signature -prescriptions").populate(populateQuery);*/
            orderNewController.getById(id, function(e, getresult){
                if (e) return next(e);
                return res.json({ message: "Visit cancelled successfully.", order: getresult });
            });
        }
    )
}
// order tests updates
exports.ordertestupdate = function(req, res, next) {
    var tests = [],
        id = req.params.id,
        reason = req.body.reason,
        logobj = {},
        shareTubeFlag = false,
        amount = 0,
        discount = 0,
        parentorder_id = parentorder_id,
        orderjson = req.body.orderjson,
        ppfromtime = req.body.ppfromtime,
        ppfromdate = req.body.ppfromdate,
        ppTestFlag = false,
        coordinates = req.body.coordinates,
        orderDiscount = 0,
        tempTestsObjectList,
        serviceupdatecomment = req.body.serviceupdatecomment;
    if (req.body.tests) tests = req.body.tests;
    else return res.json({ error: "Testupdate tests missing" });
    if (req.body.amount || req.body.amount == 0) amount = req.body.amount
    else return res.json({ error: "Testupdate amount missing" });
    if (req.body.visitingcharges || req.body.visitingcharges == 0) visitingcharges = req.body.visitingcharges
    else return res.json({ error: "Testupdate visitingcharges missing" });
    if (req.body.discount || req.body.discount == 0) discount = req.body.discount
    // if(!orderjson) return res.json({ error: "OrderJSON missing" });
    var selectedTests = [];
        
    async.waterfall([
        //partner sharetube information
        function(partnerNextFunc) {
            Model.findById(id, function(err, orderObj) {
                shareTubeFlag = orderObj.partner_id.sharetubes;
                partnerNextFunc();
            }).populate('partner_id');
        },
        //get test ids by services
        function(testNextFunc) {
            var tempServiceIds = []
            var a = tests;
            partnerservice.getUniqueTestsFromServices(tests, function(e, result){
                var a = result;
                return testNextFunc(null, result);
            })
            
        },
        function(tempServiceIds, tubeNextFunc) {
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };
            // console.log(tempServiceIds)
            var tempTubes = [],
                index;
            ModelPartnerService.find(searchTest, function(err, partnerTests) {
                if (err) return res.json({ error: "Error while getiing partnerTest: " + err });
                if (partnerTests) {
                    // calculate tube count
                    var lastTubeId;
                    for (var i = 0; i < partnerTests.length; i++) {  
                        lastTubeId = undefined; //to update tube id for next test                      
                        if (partnerTests[i].masterservice) {
                            if(partnerTests[i].masterservice.tubes){
                                tubeIdsCount = _.groupBy(partnerTests[i].masterservice.tubes, function (t) {
                                                    return [t._id]
                                                });
                                partnerTests[i].masterservice.tubes.forEach(function(tube) {
                                    index = _.findIndex(tempTubes, function(t) {
                                        return t._id == tube._id;
                                    });
                                    
                                    //checking test id index for tube
                                    if(!lastTubeId || lastTubeId != tube._id)
                                        tubeCount = tubeIdsCount[tube._id].length;
                                    lastTubeId = tube._id;
                                    if (index < 0 && partnerTests[i].masterservice.department_id) {
                                        var tubeObj = {
                                            count: 1,
                                            _id: tube._id,
                                            company: tube.company,
                                            size: tube.size,
                                            type: tube.type,
                                            department_id: [],
                                            test_ids:[]
                                        };
                                        
                                        tubeObj.department_id.push(partnerTests[i].masterservice.department_id._id);
                                        tubeObj.test_ids.push(partnerTests[i]._id);
                                        tempTubes.push(tubeObj);
                                        tubeCount--;
                                    } else {
                                        //share tube logic
                                        if (!shareTubeFlag && _.findIndex(tempTubes[index].department_id, function(o) {
                                                if(partnerTests[i].masterservice.department_id)
                                                    return o == partnerTests[i].masterservice.department_id._id
                                            }) < 0) {
                                            tempTubes[index].count++;
                                            tubeCount--;
                                            tempTubes[index].department_id.push(partnerTests[i].masterservice.department_id._id);
                                            //if test id not found in list than show add it
                                            if(_.findIndex(tempTubes[index].test_ids, function(testId) {return testId == partnerTests[i]._id }) == -1)
                                                tempTubes[index].test_ids.push(partnerTests[i]._id);
                                        }
                                        if(_.findIndex(tempTubes[index].test_ids, function(testId) {return testId == partnerTests[i]._id }) > -1 && tubeCount >0){
                                            tempTubes[index].count++;
                                            tubeCount--;
                                        }
                                        // //multiple same tubes in a test 
                                        // if(_.findIndex(tempTubes[index].department_id, function(o){return o==partnerTests[i].masterservice.department_id._id})>-1){
                                        //     tempTubes[index].count++;
                                        // }
                                    }
                                })
                            }
                                //console.log(tempTubes)
                        }
                    };
                    selectedTests = partnerTests;
                    //check for post sample test
                    partnerTests.forEach(function (pt) {
                        if (pt.postsample) {                            
                            pt.postservices.forEach(function(pp) {
                                var intersactionIndex = _.findIndex(partnerTests, function(s) {
                                    return s._id.equals(pp._id);
                                });
                                // console.log("found " + intersactionIndex)
                                if (intersactionIndex >= 0) ppTestFlag = true;
                            });                    
                        }
                    });
                    // console.log("ppTestFlag" + ppTestFlag);
                }
                return tubeNextFunc(null, tempTubes);
            });            
        },
        function visitChargeUpdate (tempTubes, visitingChargeNextFunc) {
            // console.log("visitingcharge start")
            if (parentorder_id){
                // console.log("parentorder_id found")
                Model.findById(parentorder_id, function(error, result) {
                    if (error) return res.json({
                        error: "Error while getting order by ID: " + error
                    })
                    if (!result) return res.json({
                        error: "No order found"
                    });
                    //do not update in case 
                    if (result.status == "Cencelled") visitingChargeNextFunc(null, tempTubes);
                    result.paymentdetails.visitingcharges = visitingcharges;
                    // console.log(result.paymentdetails)
                    result.save(function(error, savedOrder) {
                        if (error) return res.json({ error: "Error while saving parent Order: " + error })
                        // console.log(savedOrder.paymentdetails)
                        return visitingChargeNextFunc(null,tempTubes);                    
                    });
                }); 
            }
            else{
               return visitingChargeNextFunc(null, tempTubes); 
            }
        },
        // // find PP ORder Tubes
        // function (tempTubes,nextfunc) {
        //     if(ppTestFlag){
        //     }
        // },
        function UpdatePPVisit (tempTubes, updatePPVisitNextFunc) {
            //PP test not present
            // console.log("ppTestFlag" + ppTestFlag);
            if (!ppTestFlag) {
                // return updatePPVisitNextFunc(null,tempTubes);
                // var search = {
                //     parentorder_id:id,
                //     ordertype: "PP",
                //     status:{$and:[{$ne:"Cancelled"},{$ne:"Completed"}]}
                // }
                var search = {
                    parentorder_id:id,
                    ordertype: "PP", //todo: check for client_id as well
                    status: {$ne:'Cancelled'}
                    // $and:[{"status":{$ne:'Cancelled'}},{"status":{$ne:'Completed'}}]
                }
                
                // console.log(search);
                Model.findOne(search, function (error, result) {
                    if (error) return res.json({error: "Error while getting order by ID: " + error});
                    // console.log("result:" + result);
                    
                    if(result){
                        var logobj = {};
                        logobj["oldstatus"] = result.status;
                        logobj["newstatus"] = "Cancelled";
                        logobj["olddate"] = result.fromdate;
                        logobj["oldtime"] = result.fromtime;
                        
                        //to do  checkn for reached status
                        if(result.status != 'Reached')
                        {
                            logobj["newassignto"] = undefined;
                        }
                        //logobj["newassignto"] = undefined;
                        logobj["oldassignto"] = result.assignto;
                        
                        logobj["comments"] = "Cancelled: " + "PP test(s) removed from Fasting visit";
                        logobj["updatedby"] = req.user._id;
                        logobj["updateddatetime"] = Date();
                        result.log.push(logobj);
                        //STATUS LOG
                        if (result.status != "Cancelled") {
                            var statusLogObj = {
                                status: "Cancelled",
                                statustimestamp: Date(),
                                comment: "PP test(s) removed from Fasting visit",
                                statusby: req.user._id,
                                coordinates: coordinates
                            }
                            result.statuslog.push(statusLogObj);
                        };
                        if(!(result.status == 'Reached' || result.status == 'SampleCollected'  || result.status == 'SampleHandover'  || result.status == 'Completed'))
                        {
                            result.assignto = undefined;
                        }
                        if(result.logistic.status == 'Reached'){
                            if(!(result.status == 'SampleHandover'  || result.status == 'Completed')){
                                result.logistic = undefined;
                            }
                        }else{
                            result.logistic = undefined;
                        }
                        // if(result.status != 'Reached')
                        // {
                        //     result.assignto = undefined;
                        // }
                        result.status = "Cancelled";
                        result.visitcomments.push("Cancelled: PP test(s) removed from Fasting visit");
                        result.save(function (err,savedOrder) {
                            if (err) return res.json({error: "Error while saving PP order " + err});
                            return updatePPVisitNextFunc(null,tempTubes)
                        });
                    }
                    else
                        return updatePPVisitNextFunc(null,tempTubes)           
                });
            }
            else{               
                //PP test present
                var search = {
                    parentorder_id:id,
                    ordertype: "PP", //todo: check for client_id as well
                    $and:[{"status":{$ne:'Cancelled'}},{"status":{$ne:'Completed'}}]
                }
                
                var ppTests = [];
                //check for post sample test
                var newPPTest = [];
                selectedTests.forEach(function (pt) {
                    if (pt.postsample) {                            
                        pt.postservices.forEach(function(pp) {
                            var intersactionIndex = _.findIndex(selectedTests, function(s) {
                                return s._id.equals(pp._id);
                            });
                            // console.log("found " + intersactionIndex)
                            if (intersactionIndex >= 0) {
                                var obj = {
                                    service_id:pp._id,
                                    price:0
                                }
                                var newobj = {
                                    service_id:(pp.toObject)?pp.toObject():pp,
                                    price:0
                                }
                                ppTests.push(obj);
                                newPPTest.push(newobj);
                            }
                        });                    
                    }
                });
                // ToDo: tube count
                // console.log(search);
                Model.findOne(search, function (error, result) {
                    if (error) return res.json({error: "Error while getting order by ID: " + error});
                    // console.log("result:" + result);
                    // find if PP visit present
                    if(result){
                        //result.services //old
                        //ppTests //new
                        //and have to push log for test update in pp.
                        var logobj = {};
                        logobj["comments"] = "Test updated from fasting";
                        logobj["updatedby"] = req.user._id;
                        logobj["updateddatetime"] = Date();
                        var oldServices = [];
                        var newServices = [];
                        result.services.toObject().forEach(function(ser){
                            oldServices.push(
                                {
                                    service_id:{
                                        _id:ser.service_id._id,
                                        name:ser.service_id.name
                                    }
                                }
                            )
                        })
                        newPPTest.forEach(function(ser){
                            newServices.push(
                                {
                                    service_id:{
                                        _id:ser.service_id._id,
                                        name:ser.service_id.name
                                    }
                                }
                            )
                        })
                        
                        var oldObj = oldServices;
                        var newObj = newServices;
                        var arraykey = 'services';
                        var newOldArr = orderNewController.getOldNewLogArray(oldObj, newObj, arraykey)
                        var oldArr = newOldArr.oldArr;
                        var newArr = newOldArr.newArr;
                        logobj["new"] = newArr;
                        logobj["old"] = oldArr;
                        if (!result.log) result.log = [];
                        if(newArr.length)
                        {
                            result.log.push(logobj);
                        }
                        result.services = ppTests;
                         //Getting tubes array by services
                        getTubesByService(ppTests, function(e, tubes){
                            if (e) return nextfun(e);
                            if (!tubes) return nextfun(new Error("Tube not found"));
                            result.tubes = tubes;                            
                            result.save(function (err,savedOrder) {
                                if (err) return res.json({error: "Error while saving PP order " + err});
                                return updatePPVisitNextFunc(null,tempTubes)
                            });        
                        });
                    }
                    //if PP visit not present
                    else {
                        if(!ppfromtime) return updatePPVisitNextFunc(null,tempTubes); // DO NOT CREATE PP VISIT
                        Model.findById({ _id: id }, null, { lean: true }, function(e, orderObj){
                            orderObj.services = ppTests;
                            if (ppfromtime) {
                                orderObj.fromtime = ppfromtime;
                            }else{
                                // ToDo: check for working hours
                                orderObj.fromtime = orderObj.fromtime + 120;
                            };
                            if(ppfromdate)
                                orderObj.fromdate = ppfromdate;
                            orderObj.parentorder_id = orderObj._id;
                            orderObj._id = undefined;
                            delete orderObj._id;
                            orderObj.ordertype = "PP";
                            orderObj.assignto = undefined;
                            orderObj.status = "Unassigned";
                            delete orderObj.assignto;
                            if (!orderObj.paymentdetails) orderObj.paymentdetails = {};
                            orderObj.paymentdetails.amount = 0;
                            orderObj.paymentdetails.visitingcharges = 0;
                            orderObj.createdby = req.user._id;
                            //orderObj.createdbyname = req.user.demography.name;
                            orderObj.createdatetime = new Date().toISOString()
                            var statusLogObj = {
                                status: "Unassigned",
                                statustimestamp: Date(),
                                statusby: req.user._id,
                                coordinates: coordinates
                            }
                            orderObj.statuslog = [];
                            orderObj.statuslog.push(statusLogObj);
                            var logobj = {};
                            logobj.comments = "Visit Created";
                            logobj["updatedby"] = req.user._id;
                            logobj["updateddatetime"] = Date();
                            orderObj.log = [];
                            orderObj.log.push(logobj);
                            orderObj.logistic = {};
                            addPPVisit(orderObj, function(e, ppResult){
                                //Update order_id with latest id
                                if (!ppResult) return updatePPVisitNextFunc(null,tempTubes);
                                if (!ppResult._id) return updatePPVisitNextFunc(null,tempTubes);
                                return updatePPVisitNextFunc(null,tempTubes);
                                
                                // if (orderjson && orderjson.ppVisits && orderjson.ppVisits.length) {
                                //     var foundIndex;
                                //     orderjson.ppVisits.forEach(function(o, index){
                                //         if (o.parentOrder_id.toString() == id.toString()) {
                                //             foundIndex = index;
                                //             return false;
                                //         };
                                //     });
                                //     //If id does not match with ppVisits
                                //     if (!foundIndex) return updatePPVisitNextFunc(null,tempTubes);
                                //     orderjson.ppVisits[foundIndex].order_id = ppResult._id.toString();
                                //     ModelOrderRelation.update({ _id: orderjson._id }, { $set: { ppVisits: orderjson.ppVisits } }, function(e, orderRelationUpdate){
                                //         if (e) console.log(e);
                                //         return updatePPVisitNextFunc(null,tempTubes);
                                //     });
                                // }else{
                                //     return updatePPVisitNextFunc(null,tempTubes);
                                // };
                            });
                        });
                    };
                }).populate(populateQuery);
            }
        }
    ], function(err, tubes) {
        Model.findById(id, function(error, result) {
            if (error) return res.json({
                error: "Error while getting order by ID: " + error
            })
            if (!result) return res.json({
                error: "No order found"
            });
            // ORDER LOG
            // ToDo test name should show
            //result.services //old
            //tests //new
            //and have to push log for test update.
            if (!reason) reason = "";
            //logobj["comments"] = "Test updated. " + reason;
            logobj["comments"] = "Test updated.";
            logobj["updatedby"] = req.user._id;
            logobj["updateddatetime"] = Date();
            //var oldObj = result.services.toObject();
            //var newObj = tests;
            var oldServices = [];
            var newServices = [];
            result.services.toObject().forEach(function(ser){
                oldServices.push(
                    {
                        service_id:{
                            _id:ser.service_id._id,
                            name:ser.service_id.name
                        }
                    }
                )
            })
            tests.forEach(function(ser){
                newServices.push(
                    {
                        service_id:{
                            _id:ser.service_id._id,
                            name:ser.service_id.name
                        }
                    }
                )
            })
            
            var oldObj = oldServices;
            var newObj = newServices;
            var arraykey = 'services';
            var newOldArr = orderNewController.getOldNewLogArray(oldObj, newObj, arraykey)
            var oldArr = newOldArr.oldArr;
            var newArr = newOldArr.newArr;
            logobj["new"] = newArr;
            logobj["old"] = oldArr;
            if (!result.log) result.log = [];
            if(newArr.length)
            {
                result.log.push(logobj);
            }
            //result.log.push(logobj);
            result.services = tests;
            result.paymentdetails.amount = amount;
            result.paymentdetails.discount = discount;
            
            if(!parentorder_id) //incase its child object
                result.paymentdetails.visitingcharges = visitingcharges;
            result.tubes = tubes;
            result.serviceupdatecomment = serviceupdatecomment;
            result.save(function(err, saveOrder) {
                console.log(err);
                if (err) return res.json({ error: "Error while updating test in order: " + error });
                //Model.findById(id, function(error, returnOrder) {
                orderNewController.getById(id, function(error, returnOrder) {
                    //OrderRelation Update
                    return res.json({ message: "Tests updated successfully.", order: returnOrder});
                    // var search = {};
                    // if (returnOrder.parentorder_id) search.order_id = returnOrder.parentorder_id;
                    // else search.order_id = returnOrder._id;
                    // ModelOrderRelation.findById(orderjson._id, function (err, orResult) {
                    //     orResult.ppVisits = [];
                    //     orResult.primaryVisits = [];
                        
                    //     orResult.ppVisits = orderjson.ppVisits;
                    //     orResult.primaryVisits = orderjson.primaryVisits;
                        
                    //     orResult.save(function(error, orSavedResult) {
                    //         if (error) return callback(error);                                
                    //         returnOrder.set('orderjson', orSavedResult);                                   
                    //         return res.json({ message: "Tests updated successful.", order: returnOrder});
                    //     });                        
                    // })
                });
                //}).select("-signature -prescriptions").populate(populateQuery);
            })
        }).populate(populateQuery);
    })
}
function addPPVisit(parentOrderObj, nextOrder){
    if (!parentOrderObj) return nextOrder(new Error("Parent order object not found"));
    if (!parentOrderObj.parentorder_id) return nextOrder(new Error("Parent order ID not found"));
    
    //Getting tubes array by services
    getTubesByService(parentOrderObj.services, function(e, tubes){
        if (e) return nextfun(e);
        if (!tubes) return nextfun(new Error("Tube not found"));
        parentOrderObj.tubes = tubes;
        var orderObj = Model(parentOrderObj);
        orderObj.save(function(e, orderResult){
            if (e) return nextOrder(e);
            return nextOrder(null, orderResult);
        });        
    });    
};
function updateOrders(orders, addressObj, callback) {
    async.each(orders, function (order, next) {
        // var newOrder = new Model(order);
        order.servicedeliveryaddress = addressObj
        order.save(function(error){
            if(error) return next(error);
            return next(null);
        })
    },function (error) {
        if(error) return callback(error);
        return callback(null);
    })
}
exports.rescheduleorder = function(req, res, next) {
    var id = req.params.id,
        logobj = {},
        ppservices = [],
        data = {};
    if (req.body) data = req.body;
    if (!id) return next(new Error("order id not present"));
    if (!data.fromdate) return next(new Error("Visit date is missing"));
    if (data.fromtime < 0) return next(new Error("Visit time is missing"));
    if (!data.reason) return next(new Error("Reschedule reason missing"));
    if (!data.amount && req.body.amount != 0) return next(new Error("Reschedule amount missing"));
    if (!data.visitingcharges && req.body.visitingcharges != 0) return next(new Error("Reschedule visitingcharges missing"));
    
    if (data.pporder) {
        if (!data.pporder._id) return next(new Error("Reschedule pporder id missing"));
    };
    if (data.rescheduleAllGrp) {
        // from mobile i.e phlebo to reschedule all group orders.
    }
    //data.rescheduleAllGrp = true;
    var getAllGroupOrdersForId = function(nextfun){
        Model.findById(id, function(error, result) {
            var search = {};
            search.orderGroupId = result.orderGroupId;
            search.fromdate = result.fromdate;
            search.fromtime = result.fromtime;
            search["servicedeliveryaddress._id"] = result.servicedeliveryaddress._id;
            search["status"]={$ne:'Cancelled'}
            if(!data.rescheduleAllGrp)
            {
                search["_id"] = result._id;
            }
            Model.find(search, function(e, allGrpOrders){
                var a = allGrpOrders;
                //update
                updateAllOrders(allGrpOrders, null, function(e, s){
                    if(e) return next(e);
                    
                    return nextfun();
                });
            })
        })
    }
    var getAllGroupOrdersForPPId = function(nextfun){
        if (!data.pporder) return nextfun();
        Model.findById(data.pporder._id, function(error, result) {
            var search = {};
            search.orderGroupId = result.orderGroupId;
            search.fromdate = result.fromdate;
            search.fromtime = result.fromtime;
            search["servicedeliveryaddress._id"] = result.servicedeliveryaddress._id;
            search["status"]={$ne:'Cancelled'}
            if(!data.rescheduleAllGrp)
            {
                search["_id"] = result._id;
            }
            Model.find(search, function(e, allGrpOrders){
                var a = allGrpOrders
                updateAllOrders(allGrpOrders, data.pporder, function(e, s){
                    if(e) return next(e);
                    
                    return nextfun();
                });
                
            })
        })
    }
    function defaultLogistic(){
        return {
            delivertype:"DeliverToLab",
            username:"Deliver To Lab"
        }             
    }
    var updateAllOrders = function(allGroupOrders, pporder, callback){
        async.each(allGroupOrders, function(obj, nextrow) {
            // ORDER LOG
            var logobj = {};
            logobj["oldstatus"] = obj.status;
            logobj["newstatus"] = "Unassigned";
            logobj["oldassignto"] = obj.assignto;
            logobj["newassignto"] = undefined;
            logobj["comments"] = data.reason;// "Date-time update"
            if(pporder)
            {
                logobj["olddate"] = obj.fromdate;
                logobj["oldtime"] = obj.fromtime;
                logobj["newdate"] = pporder.fromdate;
                logobj["newtime"] = pporder.fromtime;
            }
            else
            {
                logobj["olddate"] = obj.fromdate;
                logobj["oldtime"] = obj.fromtime;
                logobj["newdate"] = data.fromdate;
                logobj["newtime"] = data.fromtime;
            }
            logobj["updatedby"] = req.user._id;
            logobj["updateddatetime"] = Date();
            var oldObj = {};
            oldObj.fromdate = obj.fromdate;
            oldObj.fromtime = obj.fromtime;
            
            var newObj = {};
            if(pporder)
            {
                newObj.fromdate = pporder.fromdate;
                newObj.fromtime = pporder.fromtime;
            }
            else
            {
                newObj.fromdate = data.fromdate;
                newObj.fromtime = data.fromtime;
            }
            
            var newOldArr = orderNewController.getOldNewLogArray(oldObj, newObj)
            var oldArr = newOldArr.oldArr;
            var newArr = newOldArr.newArr;
            if(newArr.length)
            {
                logobj["new"] = newArr;
                logobj["old"] = oldArr;
                if (obj.status != "Unassigned") {
                    logobj["new"].push({"key":"status","value":"Unassigned"});
                    logobj["old"].push({"key":"status","value":obj.status});
                }
                if (!obj.log) obj.log = [];
                obj.log.push(logobj);
                //STATUS LOG
                if (obj.status != "Unassigned") {
                    var statusLogObj = {
                        status: "Unassigned",
                        statustimestamp: Date(),
                        comment: data.reason,
                        statusby: req.user._id,
                        coordinates: data.coordinates
                    }
                    obj.statuslog.push(statusLogObj);
                };
                obj.status = "Unassigned";
                obj.assignto = undefined;
                obj.assignby = undefined;
                obj.logistic = defaultLogistic(); 
            }
            if(pporder)
            {
                obj.fromdate = pporder.fromdate;
                obj.fromtime = pporder.fromtime;
                obj.todate = pporder.fromdate;
                obj.totime = pporder.fromtime;
            }
            else
            {
                obj.fromdate = data.fromdate;
                obj.fromtime = data.fromtime;
                obj.todate = data.fromdate;
                obj.totime = data.fromtime;
            }
            if(!data.discount){
                data.discount=0;
            }
            if(data.discount == null ) {
                data.discount=0;
            }
            obj.paymentdetails.discount = data.discount;
            obj.save(function(err, savedOrder) {
                return nextrow()
            });
            
        }, function(error) {
            // console.log("error from client update");
            if (error) return callback(error)
            return callback(null, null)
        })
        
    }
    var getOrderById = function(nextfun){
        orderNewController.getById(id, function(error, returnOrder) {
            if (error) return next(error);
            /*push Notification firebase*/
            var currentDate = moment().tz(TIMEZONE).startOf('day').toISOString();
            var newOrderDate = moment(returnOrder.fromdate).tz(TIMEZONE).startOf('day').toISOString();
            if(currentDate == newOrderDate)
            {
                var params = {}
                params.refs = ["admin", "providerteamlead"];
                params.notiObj = {
                    read:false,
                    message:"Order has been rescheduled",
                    redirect:{
                        order_id:returnOrder._id.toString()
                    }
                }
                return nextfun(null, { message: "Visit rescheduled successfully.", order: returnOrder });
                
                // firebasenotification.multiRefInsertNotification(params, function(e, result){
                //     return res.json({ message: "Visit rescheduled successfully.", order: returnOrder });
                // });
            }
            /*push Notification firebase*/
            else
            {
                return nextfun(null, { message: "Visit rescheduled successfully.", order: returnOrder });
            }
        });
    }
    async.waterfall([getAllGroupOrdersForId, getAllGroupOrdersForPPId, getOrderById], function(e, response){
        if (e) return next(e);
        return res.json(response);
    });
}
function removePPTestFromFastingORder(id, ppservices, callback){
    Model.findById(id, {services:1},function(error, result){
        if(error) return callback(error);
        if (result) {
            
        }
    })
}
exports.assignLogistic = function(req, res, next) {
    var id = req.params.id, 
        logobj = {},       
        data = {};        
        data = req.body;
    if (!data.logistic) return res.json({
        error: "logistic tag is required"
    });
    // if (!data.client_id) return res.json({error:"Client id is required"});
    Model.findById(id, function(error, result) {
        if (error) return res.json({
            error: "Error while getting order by ID: " + error
        })
        if (!result) return res.json({
            error: "No order found"
        }); 
        var oldObj = JSON.parse(JSON.stringify(result.logistic.toObject()));
        if(oldObj.logistic_id)
            oldObj.logistic_id = oldObj.logistic_id.toString();
        var newObj = JSON.parse(JSON.stringify(data.logistic));
        if(newObj.logistic_id)
        {
            if(typeof newObj.logistic_id == 'object')
            {
                newObj.logistic_id = newObj.logistic_id._id.toString();
            }
            else
            {
                newObj.logistic_id = newObj.logistic_id.toString();
            }
        }
        if(oldObj.logistic_id && newObj.logistic_id)
        {
            if(oldObj.logistic_id != newObj.logistic_id)
            {
                if(result.status == 'Unassigned' || result.status == 'Open' 
                    || result.status == 'Recieved' || result.status == 'Reached' 
                    || result.status == 'SampleCollected')
                {
                    data.logistic.status = "Assigned"
                }
                else if(result.status == 'SampleHandover' || result.status == 'Completed')
                {
                    data.logistic.status = "Reached"
                }
            }
            else
            {
                if(oldObj.pickuptime != newObj.pickuptime)
                {
                    if(result.status == 'Unassigned' || result.status == 'Open' 
                    || result.status == 'Recieved' || result.status == 'Reached' 
                    || result.status == 'SampleCollected')
                    {
                        data.logistic.status = "Assigned"
                    }
                    else if(result.status == 'SampleHandover' || result.status == 'Completed')
                    {
                        data.logistic.status = "Reached"
                    }
                }
            }
        }
        if(oldObj.logistic_id && !newObj.logistic_id)
        {
            delete data.logistic.status
        }
        if(!oldObj.pickuppoint)
            oldObj.pickuppoint = "none";
        if(!oldObj.pickuptime)
            oldObj.pickuptime = undefined
        if(!oldObj.pickupdate)
            oldObj.pickupdate = undefined
        if(!oldObj.delivertype)
            oldObj.delivertype = "none"
        
        if(!oldObj.actualpickuppoint)
            oldObj.actualpickuppoint = "none"
        if(!oldObj.remark)
            oldObj.remark = "none"
        if(!oldObj.logisticremark)
            oldObj.logisticremark = []
        if(!oldObj.status)
            oldObj.status = "none"
        if(!oldObj.patientaddress)
            oldObj.patientaddress = false
        if(!oldObj.logisticcomments)
            oldObj.logisticcomments = "none"
        if(!newObj.pickuppoint)
            newObj.pickuppoint = "none"
        if(!newObj.pickuptime)
            newObj.pickuptime = undefined
        if(!newObj.pickupdate)
            newObj.pickupdate = undefined
        if(!newObj.delivertype)
            newObj.delivertype = "none"
        
        if(!newObj.actualpickuppoint)
            newObj.actualpickuppoint = "none"
        if(!newObj.remark)
            newObj.remark = "none"
        if(!newObj.logisticremark)
            newObj.logisticremark = []
        if(!newObj.status)
            newObj.status = "none"
        if(!newObj.patientaddress)
            newObj.patientaddress = false
        if(!newObj.logisticcomments)
            newObj.logisticcomments = "none"
        delete oldObj.username;
        delete newObj.username;
        var newOldArr = orderNewController.getOldNewLogArray(oldObj, newObj)
        var oldArr = newOldArr.oldArr;
        var newArr = newOldArr.newArr;
        async.waterfall([
            function(nextf) {
                
                if(oldObj.logistic_id == newObj.logistic_id)
                {
                    return nextf(null)
                }
                if(oldObj.logistic_id)
                {
                    ModelUser.findById(oldObj.logistic_id, {profile:1}, {lean:true}, function(error, oldPhlebo) {
                        if(oldPhlebo){
                            oldArr.push({"key":"Logistics name","value":oldPhlebo.profile.name});
                        }
                        return nextf(null)
                    })
                }
                else
                {
                    oldArr.push({"key":"Logistics name","value":"none"});
                    return nextf(null)
                }
                
            },
            function(nextf) {
                
                if(oldObj.logistic_id == newObj.logistic_id)
                {
                    return nextf(null)
                }
                if(newObj.logistic_id)
                {
                    ModelUser.findById(newObj.logistic_id, {profile:1}, {lean:true}, function(error, newPhlebo) {
                        if(newPhlebo){
                            newArr.push({"key":"Logistics name","value":newPhlebo.profile.name});
                        }
                        return nextf(null)
                    })
                }
                else
                {
                    newArr.push({"key":"Logistics name","value":"none"});
                    return nextf(null)
                }
            },
            function(nextf) {
                logobj["oldstatus"] = result.status;
                logobj["newstatus"] = result.status;
                logobj["oldassignto"] = result.assignto;
                logobj["newassignto"] = data.assignto;
                //logobj["comments"] = "Logistic updated to: " + data.logistic.pickuppoint;
                logobj["comments"] = "Logistics updated";
                logobj["updatedby"] = req.user._id;
                logobj["updateddatetime"] = Date();
                logobj["new"] = newArr;
                logobj["old"] = oldArr;
                if (!result.log) result.log = [];
                if(newArr.length)
                {
                    result.log.push(logobj);
                }       
                result.logistic = data.logistic;
                return nextf(null)
            }
        ],function(error) {
            if(error) return next(e)
            result.save(function(err, saveOrder) {
                if (err) return res.json({ error: "Error while assigning logistic in order: " + err });
                
                /*
                Model.findById(id, function(error, returnOrder) {
                    return res.json({ message: "Logistic assigned successfully.", order: returnOrder });
                }).populate(populateQuery);
                */
                orderNewController.getById(id, function(e, returnOrder){
                    if (e) return next(e);
                    return res.json({ message: "Logistic assigned successfully.", order: returnOrder });
                });
            })
        })
    });
}
function defaultLogistic(){
    var logistic = {
        delivertype:"DeliverToLab",
        username:"Deliver To Lab"
    }
    return logistic;
}
exports.changeComment = function(req, res, next) {
    var id = req.params.id,   
        data = {};        
        data = req.body;
    // if (!data.comments) return res.json({
    //     error: "new comment is required"
    // });
    // if (!data.comments.length) return res.json({
    //     error: "new comment is required"
    // });
    // if (!data.client_id) return res.json({error:"Client id is required"});
    Model.findById(id, function(error, result) {
        if (error) return res.json({
            error: "Error while getting order by ID: " + error
        })
        if (!result) return res.json({
            error: "No order found"
        });        
        result.comments = data.comments;
        result.save(function(err, saveOrder) {
            if (err) return res.json({ error: "Error while saving comments in order: " + error });
            
            /*
            Model.findById(id, function(error, returnOrder) {
                return res.json({ message: "Logistic assigned successfully.", order: returnOrder });
            }).populate(populateQuery);
            */
            orderNewController.getById(id, function(e, returnOrder){
                if (e) return next(e);
                return res.json({ message: "Comments updated successfully.", order: returnOrder });
            });
        })
    });
}
// -----------------------------------@abs [mapi to update only status ] -------------------------
exports.mapiUpdateStatus = function(req, res, next) {
    if(!req.body) return next("Data Missing")
    var params = req.body;
    params.user_id = req.user._id;
    params.id = req.params.id;
    updateStatus(res, params, function (e,r) {
        if(e) return next(new Error(e));
        return res.json({message:"Status updated.", response:r})
    })
}
function updateStatus(res, params, callback){    
    if(!params.status) return callback("Status Missing");
    if(!params.id) return callback("Order id missing");
    var order, orderIds = [];
    //if Status Reached than update status to all child patient visit as well else go to next
    var reachGroupOrders = function(nextfun){
        if (params.status == 'Reached') {
            var search = {
                orderGroupId:order.orderGroupId,
                fromtime:order.fromtime,
                fromdate:order.fromdate,
                area_id:order.area_id,
                status:'Recieved',
                assignto:params.user_id
            }
            Model.find(search,{_id:1},{lean:true},function (e,r) {
                if(e) return callback(e);
                
                
                r.forEach(function(i) {orderIds.push(i._id)});
                //update each result
                async.each(orderIds, reachChildOrder, function(error, results){
                    if (error) return callback(error);
                    return nextfun(null);
                });
                //return nextfun(null);
            });
        }
        else return nextfun(null);
    }
    //method to call from aync.each
    var reachChildOrder = function (id, nextfun){
        getOrder(id,function(e){
            if(e) return nextfun(e);
            return nextfun(null);
        })
    }
    //method to call from waterfall
    var updateParentOrderStatus = function (nextfun){
        getOrder(params.id,function(e){
            if(e) return nextfun(e);
            return nextfun(null);
        })
    }
    //get order and update status
    var getOrder =  function(id,nextfunc){
        
        if(!id) nextfunc("id missing");
        Model.findById(id, {orderGroupId:1,log:1,statuslog:1,area_id:1, fromtime:1, fromdate:1, status:1, assignto:1},function (e,r) {
            if(e) return callback(e);
            if (!r) return callback("no order found");
            
            order = r;
            
            // Log update
            var logobj = {};
            logobj["oldstatus"] = r.status
            logobj["newstatus"] = params.status
            if (params.reason) logobj["comments"] = params.reason;
            else logobj["comments"] = "status updated to " + params.status;
            logobj["updatedby"] = params.user_id
            logobj["updateddatetime"] = Date()
            if (!r.log)
                r.log = []
            r.log.push(logobj)
            
            //statuslog update
            if (r.status != params.status) {
                var statusLogObj = {
                    status: params.status,
                    statustimestamp: Date(),
                    comment: params.reason,
                    statusby: params.user_id,
                    coordinates: params.coordinates
                }
                if(!statusLogObj.coordinates) statusLogObj.coordinates = [];
                if (!params.reason) statusLogObj.comment = params.status;
                if(!r.statuslog) r.statuslog = [];
                r.statuslog.push(statusLogObj);
            };
            r.status = params.status;
            //update status
            if (r.assignto) {
                if(r.assignto.toString() != params.user_id.toString())
                {
                    return res.json("OrderReassign");
                    // return nextfunc("Order doesnt belong to this phlebo");
                }                
            }else {
                return res.json("OrderNotAssigned");
            }
            
            r.save(function(e,r) {
                if(e) return callback(e);                            
                return nextfunc(null);
            });
        })        
    }    
    // waterfall
    async.waterfall([updateParentOrderStatus,reachGroupOrders],
        function (error) {
            if (error) return callback(error);
            orderNewController.getById(params.id, function(e, returnOrder){
                if (e) return next(e);
                return callback(null, returnOrder);
            });            
    });//end of waterfall
}
//---@abs [mapi for mobile user to check if order_id has pp.parentorderid  if yes pass yes esle no] ----
exports.getParentOrders = function(req, res, next) {
    try {
        if (req.user.provider_id) {
            if (!req.user.provider_id._id) {
                return next("Provider_id Missing")
            }
        }
        if (!req.params.id) {
            return next("Provider_id Missing")
        }
        var order_id = req.params.id
        if (!order_id)
            return next(new Error("Cannot Find order_id "))
        Model.findById(order_id, function(error, result) {
            if (error)
                return next(error)
            if (result) {
                var search = {}
                search["parentorder_id"] = result._id
                try {
                    if (result.client_id)
                        search["client_id"] = result.client_id
                    search["provider_id"] = req.user.provider_id._id
                    console.log(search);
                    Model.find(search, function(error, result) {
                        if (error)
                            return next(error)
                        if (result.length > 0) {
                            res.json({
                                OrderFound: true
                            })
                        } else {
                            res.json({
                                OrderFound: false
                            })
                        }
                    })
                } catch (e) {
                    if (e)
                        return next(new Error(e.toString()))
                }
            };
        })
    } catch (e) {
        return next(new Error(e.toString()))
    }
}
exports.getParentOrderID = function (req, res, next) {
    return res.json({message:"generic getParentOrderID"})
}
exports.getVisitingCharge = function(req, res, next){
    var params = {
        fromtime:       req.body.fromtime,
        fromdate:       req.body.fromdate,
        ppfromtime:     req.body.ppfromtime, 
        ppfromdate:     req.body.ppfromdate, 
        action:         req.body.action, 
        partner_id:     req.body.partner_id,
        pptestflage:    req.body.pptestflage,
        ordertype:      req.body.ordertype,
        ordergroupid:      req.body.ordergroupid,
        // services:       req.body.services,
        servicedeliveryaddress_id: req.body.servicedeliveryaddress_id
    }, 
    response;
    
    params.services = [];
    if(req.body.services)
        params.services = req.body.services;
    var getVisitCharge = function(next) {
        helperVisitCharge.newOrderCalculateVisitCharge(params, function(err, result){
            if(err) return next(err);
            response = result;
            return next(null);
        });
    }
    var getPPServices = function(next) {
        partnerservice.getPPTests(params, function(e,t){
            if(e) return next(null);
            if(!t) t=[];
            response.ppTests = [];
            t.forEach(function(a){
                response.ppTests.push(a._id)
            });
            // response.ppTests = t;
            return next(null);
        })
    }
    async.waterfall([getVisitCharge, getPPServices], function(err){
        if(err) return next(new Error(err));
        return res.json({
            response: response
        })
    })
    
}
exports.getPPOrderID = function(req, res, next){ 
    if (!req.query.ordergroupid) return res.json("Order group ID not found");
    if (!req.query.client_id) return res.json("Client ID not found");
    var search = {};
    search["orderGroupId"] = req.query.ordergroupid.toString();
    search["ordertype"] = "PP";
    search["client_id"] = req.query.client_id; //mongoose.Types.ObjectId(req.query.client_id);
    search["status"] = { $ne: "Cancelled" };
    Model.findOne(search, null, { lean: true }, function(e, ppOrderResult){
        if (e) return next(e);
        if (!ppOrderResult) return res.json("Result not found");
        async.waterfall([
            function(nextfun){
                if (!ppOrderResult.parentorder_id) return nextfun();
                ModelOrderRelation.findOne({order_id: ppOrderResult.parentorder_id}, null, { lean:true }, function(e, orderRelation){
                    if (e) return nextfun(e);
                    ppOrderResult.orderjson = {};
                    if (orderRelation) {
                        ppOrderResult.orderjson = orderRelation;
                    };
                    return nextfun();
                });
            }
        ], function(e){
            if (e) return next(e);
            return res.json({"response": ppOrderResult});
        });
    })
    .populate([
        { path: 'area_id', select: '_id name pincodes ' },
        { path: 'client_id' },
        { path: 'servicedeliveryaddress.city_id', select: '_id name' },
        { path: 'servicedeliveryaddress.area_id', select: '_id name' },
        { path: 'servicedeliveryaddress.sublocation_id', select: '_id name' },
        { path: 'services.service_id', select: '_id name code price' },
        { path: 'partner_id', select: '_id workinghour' }]
     );
}; 
// exports.getOrderCount = function(req, res, next){
//     if (!req.query.fromdate) return next(new Error("From date not found"));
//     if (!req.user) return next(new Error("User not found"));
//     if (!req.user.provider_id) return next(new Error("Provider not found"));
//     var fdate = new Date();
//     var tdate = new Date();
//     var search = {};
//     search["provider_id"] = req.user.provider_id._id;
//     if (req.user.userinfo.partners) {
//         // console.log(req.user.userinfo.partners.length);
//         if (req.user.userinfo.partners.length > 0) {
//             var tempArray = []
//             async.eachSeries(req.user.userinfo.partners, function(partner, nextpartner) {
//                 tempArray.push(partner._id)
//                 return nextpartner()
//             }, function(error) {
//                 search["partner_id"] = {
//                     $in: tempArray
//                 }
//             })
//         }
//     }
//     // if (req.query.partner_id)
//     //     search["partner_id"] = mongoose.Types.ObjectId(req.query.partner_id);
//     if(req.query.partner_id) // string comma seperated
//     {
//         var partners = [];
//         if (req.query.partner_id) {
//             partners = req.query.partner_id.split(',')
//         }
//         if(partners.length)
//         {
//             for(var i=0;i<partners.length;i++)
//             {
//                 partners[i] = mongoose.Types.ObjectId(partners[i]);
//             }
//             search["partner_id"] = {
//                 $in: partners
//             }
//         }
//     }
//     var responseObj = {};
//     responseObj.todaysorder = {};
//     responseObj.todaysorder.total = 0;
//     responseObj.todaysorder.exceptCancelledTotal = 0;
//     responseObj.todaysorder.exceptCancelledAndPPTotal = 0;
//     responseObj.todaysorder.exceptCancelledAndPPClientTotal = 0;
//     responseObj.weeklyorders = {};
//     responseObj.weeklyorders.total = 0;
//     responseObj.weeklyorders.exceptCancelledTotal = 0;
//     responseObj.weeklyorders.exceptCancelledAndPPTotal = 0;
//     responseObj.weeklyorders.exceptCancelledAndPPClientTotal = 0;
//     responseObj.monthlyorders = {};
//     responseObj.monthlyorders.total = 0;
//     responseObj.monthlyorders.exceptCancelledTotal = 0;
//     responseObj.monthlyorders.exceptCancelledAndPPTotal = 0;
//     responseObj.monthlyorders.exceptCancelledAndPPClientTotal = 0;
//     async.waterfall([
//         //Get today orders count
//         function(nextfun){
//             fdate = moment(req.query.fromdate).tz(TIMEZONE).startOf('day');
//             fdate = new Date(fdate);
            
//             tdate = moment(req.query.fromdate).tz(TIMEZONE).endOf('day');
//             tdate = new Date(tdate);
//             search["fromdate"] = {
//                 $gte: fdate,
//                 $lte: tdate
//             };
//             // console.log("Today");
//             // console.log(search);
//             Model.aggregate([
//                 { "$match" : search }, 
//                 { $group: { _id: "$status", count: { $sum: 1 } } } ], function(e, orderaggr){
//                 if (e) return next(e);
//                 if (!orderaggr.length) return nextfun();
//                 orderaggr.forEach(function(o){
//                     responseObj.todaysorder[o._id.toLocaleLowerCase()] = o.count;  
//                     responseObj.todaysorder.total += o.count;  
//                     if(o._id.toLocaleLowerCase() != 'cancelled')
//                     {
//                         responseObj.todaysorder.exceptCancelledTotal += o.count;
//                     }
//                 });
//                 var searchFasting = {};
//                 searchFasting = JSON.parse(JSON.stringify(search)); //to avoid javascript binding
//                 searchFasting.ordertype = {$ne:'PP'};
//                 searchFasting.status = {$ne:'Cancelled'}
//                 var patientids = [];
//                 Model.find(searchFasting,{client_id: 1},{lean: true},function(e, fastingcount){
//                     if (e) return next(e);
//                     responseObj.todaysorder.exceptCancelledAndPPTotal = fastingcount.length;
//                     fastingcount.forEach(function(fastingObj){
//                         var index = _.findIndex(patientids, function(t) {
//                             return t == fastingObj.client_id.toString();
//                         });
//                         if(index < 0)
//                             patientids.push(fastingObj.client_id.toString())
//                     });
//                     responseObj.todaysorder.exceptCancelledAndPPClientTotal = patientids.length;
//                     return nextfun();
//                 })
//             });
//         },
//         //Get weekly orders count
//         function(nextfun){
//             fdate = moment(req.query.fromdate).tz(TIMEZONE).startOf('week');
//             fdate = new Date(fdate);
            
//             tdate = moment(req.query.fromdate).tz(TIMEZONE).endOf('week');
//             tdate = new Date(tdate);
            
//             search["fromdate"] = {
//                 $gte: fdate,
//                 $lte: tdate
//             };
//             // console.log("Weekly");
//             // console.log(search);
//             Model.aggregate([
//                 { "$match" : search }, 
//                 { $group: { _id: "$status", count: { $sum: 1 } } } ], function(e, orderaggr){
//                 if (e) return next(e);
//                 if (!orderaggr.length) return nextfun();
//                 orderaggr.forEach(function(o){
//                     responseObj.weeklyorders[o._id.toLocaleLowerCase()] = o.count;  
//                     responseObj.weeklyorders.total += o.count;  
//                     if(o._id.toLocaleLowerCase() != 'cancelled')
//                     {
//                         responseObj.weeklyorders.exceptCancelledTotal += o.count;
//                     }
//                 });
//                 var searchFasting = {};
//                 searchFasting = JSON.parse(JSON.stringify(search)); //to avoid javascript binding
//                 searchFasting.ordertype = {$ne:'PP'};
//                 searchFasting.status = {$ne:'Cancelled'}
//                 var patientids = [];
//                 Model.find(searchFasting,{client_id: 1},{lean: true},function(e, fastingcount){
//                     if (e) return next(e);
//                     responseObj.weeklyorders.exceptCancelledAndPPTotal = fastingcount.length;
//                     fastingcount.forEach(function(fastingObj){
//                         var index = _.findIndex(patientids, function(t) {
//                             return t == fastingObj.client_id.toString();
//                         });
//                         if(index < 0)
//                             patientids.push(fastingObj.client_id.toString())
//                     });
//                     responseObj.weeklyorders.exceptCancelledAndPPClientTotal = patientids.length;
//                     return nextfun();
//                 })
//             });
//         },
//         //Get monthly orders count
//         function(nextfun){
//             fdate = moment(req.query.fromdate).tz(TIMEZONE).startOf('month');
//             fdate = new Date(fdate);
            
//             tdate = moment(req.query.fromdate).tz(TIMEZONE).endOf('month');
//             tdate = new Date(tdate);
            
//             search["fromdate"] = {
//                 $gte: fdate,
//                 $lte: tdate
//             };
//             // console.log("monthly");
//             // console.log(search);
//             Model.aggregate([
//                 { "$match" : search }, 
//                 { $group: { _id: "$status", count: { $sum: 1 } } } ], function(e, orderaggr){
//                 if (e) return next(e);
//                 if (!orderaggr.length) return nextfun();
//                 orderaggr.forEach(function(o){
//                     responseObj.monthlyorders[o._id.toLocaleLowerCase()] = o.count;  
//                     responseObj.monthlyorders.total += o.count;  
//                     if(o._id.toLocaleLowerCase() != 'cancelled')
//                     {
//                         responseObj.monthlyorders.exceptCancelledTotal += o.count;
//                     }
//                 });
//                 var searchFasting = {};
//                 searchFasting = JSON.parse(JSON.stringify(search)); //to avoid javascript binding
//                 searchFasting.ordertype = {$ne:'PP'};
//                 searchFasting.status = {$ne:'Cancelled'}
//                 var patientids = [];
//                 Model.find(searchFasting,{client_id: 1},{lean: true},function(e, fastingcount){
//                     if (e) return next(e);
//                     responseObj.monthlyorders.exceptCancelledAndPPTotal = fastingcount.length;
//                     fastingcount.forEach(function(fastingObj){
//                         var index = _.findIndex(patientids, function(t) {
//                             return t == fastingObj.client_id.toString();
//                         });
//                         if(index < 0)
//                             patientids.push(fastingObj.client_id.toString())
//                     });
//                     responseObj.monthlyorders.exceptCancelledAndPPClientTotal = patientids.length;
//                     return nextfun();
//                 })
                
//             });
//         }
//     ], function(e){
//         if (e) return next(e);
//         return res.json({
//             response: responseObj
//         })
//     })
// };
exports.getOrderCount = function(req, res, next){
    var orders = [], monthlyorders = [], weeklyorders = [], todaysorder = [],   
        fdate = moment(req.query.fromdate).tz(TIMEZONE).startOf('month').toDate(),
        tdate = moment(req.query.fromdate).tz(TIMEZONE).endOf('month').toDate(),
        weekfdate = moment(req.query.fromdate).tz(TIMEZONE).startOf('week').toDate(),
        weektdate = moment(req.query.fromdate).tz(TIMEZONE).endOf('week').toDate(),
        starttoday = moment(req.query.fromdate).tz(TIMEZONE).startOf('day').toDate(),
        endtoday = moment(req.query.fromdate).tz(TIMEZONE).endOf('day').toDate(),
        search = {};
        options = {
            "assignto":1,
            "partner_id":1,
            "client_id":1,
            "fromtime":1,
            "fromdate":1,
            "orderGroupId":1,
            "ordertype":1
        },
        populate = [
            { "path": "partner_id", "select": "_id info.name" },
            { "path": "assignto", "select": "_id profile.name" }
        ];
    function makeOrderSearchObj() {
        if (req.user.provider_id)
            search["provider_id"] = req.user.provider_id._id;
        
        search.status = {$ne:"Cancelled"}        
        search.fromdate = { $gte: fdate, $lte: tdate };
        makeInSearch(); 
        function makeInSearch(field){
            if(req.query.partner_id) search["partner_id"] = splitIdsAndIn(req.query.partner_id);
            else {
               if (req.user.userinfo.partners) {
                   if (req.user.userinfo.partners.length > 0) {
                       var partners = req.user.userinfo.partners.map(function(p){
                           return p._id;
                       })
                       search["partner_id"] = { $in: partners };
                   }
               }
            }
        }
        function splitIdsAndIn(ids){
            if(!ids) return undefined;
            return {
                "$in": ids.split(',')
            }
        }
    }
    function getOrders(next) {
        makeOrderSearchObj();
        Model.find(search, options, { lean: true }, function(e, r) {
            orders = r;
            monthlyorders = calculateOrdersCount();
            orders = _.filter(orders,function(o) { return o.fromdate >= weekfdate && o.fromdate <= weektdate })
            weeklyorders = calculateOrdersCount();
            orders = _.filter(orders,function(o) { return o.fromdate >= starttoday && o.fromdate <= endtoday })
            todaysorder = calculateOrdersCount();
            response = {
                monthlyorders : monthlyorders,
                weeklyorders : weeklyorders,
                todaysorder : todaysorder
            }
            return next(null,response);
        }).populate(populate);
    }
    function calculateOrdersCount() {
        var totalVC, totalPC;
        totalVC = _.uniq(orders, function(v){ return v.orderGroupId + ' ' + v.client_id  + ' ' + v.fromtime}).length; // Total Ordercount
        totalPC = _.uniq(orders, function(v){ return v.orderGroupId + ' ' + v.client_id }).length;                    // PatientCount
        data = {
            exceptCancelledTotal:totalVC,
            exceptCancelledAndPPClientTotal:totalPC
        }
        return data;
    }
    async.waterfall([getOrders], function(error,response) {
        return res.json({
            response:response
        })
    });
}
function makePrimaryOrderRelation(orData, nextOR){
    var orderRelation = {};
    orderRelation.order_id = orData._id;
    orderRelation.provider_id = orData.provider_id;
    orderRelation.partner_id = orData.partner_id;
    orderRelation.primaryVisits = [];
    var primaryVisitObj = {};
    primaryVisitObj.client_id = orData.client_id;
    primaryVisitObj.address_id = orData.area_id;
    primaryVisitObj.time = orData.fromtime;
    primaryVisitObj.order_id = orData._id;
    primaryVisitObj.visitChargeApplicable = true;
    //primaryVisitObj.parentOrder_id: "";
    orderRelation.primaryVisits.push(primaryVisitObj);
    var orderRelationParse = ModelOrderRelation(orderRelation);
    orderRelationParse.save(function(e, orResult){
        if (e) return nextOR(e);
        return nextOR(null, orResult);
    });
};
function getTubesByService (services, nexttube) { 
    async.waterfall([
        //getServiceIds
        function (nextfun) {
            var tempServiceIds = []
            services.forEach(function(o){
                if(o.service_id){
                    if (o.service_id._id) {
                        tempServiceIds.push(o.service_id._id);
                    }else{
                        tempServiceIds.push(o.service_id);
                    };
                }                    
            });
            
            ModelPartnerService.find({ _id: { $in: tempServiceIds }},  null, { lean:true }, function (e, partnerTests) {
                if(e) return nextfun(e);
                if (!partnerTests) return nextfun(new Error("Partner test not found"));
                if (!partnerTests.length) return nextfun(new Error("Partner test not found"));
                tempServiceIds = [];
                partnerTests.forEach(function(ptObj){
                    if(ptObj)
                    {
                        if (ptObj.category.toUpperCase() == "TEST") {
                            tempServiceIds.push(ptObj._id);
                        }else if (ptObj.category.toUpperCase() == "PROFILE") {
                            if (ptObj.childs) {
                                ptObj.childs.forEach(function(child) {
                                    if(child.test_id)
                                        tempServiceIds.push(child.test_id._id)
                                });
                            };
                        }else if (ptObj.category.toUpperCase() == "PACKAGES") {
                            if (ptObj.childs) {
                                ptObj.childs.forEach(function(child) {
                                    if (child.test_id)
                                    {
                                        if (child.test_id.category.toUpperCase() == 'TEST') {
                                            if(child.test_id)
                                                tempServiceIds.push(child.test_id._id);
                                        }
                                        else if(child.test_id.category.toUpperCase() == 'PROFILE'){ 
                                            if(child.test_id.childs)
                                            {
                                                if(child.test_id.childs.length){
                                                    child.test_id.childs.forEach(function(profileTest) {
                                                        if (profileTest.test_id)
                                                            tempServiceIds.push(profileTest.test_id._id);
                                                    });
                                                }
                                            }
                                        };
                                    }
                                });
                            };
                        };
                    }
                });
                
               return nextfun(null, tempServiceIds);
            }).populate("childs.test_id");     
        },
        // get service tube list
        function (tempServiceIds, nextfun) { 
            var tempTubes = [], foundIndex;
            ModelPartnerService.find({ _id: { $in: tempServiceIds } }, null, { lean:true }, function (e, partnerTests) {
                if(e) return nextfun(e);
                if (!partnerTests) return nextfun(new Error("Partner test not found"));
                if (!partnerTests.length) return nextfun(new Error("Partner test not found"));
                var lastTubeId;
                partnerTests.forEach(function(ptObj){
                    lastTubeId = undefined; //to update tube id for next test
                    if (ptObj.masterservice && ptObj.masterservice.tubes) {
                        var tubeIdsCount = _.groupBy(ptObj.masterservice.tubes, function (t) {
                                            return [t._id]
                                        });
                        ptObj.masterservice.tubes.forEach(function(tube) {
                            foundIndex = _.findIndex(tempTubes, function(t) { return t._id == tube._id; });
                            //checking test id index for tube
                            if(!lastTubeId || lastTubeId != tube._id)
                                tubeCount = tubeIdsCount[tube._id].length;
                            lastTubeId = tube._id;
                            
                            // tube not found 
                            if (foundIndex<0){
                               var tubeObj = {
                                   count:1,
                                   _id: tube._id,
                                   company: tube.company,
                                   size: tube.size,
                                   type: tube.type,
                                   department_id: [],
                                   test_ids:[]
                               };
                               tubeObj.department_id.push(ptObj.masterservice.department_id._id);
                               tubeObj.test_ids.push(ptObj._id);
                               tubeCount--;
                               tempTubes.push(tubeObj);
                            }
                            else{
                                //share tube incase department different for same tube
                                if(!partnerShareTubeFlag && _.findIndex(tempTubes[foundIndex].department_id, function(o){return o==ptObj.masterservice.department_id._id})<0){
                                    tempTubes[foundIndex].count++;
                                    tempTubes[foundIndex].department_id.push(ptObj.masterservice.department_id._id);
                                    tubeCount--;
                                    //if test id not found in list than show add it
                                    if(_.findIndex(tempTubes[foundIndex].test_ids, function(testId) {return testId == ptObj._id }) == -1)
                                        tempTubes[foundIndex].test_ids.push(ptObj._id);
                                }
                                if(_.findIndex(tempTubes[foundIndex].test_ids, function(testId) {return testId == ptObj._id }) > -1 && tubeCount >0){
                                    tempTubes[foundIndex].count++;
                                    tubeCount--;
                                }
                                // //multiple same tubes in a test 
                                // if(_.findIndex(tempTubes[foundIndex].department_id, function(o){return o==ptObj.masterservice.department_id._id})>-1){
                                //     tempTubes[foundIndex].count++;
                                // }
                            };
                        });
                    };
                });
                return nextfun(null, tempTubes);
            });
        }
    ], function(e, tubes){
        if (e) return nexttube(e);
        return nexttube(null, tubes);
    })
};
function tubeSorting(tubes) {
    if(!tubes) return null;
    if(!tubes.length) return [];
    var sortedTubes = _.sortBy(tubes, function(t){
        var sortOrder = {
            "Gel":1,
            "Urine Container":2,
            "EDTA":3,
            "Fluoride":4
        }
        return sortOrder[t.type];
    })
    return sortedTubes;
}
exports.addPrescriptionByID = function(req, res, next) {
    var id = req.params.id;
    var description = req.query.description;
    var data = req.files;
    if (!id) return next(new Error("Order ID not found"));
    if (!data) return next(new Error("Data not found"));
    if (!data.image) return next(new Error("Data-image object not found"));
    if (!description) return next(new Error("Description not found"));
    //reading file from upload folder - (Path looks like /app/uploads/82ec759dc1edce54a5d3fe1aa024d907.png)
    fs.readFile(data.image.path, function(e, readFileContents) {
        if (e) return next(e);
        if (!readFileContents) return next(new Error("ReadFile contents not found"));
        try {
            var base64data = new Buffer(readFileContents, 'binary').toString('base64');
        }catch(e){ 
            return next(e);
        };
        
        if (!base64data) return next(new Error("Base64 not found"));
        base64data = "data:image/png;base64,"+base64data;
        var prescriptions = [];
        var prescriptionObj = {
            name : "Prescription",
            url: base64data,
            description: description
        };
        Model.findById({_id: id}, null, { lean:true }, function(e, orderObj){
            if (e) return next(e);
            if (!orderObj) return next(new Error("Order not found"));
            
            if (!orderObj.prescriptions) {
                prescriptions = [];
            }else{
                prescriptions = orderObj.prescriptions
            };
            prescriptions.push(prescriptionObj);
            Model.update({_id: id}, { $set: { prescriptions: prescriptions } }, function(e, orderUpdateCount){
                if (e) return next(e);
                Model.findById({_id: id}, { "prescriptions._id": 1 }, { lean: true }, function(e, orderObj){
                    if (e) return next(e);
                    return res.json({
                        response: orderObj,
                        message: "Prescription successfully saved"
                    });                
                });
                
            });
        });
    });
};
exports.deletePrescriptionByID = function(req, res, next) {
    var id = req.params.id;
    var prescription_id = req.query.prescription_id;
    if (!id) return next(new Error("Order ID not found"));
    if (!prescription_id) return next(new Error("Prescription ID not found"));
    Model.update({_id: id }, { $pull: { 'prescriptions': { '_id': prescription_id } } }, function(e, updateOrder){
        if (e) return next(e);
        return res.json({
            message: "Prescription successfully deleted"
        });
    });
};
exports.getPrescriptionByID = function(req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Order ID not found"));
    Model.findById({ _id: id }, { "prescriptions": 1 }, { lean: true }, function(e, orderResult){
        if (e) return next(e);
        if (!orderResult) return next(new Error("Order not found"));
        
        return res.json({
            response: orderResult
        });
    });
};