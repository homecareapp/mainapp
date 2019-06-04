var _ = require('lodash');
var async = require('async');
var Model = require('../../models/Call');
var ModelServicesRequest = require('../../models/ServiceRequest');
var ModelClient = require('../../models/Client');
var ModelOrder = require('../../models/Order');
var climsParser = require("../../parser/srl/climsParser");

var populateQuery = [{
    path: 'client_id'
}, {
    path: 'call_id',
    select: '_id name'
}, {
    path: 'area_id',
    select: '_id name pincodes'
}, {
    path: 'servicedeliveryaddress.area_id',
    select: '_id name pincodes'
}, {
    path: 'servicedeliveryaddress.city_id',
    select: '_id name'
}, {
    path: 'provider_id',
    select: '_id name'
}, {
    path: 'partner_id',
    select: '_id info.name workinghour'
}, {
    path: 'services.service_id',
    select: 'name _id code price alias tubes'
}, {
    path: 'assignby',
    select: '_id profile.name profile.mobilenumber'
}, {
    path: 'assignto',
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
        // console.log("into parser for srl");
        var data = req.body;
        var tempType;
        if (!data.call) {
            tempType = data.type;
        } else {
            tempType = data.call.type;
        }
        if (tempType !== "servicerequest") {
            data["provider_id"] = req.user.provider_id._id;

            var addCall = new Model(data);
            addCall.save(function(error, result) {
                if (error) return next(error);
                res.json({
                    response: result
                });
            });
        } else {
            addAllRequest(data, req, function(error, result) {
                if (error) return next(error);
                Model.findById(result._id, function(error, result) {
                    if (error) return next(error);
                    res.json({
                        response: result
                    });
                })
            });
        }
    }
    /**[save call client and order if data.client.type == 'servicerequest'] */
function addAllRequest(data, req, callback) {
    if (data.assignto) {
        if (!data.assignby) {
            return next(new Error("No Assigin By Given"));
        };
    };
    async.waterfall([
        function saveCall(callResult) {
            data.call.client_id = data.servicerequest.client_id;
            data.call.area_id = data.servicerequest.area_id;
            data.call["provider_id"] = req.user.provider_id._id;
            data.call["callreceivedby"] = req.user._id;
            var callData = new Model(data.call);
            callData.save(function(error, result) {
                if (error) return callback(error);
                callData = {};
                callData = result;
                return callResult(null, callData);
            });
        },
        function saveClient(callResult, clientResult) {
            var id = data.call.client_id;
            var clientData = {};
            ModelClient.findById(id, function(error, result) {
                if (error) return callback(error);
                //clientData = {};
                //clientData = result;
                //console.log(result.demography.addresses.length);
                for (var key in data.call.client_id) {
                    if (typeof result[key] !== "function") {
                        result[key] = data.call.client_id[key];
                    };
                }
                result.save(function(error, result) {
                    if (error) return next(error);
                    if (result) {
                        clientData = {};
                        clientData = result;
                        //console.log(clientData.demography.addresses.length);
                        return clientResult(null, callResult, clientData);
                    }
                })
            });
        },
        function getServiceTube(callResult, clientResult, tubeResult) {
            var tempServiceExternalIds = []
            if (!data.servicerequest.masterservices)
                return callback(new Error("No services added"));
            for (var i = 0; i < data.servicerequest.masterservices.length; i++) {
                tempServiceExternalIds.push(data.servicerequest.masterservices[i].service_id.externalId)
            }
            // console.log(tempServiceExternalIds)
                //todo get tubes from service external ID
                /*Model.serviceTubeList(tempServiceExternalIds, function(e, result) {
                if (e) return next(e);
                data.servicerequest.tubes = result;
                return tubeResult(null, callResult, clientResult);
                });*/
            return tubeResult(null, callResult, clientResult);
        },
        function saveOrder(callResult, clientResult, orderResult) {
            var order = {};
            if (data.servicerequest.assignby) {
                order["assignby"] = data.servicerequest.assignby;
                if (!data.servicerequest.assignto) {
                    return next(new Error("Order Not Created"));
                } else {
                    order["assignto"] = data.servicerequest.assignto;
                }
            };
            order["comments"] = [];
            // added new attribute to record srl incident number for clims
            order["orderId"] = data.servicerequest.orderId
                //end()
            order["comments"].push(data.servicerequest.comment);
            order["status"] = data.servicerequest.status;
            order["fromdate"] = data.servicerequest.fromdate;
            order["provider_id"] = req.user.provider_id._id;
            order["area_id"] = data.servicerequest.area_id;
            order["partner_id"] = data.call.partner_id;
            order["todate"] = data.servicerequest.todate;
            order["fromtime"] = data.servicerequest.fromtime;
            order["servicedeliveryaddress"] = data.servicerequest.servicedeliveryaddress;
            order["totime"] = data.servicerequest.totime;
            order["paymentdetails"] = data.servicerequest.paymentdetails; //call_id
            order["masterservices"] = data.servicerequest.masterservices;
            order["services"] = data.servicerequest.services;
            order["createdby"] = req.user._id;
            order["call_id"] = callResult._id;
            order["client_id"] = data.call.client_id;
            //STATUS LOG added by Talat and Paresh*/
            order.statuslog = [];
            var statusLogObj = {
                status: data.servicerequest.status,
                statustimestamp: Date(),
                statusby: req.user._id
            }
            if (data.servicerequest.gelocation) statusLogObj.coordinates = data.servicerequest.gelocation.coordinates;
            order.statuslog.push(statusLogObj);
            order["droppointaddress"] = data.call.droppointaddress;
            order.log = [];
            var logobj = {};
            logobj.comments = "Order created";
            logobj["updatedby"] = req.user._id;
            logobj["updateddatetime"] = Date();
            order.log.push(logobj);
            var addOrder = new ModelOrder(order);
            addOrder.save(function(error, result) {
                if (error) return callback(error);
                order = {};
                order = result;
                var climsObj;
                var error = false;
                climsParser.makeClimsEntry(result, "add", function(error, climsParserResult) {
                    //need to JSON.parse response not in correct format
                    if (error) return orderResult(error)
                    if (climsParserResult == "error") {
                        error = true
                        console.log("result received with error");
                        ModelOrder.findById(result._id, function(error, result) {
                            if (error) return orderResult(error)
                            return orderResult(null, callResult, clientResult, orderResult);
                        }).populate(populateQuery)
                    } else {
                        console.log("success result");
                        climsObj = JSON.parse(climsParserResult);
                        ModelOrder.findById(result._id, function(error, idOrderResult) {
                            if (error) return orderResult(error)
                            idOrderResult.externalId = climsObj.OrderID
                            console.log("ID " + idOrderResult._id);
                            idOrderResult.save(function(error, finalOrderResult) {
                                if (error) return orderResult(error)
                                ModelClient.findById(idOrderResult.client_id._id, function(error, cliResult) {
                                    if (error) return orderResult(error)
                                    if (result) {
                                        // console.log(cliResult);
                                        // console.log("@@@@@@@");
                                        // console.log(cliResult.externalId);
                                        // console.log("@@@@@@@");
                                        // console.log("*********************************");
                                        // console.log("Clint_id " + result._id);
                                        // console.log("Clims " + climsObj.PatientCode);
                                        // console.log("Old " + cliResult.externalId);
                                        cliResult.clientcode = climsObj.PatientCode
                                        // console.log("Json " + climsObj.PatientCode);
                                        // console.log("Replaced " + cliResult.externalId);
                                        // console.log("*********************************");
                                        cliResult.save(function(error, res) {
                                            if (error) return orderResult(error)
                                            return orderResult(null, callResult, clientResult, orderResult);
                                        })
                                    } else {
                                        return orderResult(null, callResult, clientResult, orderResult);
                                    }
                                })
                            })
                        }).populate(populateQuery);
                    }
                })
            });
        }
    ], function(error, callResult, clientResult, orderResult) {
        if (error) return callback(error);
        return callback(null, callResult);
    });
}
