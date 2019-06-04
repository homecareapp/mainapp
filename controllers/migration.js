var mongoose = require('mongoose');
var Model = require('../models/Client');
// var ModelMigration = require('../models/Migration');
var ModelOrder = require('../models/Order');
var ModelArea = require('../models/Area');
var ModelAddress = require('../models/Address');
var addressController = require('./address');
var async = require('async');


exports.mgrClient = function(req,res,next){
    migratePartnerClients({partner_id: req.query.partner_id},function(e,r){
        if(e) return res.json({message:e});
        return res.json({response:r});
    }); 
}

function migratePartnerClients(params, callback) {
    if(!params.partner_id) return callback("partner_id not found");
    var items = {
        totalClient:0,
        totalAddress:0,
        added:0,
        skipped:0,
        failed:[]
    },
    clients = [];

    getClients(params.partner_id, function(e){
        if(e) return callback("client not found");

        eachClient(function(e){
            return callback(null, items);
        })
    });
    
    // checkPartnerMigration(params.partner_id, function(migrated){
    //     if(migrated) return callback("Partner already migrated");

    //     getClients(params.partner_id, function(e){
    //         if(e) return callback("client not found");

    //         eachClient(function(e){
    //             return callback(null, items);
    //         })
    //     });
    // })

    // function checkPartnerMigration(pID, next){
    //     ModelMigration.count({partner_id:pID},function(e,count){
    //         if(count) return next(true);
    //         return next(false);
    //     });
    // }

    function getClients(pID, next){
        Model.find({partner_id:params.partner_id}, {"demography.addresses":1}, {lean:true}, function(e,r) {
            if(e) return next(e);
            
            items.totalClient = r.length;
            clients = r;
            return next(null);
        });
    }

    function eachClient(next){
        async.each(clients, function(client,nextRow){
            migrateClient(client, function(e,r){
                return nextRow(null);
            });  
        },function(error){
            if(error) return next(error);
            return next(null);
            
        });
    }

    function migrateClient(client, next){
        if(!client.demography.addresses) client.demography.addresses = [];
        //remove which are not google are
        client.demography.addresses = client.demography.addresses.filter(function(addr){
            items.totalAddress += 1;
            if(addr.sublocation_text) return true;
            items.skipped += 1;
            return false;
            // return (addr.sublocation_text) ? true : false;            
        });

        //if not address found than return
        if(!client.demography.addresses.length) return next(null);

        //add address
        addUpdateAddresses(client, function(e,r){
            client.demography.addr = r;
            updateClient(client, function(err, c){
                return next(null);
            })
        });        
    }

    function updateClient(client, next) {
        var updateParam = {
            "demography.addresses" : client.demography.addresses
        }
        Model.update({_id: client._id}, {$set: updateParam}, function(e,r){
            return next(null);
        });
    }

    function addUpdateAddresses(client, next) {
        var addres = []
        async.each(client.demography.addresses, function(addr, nextRow){
            addressExist(addr, function(exist){
                if(!exist) {
                    addAddress(addr, function(e,r){
                        if(e)
                            return nextRow(null);                        

                        addres.push({_id:r._id, address2: r.address2, landmark: r.landmark, area_id: r.area_id});
                        return nextRow(null);  
                    });
                }

                else return nextRow(null);
                // else {
                //     updateAddress(addr, function(e,r){
                //         return nextRow(null)
                //     });
                // }
            });
        }, function(err){
            if(err) return next(err);
            return next(err, addres);
        });

        function addressExist(addr, next) {
            ModelAddress.count({_id: addr._id}, function(e, count){
                if(count != 0) return next(true);
                return next(false);
            });
        }

        function addAddress(addr, next) {
            addr.partner_id = params.partner_id;
            addressController.addAddress(addr, function(e,r){
                if(e) {
                    items.failed.push({client: client._id, address:addr, error: e});
                    return next(e);
                }

                items.added += 1;
                return next(null,r);
            });
        }

        // function updateAddress(addr, next){
        //     addr.partner_id = params.partner_id;
        //     addressController.update(addr, function(e,r){
        //         if(e) {
        //             items.failed.push({client: client._id, address:addr, error: e});
        //             return next(e);
        //         }

        //         items.updated += 1;
        //         return next(null);
        //     });
        // }
    }
}

exports.mgrOrder = function (req,res, next) {
    migrateOrders(function(e,r){
        return res.json({
            response:r
        });
    });
}

function migrateOrders(callback){
    var items = {
        total:0,
        updated: 0,
        notMigrated: []
    };
    ModelOrder.find({},{"servicedeliveryaddress.area_id":1, "servicedeliveryaddress._id":1, partner_id:1},{lean:true}, function(e,orders){
        items.total = orders.length;
        async.each(orders, function(order,nextItem){
            migrateOrder(order, function (e,result) {
                // console.log(result);
                if(!e) items.updated += 1;
                return nextItem(null);
            });
        }, function (e) {
            if(e) return callback(e);
            return callback(null, items);
        });
    });

    function migrateOrder(params, next){
        getMajorArea(params, function(e,r){
            if(e) return next(e);
            if(!r) return next("no area");
            params.area_id = r;
            updateOrder(params, function(e,r){
                if(e) return next(e);
                return next(null);
            })
        })
    }

    function updateOrder(params, next){
        ModelOrder.update({_id:params._id}, {$set:{"servicedeliveryaddress.area_id": params.area_id}}, function(e,r){
            if(e) return next(e);

            return next(null);
        });
    }

    function getMajorArea(params,next){
        ModelArea.findById(params.servicedeliveryaddress.area_id, {name:1}, {lean:true}, function(e,r){
            if(!r) {
                function inputParam(){
                    return {
                        ids:[params.servicedeliveryaddress._id],
                        partner_id: params.partner_id
                    }
                }
                getAreaFromAddress(inputParam(), function(err, addr) {
                    if(err){
                        items.notMigrated.push({order_id:params._id, area:params.servicedeliveryaddress.area_id})
                        return next("no area");                        
                    }
                    else if(!addr){
                        items.notMigrated.push({order_id:params._id, area:params.servicedeliveryaddress.area_id})
                        return next("no area");                        
                    }
                    return next(null, addr);
                });
            }
            else
                return next(null, r);            
        })
    }

    function getAreaFromAddress(params,next){
        addressController.getAddresses(params, function (e,r) {
            if(e) return next(e);
            return next(null, r[0]);
        })
    }
}