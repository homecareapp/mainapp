var mongoose = require('mongoose');
var Model = require('../../models/Order');
var ModelClient = require('../../models/Client');
// var loadash = require('loadash');
var async = require('async');
var geocoderProvider = 'google';
var httpAdapter = 'http';
var _ = require("lodash");
var ModelOrderRelation = require('../../models/OrderRelation');
var ModelPartnerService = require('../../models/PartnerService')
var ModelPartner = require('../../models/Partner');
var moment = require("moment");
var helperVisitCharge = require('../../controllers/helpervisitcharge');

var tempNumber = new Number();

var populateListQuery = [
    {
        path: 'client_id',
        select: '_id demography externalId'
    },
    {
        path: 'servicedeliveryaddress.area_id',
        select: '_id name pincodes'
    },
    {
        path: 'servicedeliveryaddress.city_id',
        select: '_id name'
    },
    {
        path: 'servicedeliveryaddress.sublocation_id',
        select: '_id name'
    },
    {
        path: 'services.service_id',
        select: 'name _id code price alias tubes description'
    },
    {
        path: 'assignby',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'assignto',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'partner_id',
        select: '_id info.name'
    }
];

var listRemovedColumn = "-area_id -call_id -createdby -droppointaddress -log -masterservices -paymentdetails -schedulenotification -prescriptions -provider_id -signature -repeat -comments -statuslog -todate -totime -visitcomments";

var populateIdQuery = [
    {
        path: 'client_id',
        select: '_id demography externalId'
    }, 
    {
        path: 'call_id',
        select: '_id name'}, 
    {
        path: 'area_id',
        select: '_id name pincodes'},
    {
        path: 'servicedeliveryaddress.area_id',
        select: '_id name pincodes'
    },
    {
        path: 'servicedeliveryaddress.city_id',
        select: '_id name'},
    {
        path: 'servicedeliveryaddress.sublocation_id',
        select: '_id name'
    },
    {
        path: 'provider_id',
        select: '_id name'
    },
    {
        path: 'partner_id',
        select: '_id info.name workinghour areas visitcharges reportdeliverymode'
    },
    {
        path: 'services.service_id',
        select: 'name _id code price alias customerinstruction specialinstruction childs postsample sampletype postservices description'
    },
    {
        path: 'assignby',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'assignto',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'log.updatedby',
        select: '_id profile.name'
    }, 
    {
        path: 'log.newassignto',
        select: '_id profile.name'
    }, 
    {
        path: 'log.oldassignto',
        select: '_id profile.name'
    }, 
    {
        path: 'statuslog.statusby',
        select: '_id profile.name'
    }
];

exports.add = function(req, res, next) {
    var data = req.body;
    var order_id = data._id;
    var client_id = data.client_id._id;
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
                    // if (req.user.userinfo.provider_id) {
                    //     addOrder["provider_id"] = req.user.userinfo.provider_id._id;
                    // };
                    addOrder["comments"] = [];
                    if (data.assignby) {
                        addOrder["assignby"] = data.assignby;
                        if (!data.assignto) {
                            return next(new Error("Order Not Created"));
                        } else {
                            addOrder["assignto"] = data.assignto;
                        }
                    };
                    addOrder["provider_id"] = req.user.provider_id._id;
                    addOrder["parentorder_id"] = data.parentorder_id;
                    addOrder["fromdate"] = data.fromdate;
                    addOrder["area_id"] = data.area_id;
                    addOrder["partner_id"] = data.partner_id;
                    addOrder["todate"] = data.todate;
                    addOrder["fromtime"] = data.fromtime;
                    addOrder["totime"] = data.totime;
                    addOrder["amount"] = data.amount; //call_id
                    addOrder["services"] = data.services;
                    addOrder["createdby"] = req.user._id;
                    addOrder["client_id"] = data.client_id;
                    addOrder["servicedeliveryaddress"] = data.servicedeliveryaddress;
                    addOrder["status"] = data.status;
                    if (data.status == "Completed") {
                        addOrder["servicetime"] = Date.now()
                        if (data.geolocation) {
                            addOrder["geolocationtimestamp"] = Date.now()
                            addOrder.servicedeliveryaddress.geolocation = data.geolocation
                        };
                    };
                    if (data.call_id) {
                        addOrder["call_id"] = data.call_id;
                    };
                    data.log = [];
                    var logobj = {};
                    logobj.comments = "Work plan created";
                    logobj["updatedby"] = req.user._id;
                    logobj["updateddatetime"] = Date();
                    data.log.push(logobj);
                    addOrder["log"] = data.log;
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
            }).populate(populateIdQuery);
        });
}

exports.cancelorder = function(req, res, next) {
    var reason = req.body.reason,
        id = req.params.id,
        logobj = {},
        orderObj;

    if (!reason) return res.json({ error: "Please send reason" })

    async.waterfall([
        function cancelOrder (nextFunc) {
            Model.findById(id, { lean: true }, function(error, result) {
                if (error) return next(error);
                if (!result) return res.json({ message: "Order not found" });

                logobj["oldstatus"] = result.status;
                logobj["newstatus"] = "Cancelled";
                logobj["olddate"] = result.fromdate;
                logobj["oldtime"] = result.fromtime;
                // logobj["newdate"] = Date();
                // logobj["newtime"] = new Date();
                logobj["oldassignto"] = result.assignto;
                logobj["newassignto"] = undefined;
                logobj["updatedby"] = req.user._id;
                logobj["updateddatetime"] = Date();
                result.log.push(logobj);

                result.status = "Cancelled";
                result.assignto = undefined;
                orderObj = result; //copy to orderObj
                result.save(function(err, savedOrder) {
                    if (err) return next(err);
                    return nextFunc(null);
                    // return res.json({ message: "Order cancelled successful." });
                })
            })
        },
        function cancelChildOrder (nextFunc) {
        if (orderObj.ordertype == "PP") 
            return nextFunc(null);
        else{
            var search = {
                parentorder_id:id,
                ordertype: "PP",
                $and:[{"status":{$ne:'Cancelled'}},{"status":{$ne:'Completed'}}]
            }
            

            // console.log(search);
            Model.findOne(search, function (error, result) {
                if (error) return res.json({error: "Error while getting order by ID: " + error});

                // console.log("result:" + result);
                
                if(result){
                    logobj["oldstatus"] = result.status;
                    logobj["newstatus"] = "Cancelled";
                    logobj["olddate"] = result.fromdate;
                    logobj["oldtime"] = result.fromtime;
                    // logobj["newdate"] = Date();
                    // logobj["newtime"] = new Date();
                    logobj["oldassignto"] = result.assignto;
                    logobj["newassignto"] = undefined;
                    logobj["updatedby"] = req.user._id;
                    logobj["updateddatetime"] = Date();
                    result.log.push(logobj);

                    // result.status = "Cancelled";
                    result.assignto = undefined;
                    result.status = "Cancelled";
                    result.save(function (err,savedOrder) {
                        if (err) return res.json({error: "Error while saving PP order " + err});
                        return nextFunc(null)
                    });
                }
                else
                    return nextFunc(null)           
            });
        };
        }],
        function final (error) {
            if (error) return res.json({error:error});

            Model.findById(id, function(error, returnOrder) {
                return res.json({ message: "Order cancelled successful.", order: returnOrder });
            }).select("-signature -prescriptions").populate(populateIdQuery);
        }
    )     
}

exports.getList = function(req, res, next) {
    var query = req.originalUrl;
    var search = {};
    var option = {
        page: req.query.page,
        limit: parseInt(req.query.limit)
    }
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
    if (req.user._id && req.user.role == "serviceagent") {
        search["assignto"] = req.user._id;
    }
    if (req.query.partner_id) {
        search["partner_id"] = req.query.partner_id;
    }
    if (req.query.area_id) {
        search["area_id"] = req.query.area_id;
    };
    if (req.query.client_id) {
        search["client_id"] = req.query.client_id;
    }
    if (req.query.status) {
        search["status"] = req.query.status;
    };
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
    };

    if (req.query.fromdate && req.query.fromtime && req.query.totime) {
        search["fromtime"] = {
            $gte: tempNumber.makeFloat(req.query.fromtime),
            $lt: tempNumber.makeFloat(req.query.totime)
        };
    };
    if (req.query.sublocation_id) {
        search["servicedeliveryaddress.sublocation_id"] = req.query.sublocation_id;
    };

    var sort = 1;
    var sortfield = "fromtime";
    if (req.query.sort) {
        if (req.query.sort == "asc") {
            sort = 1;
        } else {
            sort = -1;
        }
    }
    option.sortBy = {};
    option.sortBy[sortfield] = sort;
    
    if (req.params.id) {
        // console.log("if");
        getById(req.params.id, function(error, orderResult) {
            if (error) return next(error);
            //get OrderRelation
            var search = {};
            if (orderResult.parentorder_id) search.order_id = orderResult.parentorder_id;
            else search.order_id = orderResult._id;

            ModelOrderRelation.findOne(search, function (err, orResult) {
                //console.log(orResult);
                orderResult.set('orderjson', orResult);
                return res.json({
                    response: orderResult
                });
            })
        });
    }
    
    else if (!req.query.page || !req.query.limit) {
        // console.log("else if");
        // console.log(req.query);
        Model.find(search, {},{sort: {
                fromtime: sort
            }}, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        }).select(listRemovedColumn).populate(populateListQuery);
    } else {
        option.populate = populateListQuery;
        option.columns = listRemovedColumn;
        // console.log("else");
        // console.log(option);
        Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
            if (error) return next(error)
            var obj = {};
            obj["response"] = paginatedResults;
            obj["pageCount"] = pageCount;
            obj["itemCount"] = itemCount;
            res.json(obj);
        });
    }
}

function getById(id, callback) {
    Model.findById(id, function(error, result) {
        if (error) return callback(error);
        if (result.status == "Open" || result.status == "Unassigned" || result.status == "Reached" || result.status == "Recieved") {
            helperVisitCharge.calculateVisitCharge(result.orderGroupId,result.fromdate, result.fromtime, result.partner_id._id, function (e, visitcharge) {            
                if (e) callback(null, result);
                result.paymentdetails.visitingcharges = visitcharge;
                return callback(null, result);
            });
        }
        else
            return callback(null, result);
        
    }).populate(populateIdQuery);
}

exports.getParentOrderID = function (req, res, next) {
    // if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"));
    // console.log("i am here");
    var search = {
        ordertype:"F"
    };
    
    if (req.query.ordergroupid) search["orderGroupId"] = req.query.ordergroupid;
    else return next(new Error("No orderGroupId"));
    
    var partnerPatientCap = 0
    if (req.query.patientcap) partnerPatientCap = req.query.patientcap;

    Model.find(search, function (error, results) {
        if(error) return next(new Error("Error while find order"));
        if(!results) return next(new Error("No result found"));


        var groupedOrders = _.groupBy(results, function (order) {
            return [order.parentorder_id].sort();
        });

        // console.log("Parent Count: " + groupedOrders[""].length)
        // console.log(groupedOrders)
        // if no patient cap
        if (!partnerPatientCap) {
            var search = {};
            search.order_id = groupedOrders[""][0]._id;
            ModelOrderRelation.findOne(search, function (err, orResult) {
                var parentOrder = groupedOrders[""][0];
                parentOrder.set('orderjson', orResult);
                return res.json({parentorderid: parentOrder});
            });
            // return res.json({parentorderid: groupedOrders[""][0]})
        }

        if (partnerPatientCap == 1) return res.json({parentorderid: undefined})

        
        if (groupedOrders[""].length) {

            for (var i = 0; i < groupedOrders[""].length; i++) {
                // console.log("Loop: " + i)
                var search = {}, parentOrder;
                // console.log(groupedOrders[groupedOrders[""][i]._id]);
                if (!groupedOrders[groupedOrders[""][i]._id]) {
                    search.order_id = groupedOrders[""][i]._id;
                    parentOrder = groupedOrders[""][i];
                    console.log("if")

                }
                else if (groupedOrders[groupedOrders[""][i]._id].length < (partnerPatientCap-1)){
                    // console.log("else if " + groupedOrders[groupedOrders[""][i]._id].length)
                    search.order_id = groupedOrders[""][i]._id;     
                    parentOrder = groupedOrders[""][i];               
                }

                // console.log("search " + search.order_id)
                if(search.order_id){
                    Model.findById(search.order_id, function (err, orderObj) {
                        if (error) return res.json({message: err});

                        ModelOrderRelation.findOne(search, function (err, orResult) {
                            orderObj.set('orderjson',orResult);
                            return res.json({parentorderid: orderObj});
                        });
                    }).populate(populateIdQuery);
                    
                }
                else if(i == (groupedOrders[""].length - 1))                
                    return res.json({parentorderid: undefined})
            };
                       
        }

        //return res.json({parentorderid: undefined})
    })
}

// exports.getVisitingCharge = function(req, res, next){
//     var ordergroupid = req.body.ordergroupid,
//     fromtime = req.body.fromtime,
//     servicedeliveryaddress_id = req.body.servicedeliveryaddress_id,
//     ordertype = req.body.ordertype,
//     pptestflage = false,
//     action = req.body.action,
//     partner_id = req.body.partner_id,
//     groupOrders = [],
//     groupedOrders = [],
//     orderRelations = [],
//     parentOrderIds = [],
//     fastingVisitsCharge = 0,
//     ppVisitCharge = 0,
//     collectedVisitCharge = 0,
//     partnerVisitChargeObj,
//     partnerVisitChargeList = [],
//     completedOrders = [],
//     multiples = 0,
//     services = req.body.services, //this filed is to check and get PP tests if presend in Profile or Package
//     ppServices = []; //(return array) if any PP test found in services array

//     if (action != "add" && action != "update") return res.json({error:"value of action veriable should be: add/update"})
//     if(!partner_id) return res.json({error:"Partner_id missing"})
//     if(!services) services = [];

//     var search = { orderGroupId: ordergroupid, status: {$ne: "Cancelled"} };
//     if (req.body.pptestflage) pptestflage = true;
    
//     async.waterfall([
//             function getGroupOrders (getGroupOrdersNextFunc) {
//                 if (ordergroupid) {
//                     Model.find(search, null, {lean:true}, function (error, results) {
//                         if(!results.length) {
//                             var result = {
//                                 totalVisitCharges: 0,
//                                 collectedVisitCharge: 0,
//                             }
//                             return res.json({response: result});
//                         }

//                         groupOrders = results;

//                         //loop to get parent orders only
//                         // groupOrders.forEach(function (o) {
//                         //     if (!o.parentorder_id) parentOrderIds.push(o.id);
//                         // });
//                         return getGroupOrdersNextFunc(null);
//                     }).populate('services.service_id');
//                 }
//                 else
//                     return getGroupOrdersNextFunc(null);
                                
//             },
//             function addGroupOrderObjects(addGroupOrderObjectsNextFunc){                
//                 //incase of adding new order check for pptestflage
//                 if (action == "add") {
                    
//                     if (ordertype != "F" && ordertype != "PP") return res.json({error:"value of acction veriable should be: F/PP"})

//                     //adding first order (F)
//                     if (ordertype == "F") {
//                         var obj = {
//                             fromtime:parseInt(fromtime),
//                             ordertype:"F",
//                             servicedeliveryaddress: {
//                                 _id:servicedeliveryaddress_id
//                             }
//                         }
//                         groupOrders.push(obj);

//                         //if PP test added in F order
//                         if (pptestflage) {
//                             var obj = {
//                                 fromtime:parseInt(fromtime) + 120, //after 2 hours from fasting visit
//                                 ordertype:"PP",
//                                 servicedeliveryaddress: {
//                                     _id:servicedeliveryaddress_id
//                                 }
//                             }
//                             groupOrders.push(obj);
//                         }    
//                         return addGroupOrderObjectsNextFunc(null);
//                     } else{
//                         if (pptestflage) {
//                             var obj = {
//                                 fromtime:parseInt(fromtime),
//                                 servicedeliveryaddress: {
//                                     _id:servicedeliveryaddress_id
//                                 }
//                             }
//                             groupOrders.push(obj);
//                             return addGroupOrderObjectsNextFunc(null);
//                         }
//                     };
//                 }                
//                 else
//                     return addGroupOrderObjectsNextFunc(null);
                              
//             },            
//             function filterCompletedVisit (nextFunc) {
//                 completedOrders = _.filter(groupOrders, function (o) {
//                     return o.status == "SampleCollected" || o.status == "Completed" || o.status == "SampleHandover"
//                 });
//                 return nextFunc(null);
//             },
//             function getPartnerDetails (nextFunc) {
//                 if (partner_id) {
//                     ModelPartner.findById(partner_id, {paymentdetails:1, visitcharges: 1},function (error, partner) {
//                         if(error) return res.json({error:"Error while finding pratner"});

//                         var day = moment(groupOrders[0].fromdate).add("minute",330).format("dddd").toLowerCase();
//                         partner.visitcharges.forEach(function (v) {
//                             if (_.findIndex(v.day,function (d) {return d.toLowerCase() == day;})!=-1) {
//                                 //partnerVisitChargeObj = v;
//                                 partnerVisitChargeList.push(v);
//                             };
//                         });

//                         return nextFunc(null);
//                     })
//                 }
//                 else return res.json({error:"Error partner_id missing"});
                
//             },
//             function getGroupedOrders (getGroupedOrdersNextFunc) {
//                 groupedOrders = _.groupBy(groupOrders, function (order) {
//                     return [order.fromtime, order.servicedeliveryaddress._id]
//                 });  

//                 for (var key in groupedOrders) {
//                     // //if order type F visit
//                     // if (_.findIndex(groupedOrders[key], function (o) { return o.ordertype == "F" }) > -1) {
//                     //     fastingVisitsCharge = fastingVisitsCharge + Math.ceil(groupedOrders[key].length/partnerVisitChargeObj.person)*partnerVisitChargeObj.charge;
//                     // }
//                     // //if order type == PP 
//                     // else if(_.findIndex(groupedOrders[key], function (o) { return o.ordertype == "PP" }) > -1){
//                     //     ppVisitCharge = ppVisitCharge + Math.ceil(groupedOrders[key].length/partnerVisitChargeObj.person)*partnerVisitChargeObj.postcharge;
//                     // };

//                     //if order type F visit
//                     if (_.findIndex(groupedOrders[key], function (o) { return o.ordertype == "F" }) > -1) {
//                         var vcFObj = _.find(partnerVisitChargeList, function (vc) { 
//                             if(vc.from < vc.to)
//                                 return groupedOrders[key][0].fromtime >= vc.from && (groupedOrders[key][0].fromtime <= vc.to || groupedOrders[key][0].fromtime <= parseInt(vc.to) + 30)
//                             else
//                                 return (groupedOrders[key][0].fromtime >= vc.from && groupedOrders[key][0].fromtime <= 1380) || (groupedOrders[key][0].fromtime >= 0 && groupedOrders[key][0].fromtime <= vc.to)
//                         });
//                         if(vcFObj && vcFObj.person!=undefined && vcFObj.charge!=undefined) fastingVisitsCharge = fastingVisitsCharge + Math.ceil(groupedOrders[key].length/vcFObj.person)*vcFObj.charge;
//                     }
//                     //if order type == PP 
//                     else if(_.findIndex(groupedOrders[key], function (o) { return o.ordertype == "PP" }) > -1){
//                         var vcPObj = _.find(partnerVisitChargeList, function (vc) { 
//                             if(vc.from < vc.to)
//                                 return groupedOrders[key][0].fromtime >= vc.from && (groupedOrders[key][0].fromtime <= vc.to || groupedOrders[key][0].fromtime <= parseInt(vc.to) + 30)
//                             else
//                                 return (groupedOrders[key][0].fromtime >= vc.from && groupedOrders[key][0].fromtime <= 1380) || (groupedOrders[key][0].fromtime >= 0 && groupedOrders[key][0].fromtime <= vc.to)   

//                         });
//                         if(vcPObj && vcPObj.person!=undefined && vcPObj.postcharge!=undefined) ppVisitCharge = ppVisitCharge + Math.ceil(groupedOrders[key].length/vcPObj.person)*vcPObj.postcharge;
//                     };    
//                 }

//                 // calculating completed visit charge;
//                 completedOrders.forEach(function (o) {
//                     if (o.paymentdetails.visitingcharges)
//                         collectedVisitCharge = collectedVisitCharge + parseInt(o.paymentdetails.visitingcharges)
//                 });

//                 return getGroupedOrdersNextFunc(null);
//             },
//             function (getPPTestsNextFunc) {
//                 if(!services.length) return getPPTestsNextFunc();

//                 getPPTests(services,function (e, ppTests) {
//                     if(e) next(e);
//                     ppServices = ppTests;
//                     getPPTestsNextFunc();
//                 });

//             }
//         ],
//         function final(error) {
//             if (error) return next(error);

//             visitCharge = fastingVisitsCharge + ppVisitCharge - collectedVisitCharge;
//             var result = {
//                 totalVisitCharges: fastingVisitsCharge + ppVisitCharge,
//                 collectedVisitCharge: collectedVisitCharge,
//                 ppTests:ppServices
//             }
//             return res.json({response: result});
//         }
//     );    
// };

exports.PPTests = function(req,res,next){
    var data = req.body;
    getPPTests(data.tests, function(e, result){
        if(e) return next(error);

        var searchTest = {};
            searchTest["_id"] = {
                $in: result
            };

            ModelPartnerService.find(searchTest, function(err, partnerTests) {
                if (err) return callback({ error: "Error while getiing partnerTest: " + err });

                return res.json({response: partnerTests});
            })
        
    })
};


function getPPTests(tests, callback) {
    async.waterfall([
        //get test ids by services
        function(testNextFunc) {
            var tempServiceIds = []
                // console.log(tests);
            for (var i = 0; i < tests.length; i++) {
                if (tests[i])
                    tempServiceIds.push(tests[i])
            }

            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };

            ModelPartnerService.find(searchTest, function(err, partnerTests) {
                if (err) return callback({ error: "Error while getiing partnerTest: " + err });

                if (partnerTests) {
                    tempServiceIds = [], tempProfileIds = [];
                    for (var i = 0; i < partnerTests.length; i++) {
                        // if tests 
                        if(partnerTests[i])  
                        {                                
                            if (partnerTests[i].category == "TEST") {
                                tempServiceIds.push(partnerTests[i]._id)
                                    // partnerTests[i].masterservice.tubes.forEach(function (tube) {
                                    //     tempTubes = tubeUpdate(tube,tempTubes,partnerTests[i].masterservice.department_id._id, shareTubeFlag);                            
                                    // })
                            }
                            // if profiles
                            else if (partnerTests[i].category == "PROFILE") {
                                // console.log("PROFILE.Test")
                                partnerTests[i].childs.forEach(function(child) {
                                    if(child.test_id)
                                        tempServiceIds.push(child.test_id._id)
                                        // child.tubes.forEach(function (tube) {
                                        //     tempTubes = tubeUpdate(tube,tempTubes,child.department_id._id, shareTubeFlag);
                                        // })
                                });
                            }
                            // if packages
                            else if (partnerTests[i].category == "PACKAGES") {
                                //console.log(partnerTests[i].childs)

                                partnerTests[i].childs.forEach(function(child) {
                                    if(child.test_id)
                                    {
                                        if (child.test_id.category == 'TEST') {
                                            if(child.test_id)
                                                tempServiceIds.push(child.test_id._id);
                                        } else if (child.test_id.category == 'PROFILE') {
                                            // console.log("Package.Profile")
                                            if(child.test_id.childs)
                                            {
                                                if(child.test_id.childs.length)
                                                {
                                                    child.test_id.childs.forEach(function(profileTest) {
                                                        if(profileTest.test_id)
                                                            tempServiceIds.push(profileTest.test_id._id);
                                                    })
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    };

                }
                //console.log(tempServiceIds)
                return testNextFunc(null, tempServiceIds);
            }).populate("childs.test_id");
        },
        function(tempServiceIds, tubeNextFunc) {
            var searchTest = {};
            searchTest["_id"] = {
                $in: tempServiceIds
            };

            ModelPartnerService.find(searchTest, function(err, partnerTests) {
                if (err) return callback({ error: "Error while getiing partnerTest: " + err });

                if (partnerTests) {
                    ppTests = [];
                    //check for post sample test
                    partnerTests.forEach(function (pt) {
                        if (pt.postsample) {                            
                            pt.postservices.forEach(function(pp) {
                                var intersactionIndex = _.findIndex(partnerTests, function(s) {
                                    return s._id.equals(pp._id);
                                });
                                // console.log("found " + intersactionIndex)
                                if (intersactionIndex >= 0) ppTests.push(partnerTests[intersactionIndex]._id);
                            });                    
                        }
                    });
                    // console.log("ppTestFlag" + ppTestFlag);
                }
                return tubeNextFunc(null);
            });            
        }
        
    ], function(err) {
        callback(null,ppTests);
    })
}