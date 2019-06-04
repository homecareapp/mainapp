  var mongoose = require('mongoose');
var Model = require('../models/Order');
var ModelPartner = require('../models/Partner');
var ModelClient = require('../models/Client');
var ModelArea = require('../models/Area');
var helperVisitCharge = require('./helpervisitcharge');
var _ = require("lodash");
var clientController = require('./client');
var userController = require('./user');
var addressController = require('./address');
var partnerServiceController = require('./partnerservice');
var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;
var async = require('async');
var partnerController = require('./partner');
var ModelUser = require('../models/User');

var globalLogKeyPair = require("../data/logkeypair");

var populateOrder = [
    {
        path: 'log.updatedby',
        select: '_id profile.name'
    }
]

function getGlobalLogKeyPair(){
    return JSON.parse(JSON.stringify(globalLogKeyPair));
}

exports.getPartnerLog = function (req,res,next) {
    var params = req.query;
    params.provider_id = req.user.provider_id._id;

    partnerOrderLog(params, function (e,r) {
        if(e) return next(new Error(e));

        return res.json({response:r});
    })
}

exports.changeorderaddress = function (req, res, next) {
    var inputParams = {        
        addressObj:req.body.address,
        id:req.params.id,
        user_id: req.user._id,
        client_id:req.body.client_id,
        visitingcharges:req.body.visitingcharges,
        parentorder_id:req.body.parentorder_id        
    }

    changeOrderAddr(inputParams, function(e,r) {
       //if(e) return next(new Error(e));
       if(e) return res.json({message:e}); 
       return res.json({
            order:r
       }); 
    });
}

exports.getOrder = function(req,res,next){
    getById(req.params.id, function(e,r){
        if(e) return next(new Error(e));
        return res.json({
            response:r
        });
    });
}
exports.getById = getById;

exports.assignphlebo = function(req, res, next) {
    var inputParams = req.body;
    inputParams.id = req.params.id;
    inputParams.coordinates = [];
    inputParams.user_id = req.user._id;
    
    if (!inputParams.assignto) return next(new Error("Assignedto id is required"));

    assignPhlebo(inputParams, function(e,r){
        if(e) return next(new Error(e));
        return res.json({
            order:r
        });
    });
}

// assignPhlebo
function assignPhlebo(params, callback){
    if(!params.user_id) return callback("User not found")
    if(!params.assignto) return callback("assignto not found")
    if(!params.id) return callback("assignto not found")

    Model.findById(params.id, {log:1, statuslog:1, status:1, logistic:1, assignto:1}, {lean:true}, function(error, result) {
        if (error) return callback(error)
        if (!result) return callback("No order found");

        var log = function() {
            var logobj = {};
            logobj["oldstatus"] = result.status;
            logobj["newstatus"] = "Open";
            logobj["oldassignto"] = result.assignto;
            logobj["newassignto"] = params.assignto;
            logobj["comments"] = "Phlebo assigned.";
            logobj["updatedby"] = params.user_id;
            logobj["updateddatetime"] = Date();

            if (!result.log) result.log = [];
            result.log.push(logobj);
            return result.log;
        }

        var statuslog = function() {
            if(!result.statuslog) result.statuslog = [];
            if (result.status != "Open") {
                var statusLogObj = {
                    status: "Open",
                    statustimestamp: Date(),
                    comment: "Phlebo assigned.",
                    statusby: params.user_id,
                    coordinates: params.coordinates
                }
                result.statuslog.push(statusLogObj);
            }
            return result.statuslog;
        };

        function defaultLogistic(){
            return {
                delivertype:"DeliverToLab",
                username:"Deliver To Lab"
            }             
        }

        //default logistic if logistic is not assigned

        if(result.logistic)
        {
            if(!result.logistic.delivertype) 
            {
                result.logistic = defaultLogistic();
            }
        }
        else
        {
            result.logistic = defaultLogistic();
        }

        var updateParams = {
            statuslog:      statuslog(),
            //log:            log(),
            status:         "Open",
            assignto:       params.assignto,
            assignby:       params.user_id,
            logistic:       result.logistic
        } 

        async.waterfall([
            // get order by ID
            function(next) {
                var logobj = {};
                logobj["oldstatus"] = result.status;
                logobj["newstatus"] = "Open";
                logobj["oldassignto"] = result.assignto;
                logobj["newassignto"] = params.assignto;
                logobj["comments"] = "Phlebo assigned.";
                logobj["updatedby"] = params.user_id;
                logobj["updateddatetime"] = Date();
                logobj["old"] = [];
                logobj["new"] = [];
                ModelUser.findById(result.assignto, {profile:1}, {lean:true}, function(error, oldPhlebo) {
                    if(oldPhlebo)
                        logobj["old"].push({"key":"assign to","value":oldPhlebo.profile.name});
                    else
                        logobj["old"].push({"key":"assign to","value":"none"});
                    ModelUser.findById(params.assignto, {profile:1}, {lean:true}, function(error, newPhlebo) {
                        logobj["new"].push({"key":"assign to","value":newPhlebo.profile.name});
                        if (!result.log) result.log = [];
                        result.log.push(logobj);
                        updateParams.log = result.log;

                        return next(null)
                    })
                })
                
            }
        ],function(error) {
            Model.update({_id:params.id}, {$set:updateParams}, function(e,r){
                if(e) return callback(e);

                getById(params.id, function(e,order){
                    if(e) return callback(e);
                    return callback(null, order);
                });
            })
            
        })

        
        
    }).populate([]);
}

//orderLog for partner users
function partnerOrderLog(params, callback) {
    if(!params.partner_id) return callback("partner_id missing");
    if(!params.order_id) return callback("order_id missing");
    var users, logs = [];

    //get users for role:partnerfrontoffice and partnerid
    var getUsers = function(next){
        var search = {
            '$or':[
                {'role':'partnerfrontoffice'},
                {'role':'partnerteamlead'}
            ],

            'userinfo.partners': params.partner_id,
            'provider_id':params.provider_id
        }
        //call user controller to get users
        // userController.getUsers(search, function (e,r) {
        //     if(e) return next(e);
        //     users = r.response;
        //     return next(null)
        // });
        ModelUser.find(search, {}, {lean:true}, function(e, r) {
            if(e) return next(e);
            users = r;
            return next(null)
        });
    } // end of getUsers

    // get order logs of given partner users
    var getLogs = function(next){
        var populate = [
            {
                path: 'log.updatedby',
                select: '_id profile.name'
            }
        ]
        // get order
        getOrderById(params.order_id, {log:1}, populate, function (e,order) {
            if(e) return next(e);
            if(!order) return next("No order found");

            logs = _.filter(order.log, function (l) {
                return _.some(users, function (user) {
                    return user._id.equals(l.updatedby._id);
                });
            });

            return next(null);  
        })
    }// end of getLogs

    async.waterfall([getUsers,getLogs],function (err) {
        if(err) return callback(err);
        return callback(null, logs);
    });
}

//get order
function getById(id, callback) {
    var result;
    
    var getOrder = function(next) {
        var populate = [
            {
                path: 'partner_id',
                select: '_id info.name paymentoptions reportdeliverymode visitcharges areas discounts droppoints sharetubes'
            },
            {
                path: 'services.service_id',
                select: 'name _id code price alias customerinstruction specialinstruction specialinstructions customerinstructions childs postsample postservices sampletype description tubes pendingtubes discountnotapplicable customerinstructiontype masterservice category'                
            },
            {
                path: 'client_id',
                select: '_id externalId demography specialneeds'
            },
            {
                path: 'log.updatedby',
                select: '_id profile.name'
            },
            {
                path: 'statuslog.statusby',
                select: '_id profile.name'
            },
            {
                path: 'assignto',
                select: '_id profile.name profile.mobilenumber'
            },
            {
                path: 'assignby',
                select: '_id profile.name'
            },
            {
                path: 'logistic.logistic_id',
                select: '_id profile.name profile.mobilenumber'
            }
        ]

        getOrderById(id, {}, populate, function(e,r) {
            result = r;
            // return next(null); 
            if (result.status == "Open" || result.status == "Unassigned" || result.status == "Reached" || result.status == "Recieved") {
                helperVisitCharge.calculateVisitCharge(result.orderGroupId,result.fromdate, result.fromtime, result.partner_id._id, function (e, visitcharge) {            
                    if (e) next(null);
                    result.paymentdetails.visitingcharges = (visitcharge.fastingVisitsCharge + visitcharge.ppVisitCharge - visitcharge.collectedVisitCharge);
                    result.paymentdetails.totalvisitingcharges = visitcharge.fastingVisitsCharge + visitcharge.ppVisitCharge;
                    result.paymentdetails.collectedVisitCharge = visitcharge.collectedVisitCharge;
                    result.specialneed = result.client_id.specialneeds;
                    delete result.client_id.specialneeds;

                    return next(null);
                });
            }
            else
                return next(null);
        });
    }

    var getLinkedOrder = function(next){
        if(result.ordertype == "F"){
            getPPOrder(result._id, function (e,r) {
                result.ppOrder = r;
                return next(null);
            });
        }
        else{
            
            function options(){
                return {fromtime:1,fromdate:1,servicedeliveryaddress:1,orderGroupId:1,status:1, services:1};
            }

            function populate() {
                return [];
            }
            getOrderById(result.parentorder_id, options(),populate(),function (e,r) {
               result.fastingOrder = r;
               return next(null);    
            });
        }
    }

    var getAddressDetails = function(next){
        var inputParams = {
            partner_id:result.partner_id._id,
            ids:[result.servicedeliveryaddress._id]
        }
        addressController.getAddresses(inputParams, function(e,address){
            result.servicedeliveryaddress = address[0];
            return next(null);
        });
    }

    var getClientAddresses = function(next){
        var inputParams = {
            partner_id:result.partner_id._id,
            ids:[]
        }
        // if(result.client_id.demography.addresses)
        // {
        //     if(result.client_id.demography.addresses.length)
        //     {
                
        //     }
        // }
        if(result.client_id.demography.addresses)
        {
            result.client_id.demography.addresses.forEach(function(addr){
                inputParams.ids.push(addr._id);
            });
            addressController.getAddresses(inputParams, function(e,addresses){
                result.client_id.demography.addresses = addresses;
                return next(null);
            });
        }
        else
        {
            result.client_id.demography.addresses = [];
            return next(null);
        }
    }
    
    var getPrescrtCount = function(next){
        getPrescriptionCount(result._id, function(e,count){
            result.prescriptioncount = 0; //default zero
            
            if(e) return next(null);
            result.prescriptioncount = count;
            return next(null);
        });
    }

    // var getCI = function(next){
    //     partnerServiceController.getOrderCustomerInstructions(result.services, function(e, data){
    //         result.patientIntruction = data; 
    //         return next(null)
    //     })
    // }

    // var getSortedTubes = function(next) {
    //     partnerServiceController.getOrderTubesPriority(result, 'TubeType', function(e, tubes){
    //         if(e) return next(e);
    //         result.tubes = tubes;
    //         return next(null);
    //     });
    // }

    var getCIAndTubes = function(next){
        partnerServiceController.getTubesAndCI(result.services, result.partner_id.sharetubes, function(e,r) {
            result.tubes = r.tubes;
            result.patientIntruction = r.ci;
            result.specialIntruction = r.si;
            return next(null);
        });
    }

    function mergeDuplicates(list, prop, cb){
      return list.sort(function(a,b){
        if(a[prop] < b[prop]){ return -1;}
        if(a[prop] > b[prop]){return 1;}
        return 0;
      }).reduce(function(acc, item, index, array){
        if(index > 0 && array[index-1][prop] === item[prop]){
          cb(acc[acc.length-1], item);
          return acc;
        }else{
          var newItem = Object.assign({}, item);
          cb(newItem);
          acc.push(newItem);
          return acc;
        }
      }, []);
    }


    var addPendingTubes = function(next){
        if(result.ordertype == "F")
        {
            return next(null)
        }
        else
        {
            if(!result.pendingtubes)
            {
                result.pendingtubes = [];
            }

            var list = result.pendingtubes.concat(result.tubes);

            for (var i = 0; i < list.length; i++) {
                if(list[i]._id)
                {
                    list[i]._id = list[i]._id.toString();
                }
            }

            var newList = mergeDuplicates(list, "_id", function(item, dup){
                if(dup){
                  //item.count++;
                  item.count += dup.count;
                }
                // else{
                //   item.count = 1;
                // }        
            });
        }

        //sort tubes
        partnerServiceController.sortTubes(newList, 'TubeType', function(e,sotredTubes){
            result.tubes = sotredTubes;
            return next(null);
        });

        //result.tubes = newList;
        //return next(null);
    }

    var addpaymentoptions = function(next){
        if(!result.paymentdetails.paymentoptions)
        {
            result.paymentdetails.paymentoptions = [];
        }
        if(!result.paymentdetails.paymentoptions.length)
        {
            if(result.paymentdetails.paymentoption)
                result.paymentdetails.paymentoptions.push(result.paymentdetails.paymentoption);
        }
        return next(null)
    }

    var setdiscountapplicable = function(next){
        if(!result.paymentdetails.orderDiscount)
        {
            result.paymentdetails.orderDiscount = [];
        }
        for (var i = 0; i < result.paymentdetails.orderDiscount.length; i++) {
            if(!result.paymentdetails.orderDiscount[i].discountapplicable)
            {
                result.paymentdetails.orderDiscount[i].discountapplicable = 'TEST'
            }
        }
        return next(null)
    }

    async.waterfall([getOrder, getLinkedOrder, getAddressDetails, getClientAddresses, getPrescrtCount, getCIAndTubes, addPendingTubes, addpaymentoptions, setdiscountapplicable],function(error) {
        if(error) return callback(error);
        return callback(null, result); 
    });
}

//orders should be in object
function getPrescriptionCount (orderId, callback) {
    if(!orderId)  return prescriptionCB(new Error("Order ID not found"));
    Model.aggregate([
        { "$match" : { _id: orderId }}, 
        { $project: { prescriptioncount: { $size: "$prescriptions" } } } ], function(e, orderaggr){
            if (e) return callback(e);

            return callback(null, orderaggr[0].prescriptioncount)
    });
};

// generic getOrder method
function getOrderById(id, options, populate, callback){
    if(typeof options == "function") {
        callback = options;
        options = null;
    }
    else{
        options = {signature:0, prescriptions:0, schedulenotification:0, todate:0, totime:0};
    }
    if(typeof populate == "function") {
        callback = populate;
        populate = null;
    };
    if(!id) return callback("id missing");
    if(!populate) populate = populateOrder;


    Model.findById(id,options,{lean:true},function (e,r) {
        if(e) return callback(e);

        return callback(null, r);
    }).populate(populate);
}

//get PP order
function getPPOrder(parentId, callback) {
    // If Order type is fasting show   
    var search = {
        ordertype: "PP",
        parentorder_id: parentId,
        status:{$ne:"Cancelled"}
    }
    Model.findOne(search,{fromtime:1,fromdate:1,servicedeliveryaddress:1,orderGroupId:1,status:1, services:1, partner_id:1},{lean:true},function(error, ppOrder) {
        if (error) return callback(error);
        if(!ppOrder) return callback(null);
        var inputParams = {
            partner_id: ppOrder.partner_id,
            ids:[ppOrder.servicedeliveryaddress._id]
        }
        addressController.getAddresses(inputParams, function(e,addresses){
            ppOrder.servicedeliveryaddress = addresses[0];
            return callback(null, ppOrder)           
        })
    });   
}

//generic update order
function update(id, params, callback){
    if(!id) return callback("update id missing");
    if(!params) return callback("no update object found");

    Model.findByIdAndUpdate(id, {$set: params}, function(e,r){
        if(e) return callback(e);
         return callback(null, r);
    });
}

exports.getOldNewLogArray = getOldNewLogArray

function getOldNewLogArray (oldObject, newObject, arraykey)
{
    var oldArr = [];
    var newArr = [];
    if(Array.isArray(oldObject))
    {
        var idsOld = [];
        var idsNew = [];
        for (var i = 0; i < oldObject.length; i++) {
            if(typeof oldObject[i] == 'object')
            {
                if(arraykey == 'services')
                {
                    if(typeof oldObject[i].service_id  == 'object')
                    {
                        if(typeof oldObject[i].service_id._id == 'object')
                            idsOld.push(oldObject[i].service_id._id.toString());
                        else
                            idsOld.push(oldObject[i].service_id._id);
                    }
                    else
                    {
                        idsOld.push(oldObject[i].service_id)
                    }
                }
                else
                {
                    if(typeof oldObject[i]._id  == 'object')
                        idsOld.push(oldObject[i]._id.toString())
                    else
                        idsOld.push(oldObject[i]._id)
                }
                    
            }
        }
        for (var i = 0; i < newObject.length; i++) {
            if(typeof newObject[i] == 'object')
            {
                if(arraykey == 'services')
                {
                    if(typeof newObject[i].service_id == 'object')
                    {
                        if(typeof newObject[i].service_id._id == 'object')
                            idsNew.push(newObject[i].service_id._id.toString())
                        else
                            idsNew.push(newObject[i].service_id._id)
                    }
                    else
                    {
                        idsNew.push(newObject[i].service_id)
                    }
                }
                else
                {
                    if(typeof newObject[i]._id == 'object')
                        idsNew.push(newObject[i]._id.toString())
                    else
                        idsNew.push(newObject[i]._id)
                }
                    
            }
        }
        if(idsOld.length && idsNew.length)
        {
            if(idsOld.length > idsNew.length)
            {
                var diff = _.difference(idsOld, idsNew);
            }
            else
            {
                var diff = _.difference(idsNew, idsOld);
            }
        }
        else
        {
            if(oldObject.length > newObject.length)
            {
                var diff = _.difference(oldObject, newObject);
            }
            else
            {
                var diff = _.difference(newObject, oldObject);
            }
        }
        

        if(diff.length)
        {
            var obj = {};
            //obj[arraykey] = oldObject
            obj.key = arraykey;
            obj.value = oldObject
            oldArr.push(obj)

            var obj1 = {};
            //obj1[arraykey] = newObject
            obj1.key = arraykey;
            obj1.value = newObject
            newArr.push(obj1)
        }
    }
    else if(typeof oldObject == 'object')
    {
        for (var key in oldObject)
        {
            var keyexist=false;
            for (var key1 in newObject)
            {
                if(key == key1)
                {
                    keyexist = true;

                    if(oldObject[key] instanceof Date)
                    {
                        oldObject[key] = oldObject[key].toISOString()
                    }

                    if(Array.isArray(oldObject[key]))
                    {
                        var idsOld = [];
                        var idsNew = [];
                        for (var i = 0; i < oldObject[key].length; i++) {
                            if(typeof oldObject[key][i] == 'object')
                            {
                                idsOld.push(oldObject[key][i]._id.toString())
                            }
                        }
                        for (var i = 0; i < newObject[key1].length; i++) {
                            if(typeof newObject[key][i] == 'object')
                            {
                                idsNew.push(newObject[key1][i]._id.toString())
                            }
                        }
                        if(idsOld.length && idsNew.length)
                        {
                            if(idsOld.length > idsNew.length)
                            {
                                var diff = _.difference(idsOld, idsNew);
                            }
                            else
                            {
                                var diff = _.difference(idsNew, idsOld);
                            }
                        }
                        else
                        {
                            if(oldObject[key].length > newObject[key1].length)
                            {
                                var diff = _.difference(oldObject[key], newObject[key1]);
                            }
                            else
                            {
                                var diff = _.difference(newObject[key1], oldObject[key]);
                            }
                        }
                        

                        if(diff.length)
                        {
                            var obj = {};
                            //obj[key] = oldObject[key]
                            obj.key = key;
                            obj.value = oldObject[key]
                            oldArr.push(obj)

                            var obj1 = {};
                            //obj1[key1] = newObject[key1]
                            obj1.key = key1;
                            obj1.value = newObject[key1]
                            newArr.push(obj1)
                        }
                    }
                    else
                    {
                        if(oldObject[key] != newObject[key1])
                        {
                            var obj = {};
                            //obj[key] = oldObject[key]
                            obj.key = key;
                            obj.value = oldObject[key]
                            oldArr.push(obj)

                            var obj1 = {};
                            //obj1[key1] = newObject[key1]
                            obj1.key = key1;
                            obj1.value = newObject[key1]
                            newArr.push(obj1)
                        }
                    }
                }
                else
                {
                    if(!keyexist)
                    {
                        keyexist=false;
                    }
                }
            }

            if(!keyexist)
            {
                // removed key
                if(oldObject[key])
                {
                    var obj = {};
                    //obj[key] = oldObject[key]
                    obj.key = key;
                    obj.value = oldObject[key]
                    oldArr.push(obj)

                    var obj1 = {};
                    //obj1[key] = "none"
                    obj1.key = key1;
                    obj1.value = "none"
                    newArr.push(obj1)
                }
            }
        }

        //if new key added in new obhj
        for (var key in newObject)
        {
            var keyexist=false;
            for (var key1 in oldObject)
            {
                if(key == key1)
                {
                    keyexist = true;
                }
                else
                {
                    if(!keyexist)
                    {
                        keyexist=false;
                    }
                }
            }
            if(!keyexist)
            {
                if(oldObject[key])
                {
                    var obj = {};
                    //obj[key] = oldObject[key]
                    obj.key = key;
                    obj.value = oldObject[key]
                    oldArr.push(obj)

                    var obj1 = {};
                    //obj1[key] = "none"
                    obj1.key = key1;
                    obj1.value = "none"
                    newArr.push(obj1)
                }
            }
        }
    }

    
    var retobj = {};

    //check and convert to proper string
    retobj = checkKeyPair(oldArr, newArr)
    //end check and convert to proper string

    // retobj["newArr"] = newArr;
    // retobj["oldArr"] = oldArr
    return retobj;
}

function checkKeyPair (oldArr, newArr)
{
    var tempLogKeyPair = getGlobalLogKeyPair();
    for (var i = 0; i < oldArr.length; i++) {
        for (var j = 0; j < tempLogKeyPair.length; j++) {
            for(var key in tempLogKeyPair[j])
            {
                if( (key.trim()).toUpperCase() == (oldArr[i]["key"].trim()).toUpperCase() )
                {
                    oldArr[i]["key"] = tempLogKeyPair[j][key].trim();
                }
            }
        }
    }

    for (var i = 0; i < newArr.length; i++) {
        for (var j = 0; j < tempLogKeyPair.length; j++) {
            for(var key in tempLogKeyPair[j])
            {
                if( (key.trim()).toUpperCase() == (newArr[i]["key"].trim()).toUpperCase() )
                {
                    newArr[i]["key"] = tempLogKeyPair[j][key].trim();
                }
            }
        }
    }

    return {"newArr":newArr, "oldArr":oldArr}
}

// method to change order address
function changeOrderAddr(params, callback) {
    var logobj = {}, newAddr, order,
    //default reason for log
    reason = "Patient collection address updated";
    
    if (!params.client_id) return callback("client_id not found"); 
    if (!params.id) return callback("id not found"); 
    if (!params.addressObj) return callback("address not present");
    if (!params.visitingcharges) params.visitingcharges = 0;

    function prepAndUpdateOrder(nextFunc){
        //prepare log object
        var log = {};
        if (order.status == "Open" || order.status == "Recieved") {
            //if(params.addressObj.sublocation_text != order.servicedeliveryaddress.sublocation_text)
            if(params.addressObj.googleplace_id != order.servicedeliveryaddress.googleplace_id)
            {
                log.oldstatus = order.status;
                log.newstatus = "Unassigned";
                log.oldassignto = order.assignto;
                log.newassignto = undefined;
            }
        }
        
        
        log.comments = reason;
        log.updatedby = params.user_id;
        log.updateddatetime = Date();
        
        

        //prepare statuslog object
        var statuslog = {};
        if (order.status == "Open" || order.status == "Recieved") {
            //if(params.addressObj.sublocation_text != order.servicedeliveryaddress.sublocation_text)
            if(params.addressObj.googleplace_id != order.servicedeliveryaddress.googleplace_id)
            {
                statuslog.status = "Unassigned";
                statuslog.statustimestamp = Date();
                statuslog.comment = reason;
                statuslog.statusby = params.user_id;
                //statuslog.coordinates = params.addressObj.coordinates;  
                statuslog.coordinates = params.coordinates;   

            }
        }
              

        if(!order.statuslog) order.statuslog =[]; // some case when status log doesnot come      

        function defaultLogistic(){
            return {
                delivertype:"DeliverToLab",
                username:"Deliver To Lab"
            }             
        }
        
        //push STATUS LOG
        if (order.status == "Open" || order.status == "Recieved") {
            //if(params.addressObj.sublocation_text != order.servicedeliveryaddress.sublocation_text)
            if(params.addressObj.googleplace_id != order.servicedeliveryaddress.googleplace_id)
            {
                order.statuslog.push(statuslog);          
                order.status = "Unassigned";
                order.assignto = undefined;
                order.assignby = undefined;  
                order.logistic = defaultLogistic();        
            }
                  
        }

        var oldObj = {};
        //oldObj._id = order.servicedeliveryaddress._id;
        oldObj.landmark = order.servicedeliveryaddress.landmark;
        oldObj.address2 = order.servicedeliveryaddress.address2;
        //oldObj.areaid = order.servicedeliveryaddress.area_id._id;
        oldObj.areaname = order.servicedeliveryaddress.area_id.name;
        //oldObj.googleplace_id = order.servicedeliveryaddress.googleplace_id;
        //oldObj.sublocation_text = order.servicedeliveryaddress.sublocation_text;


        var newObj = {};
        //newObj._id = params.addressObj._id;
        newObj.landmark = params.addressObj.landmark;
        newObj.address2 = addressController.getAddress2(params.addressObj) 
        //newObj.areaid = params.addressObj.area_id._id.toString();
        newObj.areaname = params.addressObj.area_id.name;
        //newObj.googleplace_id = params.addressObj.googleplace_id;
        //newObj.sublocation_text = params.addressObj.sublocation_text;

        var newOldArr = getOldNewLogArray(oldObj, newObj)

        var oldArr = newOldArr.oldArr;
        var newArr = newOldArr.newArr;

        if(newArr.length)
        {
            log["new"] = newArr;
            log["old"] = oldArr;
        }

        if (!order.log) order.log = [];
            order.log.push(log);



        order.servicedeliveryaddress._id = params.addressObj._id;
        order.servicedeliveryaddress.landmark = params.addressObj.landmark;
        order.servicedeliveryaddress.address2 = addressController.getAddress2(params.addressObj) 
        order.servicedeliveryaddress.area_id = params.addressObj.area_id;
        order.servicedeliveryaddress.googleplace_id = params.addressObj.googleplace_id;
        order.servicedeliveryaddress.sublocation_text = params.addressObj.sublocation_text;



        // prepare update parameters
        var updateParams = {
            $set:{
                servicedeliveryaddress: order.servicedeliveryaddress,
                log:                    order.log,
                statuslog:              order.statuslog,
                status:                 order.status,
                assignto:               order.assignto,
                assignby:               order.assignby,
                logistic:               order.logistic
            }
        };     

        Model.update({_id:order._id}, updateParams, function(e,u) {
            if(e) return nextFunc(e);
            return nextFunc(null);
        });
    }

    // group order update
    var updateGroupOrders = function(next) {
        var search = {
            status:{$in:["Unassigned","Open","Recieved","Reached"]},
            _id:{$ne:params.id},
            "servicedeliveryaddress._id":params.addressObj._id,
            orderGroupId:params.orderGroupId
        };
        Model.find(search,{servicedeliveryaddress:1, status:1, assignto:1, assignby:1, log:1, statuslog:1, partner_id:1}, {lean:true}, function (error, results) {
            updateGrpOrders(results, params.addressObj, function (error) {
                return next(null);
            });
        });

        function updateGrpOrders(orders, addressObj, nextFunc) {
            async.each(orders, function (ord, nextrow) {
                //order = ord;
                getById(ord._id, function(err, r) {
                    if(err) return next(err);
                    order = r;
                    prepAndUpdateOrder(function(e,r){
                        //if(e) return next(e);
                        return nextrow();
                    });
                });
                
            },function (error) {
                if(error) return nextFunc(error);
                return nextFunc(null);
            });
        }
    }//end of updateGroupOrders

    //update order ncase of new address
    var updateOrder = function(next){
        prepAndUpdateOrder(function(e,r){
            if(e) return next(e);
            return next(null);
        });
    }//end of updateOrder

    // update client in case new address
    var updateClient = function(next) {
        if(!newAddr) return next(null);

        //client update incase new address
        ModelClient.findById(params.client_id, {"demography.addresses":1}, {lean:true}, function (e,r) {
            if(r) {
                r.demography.addresses.push({_id:params.addressObj._id});
                ModelClient.update({_id:params.client_id},{$set:{"demography.addresses": r.demography.addresses}}, function(err,u) {
                    if(err) return next(err);
                    return next(null);
                });
            } 
        });
    } //end of updateClient

    //add update Address
    var addAddr = function(next){
        //address add
        if(params.addressObj._id) return next(null)

        var exist = false;
        var addrObj = {};
        // check googleplace_id/sublocation_text already exist from list of client address
        ModelClient.findById(params.client_id, {"demography.addresses":1}, {lean:true}, function (e,r) {
            if(r && r.demography.addresses)
            {
                for (var i = 0; i < r.demography.addresses.length; i++) {
                    
                    //if(r.demography.addresses[i].sublocation_text == params.addressObj.sublocation_text)
                    if(r.demography.addresses[i]._id.googleplace_id == params.addressObj.googleplace_id)
                    {
                        exist = true;
                        var tempAddressid = r.demography.addresses[i]._id._id;

                        addrObj = params.addressObj;
                        addrObj._id = tempAddressid;
                        break;
                    }
                }
            }

            if(exist)
            {
                //update addressbyid r.demography.addresses[i]._id with new params.addressObj
                addressController.updateAddress(addrObj, function(e,r) {
                    if(e) return next(e);
                    return next(null);
                });
            }
            else
                aAddr(next);
        }).populate(["demography.addresses._id"]);

        
        function aAddr(next){
            // due to reverse binding
            var area_id = params.addressObj.area_id; //DO NOT DELETE temporariy keeping variable 

            addressController.addAddress(params.addressObj, function(e,r) {
                if(e) return next(e);
                params.addressObj._id = r._id;
                params.addressObj.area_id = area_id; //DO NOT DELETE because param.addressObj not having area_id
                newAddr = true; // flag for further functions
                return next(null);
            });
        }

        
    }
    var updateAddr = function(next){
        if(!params.addressObj._id) return next(null)
        uAddr(next);
        //address update
        function uAddr(next){            
            addressController.updateAddress(params.addressObj, function(e,r) {
                if(e) return next(e);
                //old order.servicedeliveryaddress
                //new r
                // params.addressObj.area_id = r;
                return next(null);
            });
        }
    }// end of addOrUpdateAddr

    function getAreaObject(next){
        if(!params.addressObj.area_id) return next(null);
        if(typeof params.addressObj.area_id == "object") return next(null);

        ModelArea.findById(params.addressObj.area_id, {name:1}, {lean:true}, function(e,r){
            params.addressObj.area_id = r;
            return next(null);
        });
    }

    var checkSlotAvbl = function(next){
        if(params.addressObj.area_id._id)
        {
            if(order.servicedeliveryaddress.area_id._id == params.addressObj.area_id._id)
            {
                return next(null);
            }
        }
        else
        {
            if(order.servicedeliveryaddress.area_id._id == params.addressObj.area_id)
            {
                return next(null);
            }
        }
            
        var newParam = {};
        var fromdate = moment(order.fromdate).tz(TIMEZONE).startOf('day').toISOString();
        newParam.orderdate = fromdate;
        newParam.partner_id = order.partner_id;
        if(params.addressObj.area_id._id)
            newParam.area_id = params.addressObj.area_id._id;
        else
            newParam.area_id = params.addressObj.area_id;
        newParam.time = "0";
        newParam.day = moment(order.fromdate).tz(TIMEZONE).startOf('day').format('dddd');
        newParam.addressid = params.addressObj._id;

        console.log(newParam.orderdate, "" , newParam.day);
        var ordergroupId = order.orderGroupId;
        var ordertime = order.fromtime;

        partnerController.avblSlotsAddress(newParam,function(e, timeSlots){
            if(e) return next(e);
            
            timeSlots.forEach(function(obj){
                if(obj.available)
                {
                    if(obj.slots.length){
                        obj.slots.forEach(function(objtwo){
                            if(objtwo.groupIds){
                                if(objtwo.groupIds.length){
                                    objtwo.groupIds.forEach(function(groupid){
                                        if(groupid == ordergroupId){
                                            objtwo.available = true;
                                            objtwo.text = "Open";
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            });
            //console.log(timeSlots);
            var orderTimeSlot = []
            timeSlots.forEach(function(obj){
                if(obj.slots.length){
                    obj.subSlots.forEach(function(objsubslot){
                        if(ordertime == objsubslot)
                        {
                            if(obj.available == true)
                                orderTimeSlot.push(obj);
                        }
                    })
                }
            })

            if(orderTimeSlot.length)
            {
                return next(null);
            }
            else
            {
                // return next(null);
                return callback("no slots available for this address")
            }
        })
        
    }

    // start getOrderId
    // var getOrderId = function(next){
    //     var options = {servicedeliveryaddress:1, status:1, assignto:1, assignby:1, log:1, statuslog:1, partner_id:1, orderGroupId:1, fromdate:1, fromtime:1}
    //     Model.findById(params.id, options, {lean:true}, function(e,r){
    //         if(e) return next(e);
    //         order = r;
    //         params.orderGroupId = r.orderGroupId;
    //         params.addressObj.partner_id = r.partner_id;
    //         return next(null)
    //     }).populate([]); 
    // } 
    // end of getOrderId

    var getOrderId = function(next){
            getById(params.id, function(err, r) {
                if(err) return next(err);
                order = r;
                params.orderGroupId = r.orderGroupId;
                params.addressObj.partner_id = r.partner_id;
                return next(null)
            });
        }
    
    async.waterfall([getOrderId, checkSlotAvbl, addAddr, getAreaObject, updateClient, updateOrder, updateGroupOrders, updateAddr], function(error) {
        if (error) return callback(error);
        getById(params.id, function(e,order){
            return callback(null, order);  
        });        
    });
}