var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var Model = require('../../models/Call');
var ModelServicesRequest = require('../../models/ServiceRequest');
var ModelPartnerService = require('../../models/PartnerService');
var ModelClient = require('../../models/Client');
var ModelOrder = require('../../models/Order');
var ModelPartner = require('../../models/Partner');
var ModelOrderRelation = require('../../models/OrderRelation');
var controllerOrder = require('../../controllers/order');

exports.add = function(req, res, next) {
    var data = req.body;
    var tempType;
    // if (!data.servicerequest.orderjson) {
    //     res.json({
    //         error: "orderjson missing"
    //     });
    // }

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
        // addAllRequest(data, req, function(error, result) {
        addCallNew(data, req, function(error, result) {            
            if (error) return next(error);

            var populateOpts = [
                { path: 'servicedeliveryaddress.city_id' }
            ];

            ModelOrder.populate(result, populateOpts, function(e, populateResult){
                if (e) return next(e);

                return res.json({
                    response: result
                });
            });

            // Model.findById(result._id, function(error, result) {
            //     if (error) return next(error);

            //     res.json({
            //         response: result
            //     });
            // })

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
    var tempOrderJSON, parentOrderUpdate = false;
    var order = {},updateFlag = false;

    async.waterfall([
        //save call
        function saveCall(callResultFun) {

            data.call.client_id = data.servicerequest.client_id;
            data.call.area_id = data.servicerequest.area_id;
            data.call["provider_id"] = req.user.provider_id._id;
            data.call["callreceivedby"] = req.user._id;

            var callData = new Model(data.call);
            callData.save(function(error, result) {
                if (error) return callback(error);
                // callData = {};
                // callData = result;
                return callResultFun(null,result);
            });
        },
        //save client
        function saveClient(callResult, clientResultFun) {
            // console.log("saveClient");
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
                        // console.log("Call Object: " + Object.keys(callResult).length)
                        return clientResultFun(null, callResult, result);
                    }
                })

            });
        },        
        //get services
        function getServiceIds (callResult, clientResult, serviceNextFunc) {
            // console.log("getServiceIds");
            var tempServiceIds = []
            for (var i = 0; i < data.servicerequest.services.length; i++) {
                if (data.servicerequest.services[i].service_id._id)
                    tempServiceIds.push(data.servicerequest.services[i].service_id._id)
                else
                    tempServiceIds.push(data.servicerequest.services[i].service_id)
            }
            
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };
            ModelPartnerService.find(searchTest,function (err, partnerTests) {
               if(err) return res.json({error:"Error while getiing partnerTest: " + err});

               if(partnerTests){
                tempServiceIds = [], tempProfileIds = [];
                for (var i = 0; i < partnerTests.length; i++) {
                    // if tests                                   
                    if(partnerTests[i].category == "TEST"){
                        tempServiceIds.push(partnerTests[i]._id)
                        // partnerTests[i].masterservice.tubes.forEach(function (tube) {
                        //     tempTubes = tubeUpdate(tube,tempTubes,partnerTests[i].masterservice.department_id._id, shareTubeFlag);                            
                        // })
                    } 
                    // if profiles
                    else if(partnerTests[i].category == "PROFILE"){
                        partnerTests[i].childs.forEach(function (child) {
                            tempServiceIds.push(child.test_id._id)
                            // child.tubes.forEach(function (tube) {
                            //     tempTubes = tubeUpdate(tube,tempTubes,child.department_id._id, shareTubeFlag);
                            // })
                        });   
                    }
                     // if packages
                    else if(partnerTests[i].category == "PACKAGES"){
                        //console.log(partnerTests[i].childs)

                        partnerTests[i].childs.forEach(function (child) {
                            if (child.test_id.category == 'TEST') {
                                // console.log("Package.Test")
                                tempServiceIds.push(child.test_id._id);
                            }
                            else if(child.test_id.category == 'PROFILE'){
                                // console.log("Package.Profile")
                                child.test_id.childs.forEach(function (profileTest) {
                                    // console.log("Package.Profile.Test_id: " + profileTest.test_id._id)
                                    tempServiceIds.push(profileTest.test_id._id);
                                })

                            }
                        });
                    }               
                };
                
               }
               //console.log(tempServiceIds);
               // console.log("Call Object: " + Object.keys(callResult).length)
               return serviceNextFunc(null, callResult, clientResult, tempServiceIds);
            }).populate("childs.test_id");     
        },
        //partner sharetube information
        function (callResult, clientResult, tempServiceIds, partnerNextFunc) {
            ModelPartner.findById(data.call.partner_id, function (err, partnerObj) {
               if(err) return callback({error:"Error while getiing partnerTest: " + err});
               // console.log("Call Object: " + Object.keys(callResult).length)
               partnerNextFunc(null,callResult,clientResult, tempServiceIds, partnerObj.sharetubes);
            }).populate('partner_id');
        },
        // get service tube list
        function getServiceTubes(callResult, clientResult, tempServiceIds, shareTubeFlag, tubeResultFunc) {
            // console.log("getServiceTubes");            
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };
            var tempTubes = [], index;
            ModelPartnerService.find(searchTest,function (err, partnerTests) {
               if(err) return callback({error:"Error while getiing partnerTest: " + err});

               if(partnerTests){
                for (var i = 0; i < partnerTests.length; i++) {                    
                    if(partnerTests[i].masterservice){
                        
                        partnerTests[i].masterservice.tubes.forEach(function (tube) {
                            index = _.findIndex(tempTubes, function(t) { return t._id == tube._id; }); 
                            if (index<0){
                               var tubeObj = {
                                   count:1,
                                   _id: tube._id,
                                   company: tube.company,
                                   size: tube.size,
                                   type: tube.type,
                                   department_id: []
                               }
                               tubeObj.department_id.push(partnerTests[i].masterservice.department_id._id);
                               tempTubes.push(tubeObj);
                            }
                            else{
                                if(!shareTubeFlag && _.findIndex(tempTubes[index].department_id, function(o){return o==partnerTests[i].masterservice.department_id._id})<0){
                                    tempTubes[index].count++;
                                    tempTubes[index].department_id.push(partnerTests[i].masterservice.department_id._id);
                                }
                            }
                        })
                    }                   
                };
               }
               // console.log("Call Object: " + Object.keys(callResult).length)
               return tubeResultFunc(null, callResult, clientResult,  tempTubes);
            });
            // return tubeResult(null, callResult, clientResult);              
        },
        // check if ORder exist base client time date and ordertype
        function getOrder(callResult, clientResult,  tempTubes, getOrderNextFunc) {
            var search = {
                client_id: clientResult._id,
                fromdate:data.servicerequest.fromdate,
                fromtime:data.servicerequest.fromtime,
                ordertype:data.servicerequest.ordertype,
                $and:[{"status":{$ne:'Cancelled'}},{"status":{$ne:'Completed'}}]
            }            
                     
            ModelOrder.findOne(search,{},{lean:true},function (err, returnOrder) {
                if(err) return callback({error:"Error while getiing order: " + err});
                
                if(returnOrder){
                    order = returnOrder;
                    updateFlag = true;
                    return getOrderNextFunc(null, callResult,clientResult, tempTubes);                   
                }
                else
                    return getOrderNextFunc(null, callResult,clientResult, tempTubes);
            })
        },
        // save order
        function saveOrder(callResult, clientResult, tubes, orderResultFunc) {
            // console.log("saveOrder");
            
            if (data.servicerequest.assignby) {
                order["assignby"] = data.servicerequest.assignby;
                if (!data.servicerequest.assignto) {
                    return next(new Error("Order Not Created"));
                } else {
                    order["assignto"] = data.servicerequest.assignto;
                }
            };

            order["comments"] = [];
            if (data.servicerequest.comment) 
                order["comments"].push(data.servicerequest.comment);

            if (data.visitcomments) 
                order["visitcomments"].push(data.visitcomments);

            order["status"] = data.servicerequest.status;
            order["fromdate"] = data.servicerequest.fromdate;
            order["provider_id"] = req.user.provider_id._id;
            order["area_id"] = data.servicerequest.area_id;
            order["partner_id"] = data.call.partner_id;
            order["todate"] = data.servicerequest.todate;
            order["fromtime"] = data.servicerequest.fromtime;
            order["servicedeliveryaddress"] = data.servicerequest.servicedeliveryaddress;
            order["totime"] = data.servicerequest.totime;

            if(!data.call.orderGroupId)
                order["orderGroupId"] = mongoose.Types.ObjectId();
            else
                order["orderGroupId"] = data.call.orderGroupId;
                
            //if child visit keep visiting charge 0;
            // console.log("before")
            
            if (data.call.parentorder_id ){
                var tempPaymentDetails = {
                    amount: data.servicerequest.paymentdetails.amount,
                    discount:data.servicerequest.paymentdetails.discount,
                    paymentoption: data.servicerequest.paymentdetails.paymentoption,
                    visitingcharges:0
                }

                // ToDo temp solution in case dipika creating order
                if (data.call.notAddVisitChargeToParent) 
                    tempPaymentDetails.visitingcharges = data.servicerequest.paymentdetails.visitingcharges
                
                order["paymentdetails"] = tempPaymentDetails;
                // console.log("after")
                
            }
            else
                order["paymentdetails"] = data.servicerequest.paymentdetails;
            // console.log(data.servicerequest.droppointaddress);
            order["droppointaddress"] = data.servicerequest.droppointaddress;
            order["logistic"] = data.servicerequest.logistic;
            console.log(order.logistic);
            order["services"] = data.servicerequest.services;
            order["tubes"] = tubes;
            order["createdbyname"] = data.servicerequest.createdbyname;
            order["createdby"] = req.user._id;
            order["call_id"] = callResult._id;
            order["client_id"] = data.call.client_id;
            order["specialneed"] = data.servicerequest.specialneed;
            // console.log("parentorder_id");
            // console.log(data.call.parentorder_id);
            order["parentorder_id"] = data.call.parentorder_id;
            order["ordertype"] = data.servicerequest.ordertype;
            
            //STATUS LOG added by Talat and Paresh*/
            order.statuslog = [];
            var statusLogObj = {
                status: data.servicerequest.status,
                statustimestamp: Date(),
                statusby: req.user._id
            }
            if (data.servicerequest.geolocation) statusLogObj.coordinates = data.servicerequest.geolocation.coordinates;
            order.statuslog.push(statusLogObj);

            order.log = [];
            var logobj = {};
            logobj.comments = "Order created";
            logobj["updatedby"] = req.user._id;
            logobj["updateddatetime"] = Date();
            order.log.push(logobj);
            var addOrder = new ModelOrder(order);
            
            if (updateFlag) {
                ModelOrder.update({_id:order._id}, {$set:order}, function(err, count) {
                    if (err) return callback(err);
                    ModelOrder.findById(order._id, function(error, returnOrder) {
                        return orderResultFunc(null, returnOrder);
                     }).select("-signature -prescriptions").populate([ {path: 'partner_id',select: '_id info.name externalId info.code workinghour'}, {path: 'services.service_id',select: 'name code childs postsample postservices sampletype customerinstruction specialinstruction'}, {path:'client_id' ,select: '_id externalId demography'}]);
                })
            }
            else{
                addOrder.save(function(error, result) {
                    if (error) return callback(error);
                    ModelOrder.findById(result._id, function(error, returnOrder) {
                        return orderResultFunc(null, returnOrder);
                    }).select("-signature -prescriptions").populate([ {path: 'partner_id',select: '_id info.name externalId info.code workinghour'}, {path: 'services.service_id',select: 'name code childs postsample postservices sampletype customerinstruction specialinstruction'}, {path:'client_id' ,select: '_id externalId demography'}]);                   
                });
            }
        },
        
    ], function(error, orderResult) {
        if (error) return callback(error);
        return callback(null, orderResult);
    });
}


function addCallNew(data, req, callback) {
    var tempServiceIds, shareTubeFlag, tempTubes, order = {}, updateFlag;
    async.waterfall([
        //get services
        function getServiceIds (serviceNextFunc) {
            // console.log("getServiceIds");
            tempServiceIds = []
            for (var i = 0; i < data.servicerequest.services.length; i++) {
                if (data.servicerequest.services[i].service_id._id)
                    tempServiceIds.push(data.servicerequest.services[i].service_id._id)
                else
                    tempServiceIds.push(data.servicerequest.services[i].service_id)
            }
            
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };
            ModelPartnerService.find(searchTest,function (err, partnerTests) {
               if(err) return res.json({error:"Error while getiing partnerTest: " + err});

               if(partnerTests){
                tempServiceIds = [], tempProfileIds = [];
                for (var i = 0; i < partnerTests.length; i++) {
                    // if tests                                   
                    if(partnerTests[i].category == "TEST"){
                        tempServiceIds.push(partnerTests[i]._id)
                        // partnerTests[i].masterservice.tubes.forEach(function (tube) {
                        //     tempTubes = tubeUpdate(tube,tempTubes,partnerTests[i].masterservice.department_id._id, shareTubeFlag);                            
                        // })
                    } 
                    // if profiles
                    else if(partnerTests[i].category == "PROFILE"){
                        partnerTests[i].childs.forEach(function (child) {
                            tempServiceIds.push(child.test_id._id)
                            // child.tubes.forEach(function (tube) {
                            //     tempTubes = tubeUpdate(tube,tempTubes,child.department_id._id, shareTubeFlag);
                            // })
                        });   
                    }
                     // if packages
                    else if(partnerTests[i].category == "PACKAGES"){
                        //console.log(partnerTests[i].childs)

                        partnerTests[i].childs.forEach(function (child) {
                            if (child.test_id.category == 'TEST') {
                                // console.log("Package.Test")
                                tempServiceIds.push(child.test_id._id);
                            }
                            else if(child.test_id.category == 'PROFILE'){
                                // console.log("Package.Profile")
                                child.test_id.childs.forEach(function (profileTest) {
                                    // console.log("Package.Profile.Test_id: " + profileTest.test_id._id)
                                    tempServiceIds.push(profileTest.test_id._id);
                                })

                            }
                        });
                    }               
                };
                
               }
               //console.log(tempServiceIds);
               // console.log("Call Object: " + Object.keys(callResult).length)
               return serviceNextFunc(null);
            }).populate("childs.test_id");     
        },
        //partner sharetube information
        function (partnerNextFunc) {
            ModelPartner.findById(data.call.partner_id, function (err, partnerObj) {
               if(err) return callback({error:"Error while getiing partnerTest: " + err});
               // console.log("Call Object: " + Object.keys(callResult).length)
               shareTubeFlag = partnerObj.sharetubes;
               partnerNextFunc(null);
            }).populate('partner_id');
        },
        // get service tube list
        function getServiceTubes(tubeResultFunc) {
            // console.log("getServiceTubes");            
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };
            tempTubes = [];
            var index;
            ModelPartnerService.find(searchTest,function (err, partnerTests) {
               if(err) return callback({error:"Error while getiing partnerTest: " + err});

               if(partnerTests){
                for (var i = 0; i < partnerTests.length; i++) {                    
                    if(partnerTests[i].masterservice){
                        
                        partnerTests[i].masterservice.tubes.forEach(function (tube) {
                            index = _.findIndex(tempTubes, function(t) { return t._id == tube._id; }); 
                            if (index<0){
                               var tubeObj = {
                                   count:1,
                                   _id: tube._id,
                                   company: tube.company,
                                   size: tube.size,
                                   type: tube.type,
                                   department_id: []
                               }
                               tubeObj.department_id.push(partnerTests[i].masterservice.department_id._id);
                               tempTubes.push(tubeObj);
                            }
                            else{
                                if(!shareTubeFlag && _.findIndex(tempTubes[index].department_id, function(o){return o==partnerTests[i].masterservice.department_id._id})<0){
                                    tempTubes[index].count++;
                                    tempTubes[index].department_id.push(partnerTests[i].masterservice.department_id._id);
                                }
                            }
                        })
                    }                   
                };
               }
               // console.log("Call Object: " + Object.keys(callResult).length)
               return tubeResultFunc(null);
            });
            // return tubeResult(null, callResult, clientResult);              
        },
        // check if ORder exist base client time date and ordertype
        function getOrder(getOrderNextFunc) {
            var search = {
                client_id: data.call.client_id,
                fromdate:data.servicerequest.fromdate,
                fromtime:data.servicerequest.fromtime,
                ordertype:data.servicerequest.ordertype,
                $and:[{"status":{$ne:'Cancelled'}},{"status":{$ne:'Completed'}}]
            }            
                     
            ModelOrder.findOne(search,{},{lean:true},function (err, returnOrder) {
                if(err) return callback({error:"Error while getiing order: " + err});
                
                if(returnOrder){
                    order = returnOrder;
                    updateFlag = true;
                    return getOrderNextFunc(null);                   
                }
                else
                    return getOrderNextFunc(null);
            })
        },
        // save order
        function saveOrder(orderResultFunc) {
            // console.log("saveOrder");
            
            if (data.servicerequest.assignby) {
                order["assignby"] = data.servicerequest.assignby;
                if (!data.servicerequest.assignto) {
                    return next(new Error("Order Not Created"));
                } else {
                    order["assignto"] = data.servicerequest.assignto;
                }
            };

            order["comments"] = [];
            if (data.servicerequest.comment) 
                order["comments"].push(data.servicerequest.comment);

            if (data.visitcomments) 
                order["visitcomments"].push(data.visitcomments);

            order["status"] = data.servicerequest.status;
            order["fromdate"] = data.servicerequest.fromdate;
            order["provider_id"] = req.user.provider_id._id;
            order["area_id"] = data.servicerequest.area_id;
            order["partner_id"] = data.call.partner_id;
            order["fromtime"] = data.servicerequest.fromtime;
            order["servicedeliveryaddress"] = data.servicerequest.servicedeliveryaddress;
            order["totime"] = data.servicerequest.totime;
            if (!data.servicerequest.totime) 
                order["totime"] = data.servicerequest.fromtime;
            order["todate"] = data.servicerequest.todate;
            if (!data.servicerequest.todate) 
                order["todate"] = data.servicerequest.fromdate;

            if(!data.call.orderGroupId)
                order["orderGroupId"] = mongoose.Types.ObjectId();
            else
                order["orderGroupId"] = data.call.orderGroupId;
                
            //if child visit keep visiting charge 0;
            // console.log("before")
            
            if (data.call.parentorder_id ){
                var tempPaymentDetails = {
                    amount: data.servicerequest.paymentdetails.amount,
                    discount:data.servicerequest.paymentdetails.discount,
                    paymentoption: data.servicerequest.paymentdetails.paymentoption,
                    visitingcharges:0
                }

                // ToDo temp solution in case dipika creating order
                if (data.call.notAddVisitChargeToParent) 
                    tempPaymentDetails.visitingcharges = data.servicerequest.paymentdetails.visitingcharges
                
                order["paymentdetails"] = tempPaymentDetails;
                // console.log("after")
                
            }
            else
                order["paymentdetails"] = data.servicerequest.paymentdetails;
            // console.log(data.servicerequest.droppointaddress);
            order["droppointaddress"] = data.servicerequest.droppointaddress;
            order["logistic"] = data.servicerequest.logistic;
            order["services"] = data.servicerequest.services;
            order["tubes"] = tempTubes;
            order["createdbyname"] = data.servicerequest.createdbyname;
            order["createdby"] = req.user._id;
            order["client_id"] = data.call.client_id;
            order["specialneed"] = data.servicerequest.specialneed;
            // console.log("parentorder_id");
            // console.log(data.call.parentorder_id);
            order["parentorder_id"] = data.call.parentorder_id;
            order["ordertype"] = data.servicerequest.ordertype;
            
            //STATUS LOG added by Talat and Paresh*/
            order.statuslog = [];
            var statusLogObj = {
                status: data.servicerequest.status,
                statustimestamp: Date(),
                statusby: req.user._id
            }
            if (data.servicerequest.geolocation) statusLogObj.coordinates = data.servicerequest.geolocation.coordinates;
            order.statuslog.push(statusLogObj);

            order.log = [];
            var logobj = {};
            logobj.comments = "Order created";
            logobj["updatedby"] = req.user._id;
            logobj["updateddatetime"] = Date();
            order.log.push(logobj);
            var addOrder = new ModelOrder(order);

            if (updateFlag) {
                ModelOrder.update({_id:order._id}, {$set:order}, function(err, count) {
                    if (err) return callback(err);
                    return orderResultFunc(null);
                })
            }
            else{
                addOrder.save(function(error, result) {
                    if (error) return callback(error);
                    order._id = result._id;
                    return orderResultFunc(null);                   
                });
            }
        },
        
    ], function(error, orderResult) {
        if (error) return callback(error);
        controllerOrder.getOrderById(order._id, function (error, order) {
            if (error) return callback(error);
            return callback(null, order);
        })       
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
