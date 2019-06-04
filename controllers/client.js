var mongoose = require('mongoose');
var Model = require('../models/Client');
var addressController = require('./address');
var async = require('async');
var geocoderProvider = 'google';
var httpAdapter = 'http';
var ModelOrder = require('../models/Order');
var ModelMigration = require('../models/Migration');

/**
 * [search list below]
 * clientsearch
 * any other search can be done from  functionList.urlQuery(req.url) which converts url to search pattern
 */


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
need to test search on clientsearch as attribute changed from name to fullname
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

var options = {partner_id:1, registrationdate:1, demography:1, externalId:1, specialneeds:1, user_id:1}
//var paginatePopulate = ['partner_id', 'registrationdate', 'demography', 'externalId']
var paginatePopulate = ['partner_id', 'user_id'];

var orderPopulateList = [
    {
        path: 'assignto',
        select: '_id profile.name profile.mobilenumber'
    },
    {
        path: 'partner_id',
        select: '_id info.name info.acronym info.code'
    },
    {
        path: 'services.service_id'
    },
    {
        path: 'log.updatedby',
        select: '_id profile.name'
    }
]

exports.getList = function(req, res, next) {
    var search = {};
    var option = {
        page: req.query.page,
        limit: parseInt(req.query.limit),
        columns:'externalId demography.age demography.agetype demography.gender demography.mobilenumber demography.fullname demography.altnumber partner_id',
        sortBy:{},
        populate : paginatePopulate
    }
    option.sortBy["demography.fullname"] = 1; //fullname asc; -1 for dec

    if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"));
    if (req.user.provider_id) {
        search["provider_id"] = req.user.provider_id._id;
    }

    // if (req.query.partner_id) {
    //     search["partner_id"] = req.query.partner_id;
    // }

    if(req.query.partner_id) // string comma seperated
    {
        var partners = [];
        if (req.query.partner_id) {
            partners = req.query.partner_id.split(',')
        }
        if(partners.length)
        {
            for(var i=0;i<partners.length;i++)
            {
                partners[i] = mongoose.Types.ObjectId(partners[i]);
            }
            search["partner_id"] = {
                $in: partners
            }
        }
    }

    if (req.query.clientsearch) {
        //exact search
        // var arr = req.query.clientsearch.split(" ");
        // var str = arr.join('\" \"')
        // var ser = '\"'+str+'\"'
        // search['$text'] = {$search: ser};
        
        search['$or'] = [{
            'demography.mobilenumber': new RegExp(req.query.clientsearch, 'i')
        }, {
            'externalId': new RegExp(req.query.clientsearch, 'i')
        }, {
            "demography.altnumber":new RegExp(req.query.clientsearch, 'i')
        }];
    }

    if(req.query.firstname)
    {
        search['demography.firstname'] = new RegExp(req.query.firstname, 'i')
    }
    if(req.query.middlename)
    {
        search['demography.middlename'] = new RegExp(req.query.middlename, 'i')
    }
    if(req.query.lastname)
    {
        search['demography.lastname'] = new RegExp(req.query.lastname, 'i')
    }

    if (req.params.id) {
        getById(req.params.id, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    } else {
        // console.log(search);
        if (req.query.page || parseInt(req.query.limit)) {
            Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return next(error)
                }
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            // console.log(search);

            Model.find(search, function(error, result) {
                if (error) return next(error);
                search:
                    res.json({
                        response: result
                    });
            });
        }
    }
}

/** [getById get result based on id] */
function getById(id, callback) {

    function inputVar(result){
        return {
            ids:result.demography.addresses,
            partner_id:result.partner_id
        }
    }

    Model.findById(id, options, {lean:true}, function(err, result) {
        if (err) return callback(err);
        // return callback(null, result);
        addressController.getAddresses(inputVar(result), function(e,addresses){
            if(!addresses) addresses = [];
            // addresses = addresses.filter(function(addr){
            //     if(typeof addr.area_id == "object") return true;
            // });
            result.demography.addresses = addresses;

            //to get all visits
            var search = {}
            search["client_id"] = id;
            search["status"]={$ne:"Cancelled"};
            search["provider_id"]= result.partner_id.provider_id._id;
            search["partner_id"]= result.partner_id._id;

            var pr = {services:1, partner_id:1, assignto:1, fromtime:1, fromdate:1, status:1, ordertype:1, servicedeliveryaddress:1, log:1}
            ModelOrder.find(search, pr, {sort: {fromdate: -1,fromtime: -1}}, function(error, orders) {
                if (error) return callback(error);
                //result.set('allOrder', paginatedResults[0])
                result.allOrder = orders;
                return callback(null, result);
            }).populate(orderPopulateList);
            // to get all visits
            //return callback(null, result);
            
        })
    }).populate(paginatePopulate)
}

// exports.update = function(req, res, next) {
//     var id = req.params.id;
//     var data = req.body;
//     if (!id) return next(new Error("Id Not Found For Update Client"));
//     if (req.user.provider_id) {
//         if (!req.user.provider_id._id)
//             return next("No Provider_id Assigin To This User")
//     };
//     if (!data)
//         return next(new Error("No Provider_id"))
//     Model.findById(id, function(error, result) {
//         if (error) return next(error);
//         if (result) {
//             if (data.demography) {
//                 if (data.demography.firstname && data.demography.lastname) {
//                     data.demography.fullname = data.demography.firstname.trim() + " " + data.demography.lastname.trim();
//                     if (data.demography.firstname && data.demography.lastname && data.demography.firstname && data.demography.middlename) {
//                         data.demography.fullname = data.demography.firstname.trim() + " " + data.demography.middlename.trim() + " " + data.demography.lastname.trim();
//                     };
//                 }
//             };
//             concateAddressess(data.demography.addresses, function (error,addresses) {
//                 data.demography.addresses = addresses;
//             });
//             for (var key in data) {
//                 if (typeof result[key] !== "function") {
//                     result[key] = data[key];
//                 };
//             };
//             result.save(function(error, result) {
//                 if (error) return next(error);
//                 Model.findById(result._id, function(error, result) {
//                     if (error) return next(error);
//                     res.json({
//                         response: result
//                     });
//                 });
//             });
//         };
//     });
// }

exports.update = function (req,res,next) {
    function inputParams() {
        return {
            id:req.params.id,
            demography:req.body.demography,
            externalId:req.body.externalId,
            partner_id:req.body.partner_id,
            specialneeds:req.body.specialneeds
        }
    }

    updateClient(inputParams(), function (e,r) {
       if(e) return next(new Error(e));

       return res.json({
            response:r
       });
    });
}

function concatNames(params){
    if (params.firstname && params.lastname) {
        params.fullname = params.firstname.trim().concat(" ", params.lastname.trim());
        if (params.middlename) 
            params.fullname = params.firstname.trim().concat(" ", params.middlename.trim(), " " ,params.lastname.trim());
    }
    return params.fullname;
}

function updateClient(params,callback){
    if(!params.id) return callback("id not found");
    if(!params.demography) return callback("demography not found");
    if(!params.partner_id) return callback("partner_id not found");    

    function update(next){
        function inputNames(){
            return {
                firstname:params.demography.firstname,
                lastname:params.demography.lastname,
                middlename:params.demography.middlename
            }
        }
        params.demography.fullname = concatNames(inputNames());

        function updateParams() {
            return {
                demography:params.demography,
                externalId:params.externalId,
                specialneeds:params.specialneeds
            }
        }

        Model.update({_id:params.id}, {$set: updateParams()}, function(e,r){
            return next(null);
        });
    }

    // function to add or update addresses in address collection 
    function addUpdateAddr(next){
        function inputParam(){
            return {
                partner_id:params.partner_id,
                addresses:params.demography.addresses
            }
        }
        addressController.addUpdateAddresses(inputParam(),function(e,aids){
            params.demography.addresses = aids;
            return next(null);
        });
    }

    async.waterfall([addUpdateAddr, update], function (error) {
        if(error) return callback(error);
        getById(params.id, function(e, client){
            return callback(null, client);
        })
    });
}



// @abs [ update only demography as required into update client in mlytl login]
exports.updateDemography = function(req, res, next) {
    var id = req.params.id;
    var data = req.body;
    if (!id) return next(new Error("Id Not Found For Update Client"));
    if (req.user.provider_id) {
        if (!req.user.provider_id._id)
            return next("No Provider_id Assigin To This User")
    };

    Model.findById(id, function(error, result) {
        if (error)
            return next(error)
        if (result) {
            if (data.demography && result.demography) {
                result.externalId = data.externalId;
                result.specialneeds = data.specialneeds;
                result.demography.dob = data.demography.dob
                result.demography.salutation = data.demography.salutation;
                result.demography.email = data.demography.email
                result.demography.altnumber = data.demography.altnumber
                result.demography.mobilenumber = data.demography.mobilenumber
                result.demography.firstname = data.demography.firstname
                result.demography.gender = data.demography.gender
                result.demography.age = data.demography.age
                result.demography.lastname = data.demography.lastname
                result.demography.agetype = data.demography.agetype
                result.demography.assumeddob = data.demography.assumeddob
                result.demography.altnumber = data.demography.altnumber
                result.demography.middlename = data.demography.middlename
                if (data.demography.firstname && data.demography.lastname) {
                    result.demography.fullname = result.demography.firstname + " " + result.demography.lastname
                    if (data.demography.firstname && data.demography.middlename && data.demography.lastname) {
                        result.demography.fullname = result.demography.firstname + " " + result.demography.middlename + " " + result.demography.lastname
                    };
                };
                result.save(function(error, updateResult) {
                    if (error)
                        return next(error)
                    if (updateResult) {
                        Model.findById(updateResult._id, function(error, finalClient) {
                            if (error)
                                return next(error)
                            if (finalClient) {
                                res.json({
                                    response: finalClient
                                })
                            } else
                                res.json(null)
                        })
                    };
                })
            } else
                return next(new Error("Cannot Find Object data.demography To Update demography"))
        } else
            return next(new Error("Cannot Find Order_id "))
    })

}

exports.findByClientCode = function (req,res,next) {
    var clientcode = req.params.clientcode;
    var provider_id = req.user.provider_id;

    Model.findOne({
        clientcode : clientcode,
        provider_id:provider_id
    }, function(err, result) {
        if (err) return next(err);
        return res.json(result);
    })
}

exports.getListFromProvider = function (req,res,next) {
    return next(new Error("No hook defined in apiConfig"));
}

exports.add = function(req, res, next) {
    // if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"));
    // var data = req.body;
    // if (req.user.provider_id) {
    //     data["provider_id"] = req.user.provider_id._id;
    // };
    // if (!data) return next(new Error("No Data Present To Add Client"));
    // if (!req.user._id) return next(new Error("No User Id Mention"));
    // data.user_id = req.user._id;
    // // data["externalId"] = ""
    // async.waterfall([
    //     function(nextfun) {
    //         nextfun(null)
    //     }
    // ], function(error) {
    //     if (data.demography.firstname && data.demography.lastname) {
    //         if (data.demography.middlename) 
    //             data.demography.fullname = data.demography.firstname.trim() + " " + data.demography.middlename.trim() + " " + data.demography.lastname.trim();
    //         else 
    //             data.demography.fullname = data.demography.firstname.trim() + " " + data.demography.lastname.trim();
    //     }
    //     concateAddressess(data.demography.addresses, function (error,addresses) {
    //         data.demography.addresses = addresses;
    //     });
    //     var addClient = new Model(data);
    //     // console.log(data);
    //     addClient.save(function(error, result) {
    //         if (error) return next(error);
    //         Model.findById(result._id, function(error, result) {
    //             if (error) return next(error);
    //             res.json({
    //                 response: result
    //             });
    //         });
    //     });
    // })
    var inputParams = req.body;
    inputParams.user_id = req.user._id;
    inputParams.provider_id = req.user.provider_id._id;
    addClient(inputParams, function (e, client) {
        if(e) return next(new Error(e));

        return res.json({
            response: client
        });
    });
}

function addClient(params, callback){
    if(!params.demography) return callback("demography not present");
    if(!params.demography.addresses) return callback("addresses not present");
    if(!params.demography.addresses.length) return callback("no address present");
    if(!params.demography.addresses[0]) return callback("no address present, it is"+params.demography.addresses[0]);
    if(!params.provider_id) return callback("provider_id not present");
    if(!params.partner_id) return callback("partner_id not present");
    var clientId;
    params.demography.fullname = concatNames(params.demography);

    var addClt = function(next){
        var clientObj = new Model(params);
        // console.log(data);
        clientObj.save(function(error, result) {
            clientId = result._id;
            if (error) return next(error);
            return next(null);
        });    
    }

    //add update Address
    var addOrUpdateAddr = function(next){
        var inputParams = params.demography.addresses[0];
        inputParams.partner_id = params.partner_id;
        //address add
        function aAddr(next){
            addressController.addAddress(inputParams, function(e,r) {
                if(e) return next(e);
                params.demography.addresses[0]._id = r._id;
                return next(null);
            });
        }

        //address update
        function uAddr(next){
            addressController.updateAddress(inputParams, function(e,r) {
                if(e) return next(e);
                return next(null);
            });
        }

        (inputParams._id) ? uAddr(next) : aAddr(next);
    }// end of addOrUpdateAddr

    async.waterfall([addOrUpdateAddr,addClt],function(error){
        if(error) return callback(error);
        getById(clientId, function(e,c) {
            if(e) return callback(e);
            return callback(null, c);
        });
    })   

}

function concateAddressess(params, callback){
    params.forEach(function(add){
        concateAddress(add,function(error, returnAdd){
            add = returnAdd;
        })
    });
    return callback(null, params)
}

exports.makeAddress = concateAddress;

function concateAddress(params, callback){
    var fulladdress = '';

    if(params.wing) fulladdress = fulladdress.concat(params.wing, ", ");
    if(params.flatno) fulladdress = fulladdress.concat(params.flatno, ", ");
    if(params.floor) fulladdress = fulladdress.concat("FLOOR NO. ", params.floor, ", ");
    if(params.building) fulladdress = fulladdress.concat(params.building, ", ");
    if(params.plotno) fulladdress = fulladdress.concat("PLOT NO. ", params.plotno, ", ");
    if(params.sectorno) fulladdress = fulladdress.concat("SECTOR NO. ", params.sectorno, ", ");
    if(params.streetname) fulladdress = fulladdress.concat(params.streetname, ", ");
    fulladdress = fulladdress.concat(params.sublocation_text, ", ");
    params.address2 = fulladdress.substring(0,fulladdress.lastIndexOf(", "));
    
    return callback(null, params);    
}

exports.updateclientaddress = function(req,res,next){
    var params = req.body
    params.id = req.params.id;
    updateAddress(params, function(e,r){
        if(e) return next(new Error(e));

        return res.json({
            response:r
        });
    })
}

function updateAddress(params, callback){
    if(!params.id) return callback("client id missing");
    if(!params.address) return callback("address missing");
    if(!params.address._id) return callback("address id missing");
    var client;

    function getClientbyid(next){
        Model.findById(params.id,{"demography.address":1}, {lean:true}, function(e,c) {
            if(e) return next(e);

            concateAddress(params.address, function(e,a){
                params.address = a;
            });

            //update client address
            Model.update(params.id , {$set:{"demography.addresses": params.address}}, function(e,sc){
                if(e) return next(e);

                client = sc;
                return next(null);
            });
        });
    }
    //update other client address
    function updateOtherClient(next){
        var search = {
            address:{$in:[params.address._id]}
        }

        Model.find(search, {"demography.address":1}, {lean:true},function (e,childClients) {
            updateclientaddress
        });
    }

    async.waterfall([getClientbyid],function (error) {
       if(error) return callback(error);

       return callback(null, client); 
    });
}


exports.deletePermanent = function(req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Params_id Not Present"));
    
    async.waterfall([
        function(nextfun) {
            //to find Client by id
            getById(id, function(error, client) {
                if (error) return nextfun(error);
                if(!client) return nextfun(new Error("No patient found"))

                return nextfun(null, client)
            });
        },
        function(client, nextfun) {
            //to find orders by client._id
            var search = {}
            search["client_id"] = client._id;
            ModelOrder.find(search, function(error, orders) {
                if (error) return nextfun(error);
                return nextfun(null, client, orders)
            });
        },
        function(client, orders, nextfun) {
            //async each to delete orders
            async.each(orders, function(orderObj, nextrow) {

                if (!orderObj._id) return nextfun(new Error("No order found"))
                    
                ModelOrder.findById(orderObj._id, function(error, orderResult) {
                    if (error) return nextfun(error)

                    orderResult.remove(function(err, order) {
                        if (err) return nextfun(err);
                        return nextrow()
                    });
                })
            }, function(error) {
                // console.log("error from client update");
                if (error) return nextfun(error)
                return nextfun(null, client)
            })
        }
    ], function(error, client) {
        if(error) return next(error);
        //to delete client by client._id
        Model.findById(client._id, function(error, clientResult) {
            if (error) return nextfun(error)

            clientResult.remove(function(err, removedClient) {
                if (err) return nextfun(err);
                res.json({
                    response: removedClient,
                    message: "client and all visits related are deleted permanently"
                });
            });
        })
        
    })
}