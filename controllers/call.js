var _ = require('lodash');
var async = require('async');
var Model = require('../models/Call');
var functionList = require('./functionList');
var ModelServicesRequest = require('../models/ServiceRequest');
var ModelClient = require('../models/Client');
var ModelOrder = require('../models/Order');
var geocoderProvider = 'google';
var httpAdapter = 'http';

exports.getList = function(req, res, next) {
    var search = {};
    var request = {};
    var option = {
        page: req.query.page,
        limit: parseInt(req.query.limit),
        lean: true
    }



    // /***  [remove comment when provider being config ] **/
    if (!req.user.provider_id._id) {
        search["provider_id"] = req.user.provider_id._id;
    };


    if (req.query.contactnumber) {
        search["contactnumber"] = new RegExp(req.query.contactnumber, "i");
    }

    if (req.params.id) {
        getById(req.params.id, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    };



    if (req.query.page || parseInt(req.query.limit)) {
        Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
            if (error) {
                return next(error)
            }
            getAllResultWithOrder(paginatedResults, function(error, result) {
                res.json({
                    response: result,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            })
        });
    } else {
        Model.find(search, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    }
}



function getById(id, callback) {
    Model.findById(id, function(error, result) {
        if (error) return callback(error);
        return callback(null, result);
    });
}


exports.add = function(req, res, next) {
    // console.log("into generic call ");
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

exports.update = function(req, res, next) {
    var id = req.params.id;
    var data = req.body;
    if (!id) return next(new Error("No Id Present To Update Call"));
    if (!data.client_id) return next(new Error("No Client_id Presnt To Update"));
    Model.findById(id, function(error, result) {
        {
            if (error) return next(error);
            for (var key in data) {
                if (typeof result[key] !== "function") {
                    result[key] = data[key];
                };
            }
            result.save(function(error, result) {
                if (error) return next(error);
                Model.findById(result._id, function(error, result) {
                    if (error) return next(error);
                    res.json({
                        response: result
                    });
                })
            });
        }
    });
}


/**[save call client and order if data.client.type == 'servicerequest'] */
function addAllRequest(data, req, callback) {
    // console.log("into generic addAllRequest");
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
                return orderResult(null, callResult, clientResult, orderResult);
            });
        }
    ], function(error, callResult, clientResult, orderResult) {
        if (error) return callback(error);
        return callback(null, callResult);

    });
}


/* [ get all result with orders  records ]*/
function getAllResultWithOrder(paginatedResults, callback) {
    var newArray = [];
    async.each(paginatedResults, function(obj, nextObj) {
        obj = obj.toObject();
        var orderSearch = {};
        orderSearch["call_id"] = obj._id;
        newArray.push(obj);
        ModelOrder.find(orderSearch, function(error, result) {
            if (error) return nextObj(error);
            obj['orders'] = result;
            return nextObj()
        });
    }, function(error) {
        return callback(error, newArray);
    });

}

exports.srlServicePrice = function(req, res, next) {
    //console.log(req.query)
    Model.servicePriceList(req, function(e, result) {
        if (e) return next(e);

        res.json(result);
    });
}

exports.srlServiceTube = function(req, res, next) {
    //console.log(req.query)
    Model.serviceTubeList(req, function(e, result) {
        if (e) return next(e);

        res.json(result);
    });
}
