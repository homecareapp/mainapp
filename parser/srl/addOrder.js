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
    select: '_id info.name externalId info.code workinghour droppoints visitcharges areas'
}, {
    path: 'services.service_id',
    select: 'name _id code price alias customerinstruction specialinstruction childs postsample'
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

exports.add = function(req, res, next) {
    // console.log("into srl parser add order ");
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
                        statusby: req.user._id
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
                        order = {};
                        order = result;
                        var climsObj;
                        var error = false;
                        climsParser.makeClimsEntry(result, "add", function(error, climsParserResult) {
                            if (error) return next(error)
                            if (climsParserResult == "error") {
                                error = true
                                // console.log("result received with error");
                                Model.findById(result._id, function(error, result) {
                                    if (error)
                                        return nextfun(null, client, result);
                                }).populate(populateQuery)
                            } else {
                                // console.log("success result");
                                climsObj = JSON.parse(climsParserResult);
                                Model.findById(result._id, function(error, orderIdResult) {
                                    if (error)
                                        return next(error)
                                    orderIdResult.externalId = climsObj.OrderID
                                    // console.log("ID " + orderIdResult._id);
                                    orderIdResult.save(function(error, finalOrderResult) {
                                        if (error)
                                            return next(error)
                                        ModelClient.findById(orderIdResult.client_id._id, function(error, cliResult) {
                                            if (error)
                                                return next(error)
                                            if (cliResult) {
                                                // console.log("@@@@@@@");
                                                // console.log(cliResult.externalId);
                                                // console.log("@@@@@@@");
                                                // console.log("*********************************");
                                                // console.log("Clint_id " + cliResult._id);
                                                // console.log("Clims " + climsObj.PatientCode);
                                                // console.log("Old " + cliResult.externalId);
                                                cliResult.clientcode = climsObj.PatientCode
                                                // console.log("Json " + climsObj.PatientCode);
                                                // console.log("Replaced " + cliResult.externalId);
                                                // console.log("*********************************");
                                                cliResult.save(function(error, res) {
                                                    if (error)
                                                        return next(error)
                                                    return nextfun(null, cliResult, finalOrderResult);
                                                })
                                            } else {
                                                return nextfun(null, cliResult, finalOrderResult);
                                            }
                                        })

                                    })

                                }).populate(populateQuery)
                            }
                        });

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
