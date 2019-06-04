var mongoose = require('mongoose');
var Model = require('../../models/Order');
var ModelClient = require('../../models/Client');
var ModelPartnerService = require('../../models/PartnerService');
var climsParser = require("../../parser/srl/climsParser");

// var loadash = require('loadash');
var moment = require('moment');
var async = require('async');
var geocoderProvider = 'google';
var httpAdapter = 'http';
var populateQuery = [{
    path: 'client_id',
    select: '_id demography externalId'
}, {
    path: 'call_id',
    select: '_id name'
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
    select: '_id info.name externalId info.code workinghour droppoints visitcharges'
}, {
    path: 'services.service_id',
    select: 'name _id code price alias customerinstruction specialinstruction childs'
}, {
    path: 'masterservices.service_id',
    select: 'name _id code price alias tubes externalId'
}, {
    path: 'assignby',
    select: '_id profile.name profile.mobilenumber'
}, {
    path: 'assignto',
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
}];


exports.update = function(req, res, next) {
    // console.log("into srl parser update");
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
    if (data.gelocation) {
        if (data.gelocation.coordinates) {
            data.servicedeliveryaddress.gelocation = data.gelocation
        }
    };
    async.waterfall([
        /*
        [ get client by id]
        */
        function(nextfun) {
            var client_id = data.client_id._id
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
                                    obj.gelocation = {}
                                    obj.gelocation = data.servicedeliveryaddress.gelocation
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
                    data.statuslog = [];
                    var statusLogObj = {
                        status: data.status,
                        statustimestamp: Date(),
                        statusby: req.user._id
                    }
                    if (data.gelocation) statusLogObj.coordinates = data.gelocation.coordinates;
                    data.statuslog.push(statusLogObj);
                };
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
                    data["servicetime"] = Date.now()
                    if (data.gelocation) {
                        if (data.geolocation.coordinates) {
                            data.servicedeliveryaddress.gelocation = data.gelocation
                        }
                    }
                }
                // console.log("updating mobilediscount");
                if (data.mobilediscount != null) {
                    // console.log("+++++++++++++++++++++++");
                    // console.log(result.mobilediscount);
                    result.mobilediscount = data.mobilediscount
                    // console.log("+++++++++++++++++++++++");
                };
                //To update result object with data object
                for (var key in data) {
                    if (typeof result[key] !== "function") {
                        result[key] = data[key];
                    }
                }
                result.save(function(error, result) {
                    if (error) return next(error);
                    Model.findById(result._id, function(error, result) {
                        // console.log("error from client update");
                        climsParser.makeClimsEntry(result, "update", function(error, climsParserResult) {
                            if (error) return next(error);
                            if (climsParserResult == "error") {
                                return nextfun(null, result)
                            } else {
                                if (result.status == "Completed") {
                                    result.paymentdetails.paid = true
                                }
                                result.save(function(error, result) {
                                    if (error)
                                        next(error)
                                    // console.log("~~~~~~~~~~~~Update Result~~~~~~~~~~~~");
                                    // console.log(climsParserResult);
                                    // console.log("~~~~~~~~~~~~Update Result~~~~~~~~~~~~");
                                    return nextfun(null, result)

                                })
                            }

                        });
                    }).populate(populateQuery);
                });
            })
        }
    ], function(error, result) {
        if (error) return next(error)
        res.json({
            response: result
        });
    })
}


// function updateClimsOrder(data, callback) {

// }
// var mongoose = require('mongoose');
// var Model = require('../../models/Order');
// var ModelClient = require('../../models/Client');
// var ModelPartnerService = require('../../models/PartnerService');
// // var loadash = require('loadash');
// var moment = require('moment');
// var async = require('async');
// var geocoderProvider = 'google';
// var httpAdapter = 'http';
// var populateQuery = [{
//     path: 'client_id',
//     select: '_id demography externalId'
// }, {
//     path: 'call_id',
//     select: '_id name'
// }, {
//     path: 'area_id',
//     select: '_id name pincodes city_id'
// }, {
//     path: 'servicedeliveryaddress.area_id',
//     select: '_id name pincodes'
// }, {
//     path: 'servicedeliveryaddress.city_id',
//     select: '_id name'
// }, {
//     path: 'servicedeliveryaddress.sublocation_id',
//     select: '_id name'
// }, {
//     path: 'provider_id',
//     select: '_id name'
// }, {
//     path: 'partner_id',
//     select: '_id info.name externalId info.code workinghour droppoints visitcharges'
// }, {
//     path: 'services.service_id',
//     select: 'name _id code price alias customerinstruction specialinstruction childs'
// }, {
//     path: 'masterservices.service_id',
//     select: 'name _id code price alias tubes externalId'
// }, {
//     path: 'assignby',
//     select: '_id profile.name profile.mobilenumber'
// }, {
//     path: 'assignto',
//     select: '_id profile.name profile.mobilenumber'
// }, {
//     path: 'createdby',
//     select: '_id profile.name profile.mobilenumber'
// }, {
//     path: 'log.updatedby',
//     select: '_id profile.name'
// }, {
//     path: 'log.newassignto',
//     select: '_id profile.name'
// }, {
//     path: 'log.oldassignto',
//     select: '_id profile.name'
// }];


// exports.update = function(req, res, next) {
//     console.log("into srl parser");
//     var id = req.params.id;
//     var data = req.body;
//     var client_id = data.client_id;
//     var logobj = data.logobj;
//     if (!id) return next(new Error("Id Not Found To Update"));
//     if (data.assignto) {
//         if (!data.assignby) {
//             return next(new Error("No Assigin By Given"));
//         };
//     };
//     if (data.gelocation) {
//         if (data.gelocation.coordinates) {
//             data.servicedeliveryaddress.gelocation = data.gelocation
//         }
//     };
//     async.waterfall([
//         /*
//         [ get client by id]
//         */
//         function(nextfun) {
//             var client_id = data.client_id._id
//             if (!client_id) return next(new Error("No Client_id Assigned To This User"))
//             ModelClient.findById(client_id, function(error, result) {
//                 if (error) return next(error)
//                 for (var key in data.client_id) {
//                     if (typeof result[key] !== "function") {
//                         result[key] = data.client_id[key];
//                     };
//                 }
//                 result.save(function(error, result) {
//                     if (error) return next(error);
//                     if (result) {
//                         if (result.demography.addresses.length > 0) {
//                             async.each(result.demography.addresses, function(obj, nextrow) {
//                                 if (obj._id == data.servicedeliveryaddress._id) {
//                                     obj.gelocation = {}
//                                     obj.gelocation = data.servicedeliveryaddress.gelocation
//                                 }
//                                 return nextrow()
//                             }, function(error) {
//                                 console.log("error from client update");
//                                 if (error) return next(error)
//                                 return nextfun(null)
//                             })
//                         } else {
//                             return nextfun(null)
//                         }
//                     }
//                 })
//             })
//         },
//         /*
//         [ get order based on id and update the order with client selected servicedelivery address true]
//         */
//         function(nextfun) {
//             Model.findById(id, function(error, result) {
//                 if (error) return next(error);
//                 if (data.comment) {
//                     if (!data.comments) {
//                         data.comments = [];
//                     };
//                     data.comments.push(data.comment);
//                 };
//                 //STATUS LOG added by Talat and Paresh*/
//                 if (result.status != data.status) {
//                     data.statuslog = [];
//                     var statusLogObj = {
//                         status: data.status,
//                         statustimestamp: Date(),
//                         statusby: req.user._id
//                     }
//                     if (data.gelocation) statusLogObj.coordinates = data.gelocation.coordinates;
//                     data.statuslog.push(statusLogObj);
//                 };
//                 if (logobj) {
//                     logobj["oldstatus"] = result.status;
//                     logobj["newstatus"] = data.status;
//                     logobj["olddate"] = result.fromdate;
//                     logobj["oldtime"] = result.fromtime;
//                     logobj["newdate"] = data.fromdate;
//                     logobj["newtime"] = data.fromtime;
//                     logobj["oldassignto"] = result.assignto;
//                     logobj["newassignto"] = data.assignto;
//                     logobj["updatedby"] = req.user._id;
//                     logobj["updateddatetime"] = Date();
//                     data.log.push(logobj);
//                 };
//                 if (data.status == "Completed") {
//                     data["servicetime"] = Date.now()
//                     if (data.gelocation) {
//                         if (data.geolocation.coordinates) {
//                             data.servicedeliveryaddress.gelocation = data.gelocation
//                         }
//                     }
//                 }
//                 //To update result object with data object
//                 for (var key in data) {
//                     if (typeof result[key] !== "function") {
//                         result[key] = data[key];
//                     }
//                 }
//                 result.save(function(error, result) {
//                     if (error) return next(error);
//                     Model.findById(result._id, function(error, result) {
//                         console.log("error from client update");
//                         if (error) return next(error);
//                         return nextfun(null, result)
//                     }).populate(populateQuery);
//                 });
//             })
//         }
//     ], function(error, result) {
//         if (error) return next(error)
//         res.json({
//             response: result
//         });
//     })
// }


// function updateClimsOrder(data, callback) {

// }
