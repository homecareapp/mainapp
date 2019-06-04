var Model = require("../models/PartnerService"),
    mongoose = require("mongoose"),
    mongoosePaginate = require("mongoose-paginate"),
    async = require('async');

var OptionMasterModel = require('../models/OptionMaster');
var PatientInstructionModel = require('../models/PatientInstruction');


// exports.getList = function(req, res, next) {
//     if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
//     var search = {};

//     if (req.query.active) {
//         search["_Deleted"] = false;
//     };

//     search["provider_id"] = req.user.provider_id._id

//     if (req.query.partner_id) {
//         search["partner_id"] = req.query.partner_id
//     }
//     var options = {};
//     options["page"] = req.query.page;
//     options["limit"] = parseInt(req.query.limit);
//     if (req.query.name) {
//         search["$or"] = [{
//             "name": new RegExp(req.query.name, "i")
//         }, {
//             "alias": new RegExp(req.query.name, "i")
//         }, {
//             "code": new RegExp(req.query.name, "i")
//         }, ];
//     };

//     if (req.query.category) {
//         search["category"] = req.query.category
//     }

//     if (req.query.category == 'TEST') 
//     {
//         if (req.query.service_id) {
//             search["masterservice.service_id"] = req.query.service_id
//         }
//     }
    
    
//     if(req.query.department_id) search["masterservice.department_id"] = req.query.department_id
//     if(req.query.tube_id) search["masterservice.tubes"] = req.query.tube_id;
//     if(req.query.sampletype) search["sampletype"] = req.query.sampletype;
//     if(req.query.active == "true") search["_Deleted"] = false;
//     else if(req.query.active == "false") search["_Deleted"] = true;
      

//     if (req.query.postsample) {
//         search["postsample"] = req.query.postsample
//     }
//     if (!req.params.id) {
//         if (req.query.page) {
//             options.sortBy = {};
//             options.sortBy["name"] = 1;
//             // console.log(search)
//             Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
//                 if (error) {
//                     return next(error);
//                 };
//                 res.json({
//                     response: paginatedResults,
//                     pageCount: pageCount,
//                     itemCount: itemCount
//                 });
//             });
//         } else {
//             // console.log(search)
//             Model.find(search, {}, {
//                 sort: {
//                     'name': 1
//                 }
//             }, function(error, result) {
//                 res.json({
//                     response: result
//                 });
//             });
//         }
//     } else {
//         Model.findById(req.params.id, function(error, result) {
//             if (error) return next(error);
//             res.json({
//                 response: result
//             });
//         });
//     }
// }

exports.getList = function(req, res, next) {

    async.waterfall([
        function(nextfun) {
            if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
            var search = {};

            if (req.query.active) {
                search["_Deleted"] = false;
            };

            search["provider_id"] = req.user.provider_id._id

            // if (req.query.partner_id) {
            //     search["partner_id"] = req.query.partner_id
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

            var options = {};
            options["page"] = req.query.page;
            options["limit"] = parseInt(req.query.limit);

            search["$and"] = [];

            if (req.query.name) {
                req.query.name = req.query.name.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
                search["$and"].push(
                                { $or: [
                                            {"name": new RegExp(req.query.name, "i")},
                                            {"alias": new RegExp(req.query.name, "i")},
                                            {"code": new RegExp(req.query.name, "i")}
                                        ]
                                    }
                            )
                // search["$or"] = [{
                //     "name": new RegExp(req.query.name, "i")
                // }, {
                //     "alias": new RegExp(req.query.name, "i")
                // }, {
                //     "code": new RegExp(req.query.name, "i")
                // }, ];
            };

            if (req.query.category) {
                search["category"] = req.query.category
            }

            if (req.query.category == 'TEST') 
            {
                if (req.query.service_id) {
                    search["masterservice.service_id"] = req.query.service_id
                }

                if (req.query.si) {
                    search["specialinstructions"] = req.query.si
                }

                // if (req.query.ci) {
                //     req.query.ci = req.query.ci.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
                //     search["customerinstruction"] = new RegExp(req.query.ci, "i")
                // }

                if (req.query.ci) {
                    search["customerinstructions"] = req.query.ci
                }
            }
            
            
            if(req.query.department_id) search["masterservice.department_id"] = req.query.department_id
            if(req.query.tube_id) search["masterservice.tubes"] = req.query.tube_id;
            if(req.query.sampletype) search["sampletype"] = req.query.sampletype;
            if(req.query.active == "true") search["_Deleted"] = false;
            else if(req.query.active == "false") search["_Deleted"] = true;
              

            if (req.query.postsample) {
                search["postsample"] = req.query.postsample
            }
            return nextfun(null, search, options)
        },
        function(search, options, nextfun) {
            if (req.query.category != 'PROFILE') return nextfun(null, search, options)

            // for special service
            if (req.query.category == 'PROFILE') 
            {
                if(req.query.service_id || req.query.si || req.query.ci)
                {
                    var searchTest = {}
                    searchTest["category"] = 'TEST';
                    if(req.query.service_id)
                        searchTest["masterservice.service_id"] = req.query.service_id;
                    if(req.query.si)
                        searchTest["specialinstructions"] = req.query.si;
                    if(req.query.ci)
                    {
                        // req.query.ci = req.query.ci.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
                        // searchTest["customerinstruction"] = new RegExp(req.query.ci, "i")
                        searchTest["customerinstructions"] = req.query.ci
                    }
                    Model.find(searchTest,{_id:1},function(error, partServicesHasSpecialTest){
                        if(error)
                            return nextfun(error);
                        search["childs.test_id"] = {
                            $in: partServicesHasSpecialTest
                        }
                        return nextfun(null, search, options)
                    })
                }
                else
                {
                    return nextfun(null, search, options)
                }
                
            }

            else
            {
                return nextfun(null, search, options)
            }
        },
        function(search, options, nextfun) {
            if (req.query.category != 'PACKAGES') return nextfun(null, search, options)
                
            // for special service
            if (req.query.category == 'PACKAGES') 
            {
                if(req.query.service_id || req.query.si || req.query.ci)
                {
                    var searchTest = {}
                    searchTest["category"] = 'TEST'
                    if(req.query.service_id)
                        searchTest["masterservice.service_id"] = req.query.service_id;
                    if(req.query.si)
                        searchTest["specialinstructions"] = req.query.si;
                    if(req.query.ci)
                    {
                        // req.query.ci = req.query.ci.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
                        // searchTest["customerinstruction"] = new RegExp(req.query.ci, "i")
                        searchTest["customerinstructions"] = req.query.ci
                    }
                    Model.find(searchTest,{_id:1},function(error, partServicesHasSpecialTest){
                        if(error) return nextfun(error);
                        var searchpro = {}
                        searchpro["category"] = "PROFILE"
                        searchpro["childs.test_id"] = {
                            $in: partServicesHasSpecialTest
                        }
                        Model.find(searchpro,{_id:1},function(error, partProfilesHasSpecialTest){
                            if(error) return nextfun(error);
                            //delete search["$or"];
                            search["$and"].push(
                                { $or:  [   
                                            {'childs.test_id': {$in: partServicesHasSpecialTest} },
                                            {'childs.test_id' : {$in: partProfilesHasSpecialTest}}
                                        ]
                                }
                            )

                            // if (req.query.name) {
                            //     req.query.name = req.query.name.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");

                            //     search["$and"].push(
                            //         { $or: [
                            //                 {"name": new RegExp(req.query.name, "i")},
                            //                 {"alias": new RegExp(req.query.name, "i")},
                            //                 {"code": new RegExp(req.query.name, "i")}
                            //             ]
                            //         }
                            //     )
                            // };

                            // search["$or"]=[
                            //         {'childs.test_id': {$in: partServicesHasSpecialTest} },
                            //         {'childs.test_id' : {$in: partProfilesHasSpecialTest}}
                            //     ]

                            return nextfun(null, search, options)
                        })
                    })
                }
                else
                {
                    return nextfun(null, search, options)
                }
            }
            else
            {
                return nextfun(null, search, options)
            }
            
        }
    ], function(error, search, options) {
        if(error) return next(error);
        if (!req.params.id) {
            if (req.query.page) {
                options.sortBy = {};
                options.sortBy["name"] = 1;
                // console.log(search)
                if(!search["$and"].length)
                {
                    delete search["$and"];
                }
                Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
                    if (error) {
                        return next(error);
                    };
                    res.json({
                        response: paginatedResults,
                        pageCount: pageCount,
                        itemCount: itemCount
                    });
                });
            } else {
                // console.log(search)
                Model.find(search, {}, {
                    sort: {
                        'name': 1
                    }
                }, function(error, result) {
                    res.json({
                        response: result
                    });
                });
            }
        } else {
            // Model.findById(req.params.id, function(error, result) {
            //     if (error) return next(error);
            //     res.json({
            //         response: result
            //     });
            // });
            getbyid(req.params.id, function(error, result) {
                if (error) return next(error);
                res.json({
                    response: result
                });
            });
        }
    })

}

function getbyid (id, callback){
    Model.findById(id, function(error, result) {
        if (error) return next(error);
        var tempServ = {};
        tempServ.service_id = result
        var services = [tempServ];
        
        getCustomerInstruction(services, function(e, data){
            result.set('customerinstructionarray', data) 
            return callback(null, result)
        })
        //return callback(null, result);
    });
}

exports.add = function(req, res, next) {
    if (req.user.provider_id) {
        if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    };

    var data = req.body;
    var partnerServiceData = req.body;
    data["provider_id"] = req.user.provider_id._id
    data["partner_id"] = data.partner_id
    var PartnerServiceObj = new Model(partnerServiceData);
    PartnerServiceObj.save(function(error, result) {
        // console.log(error);
        if (error) {
            return next(error)
        }
        getbyid(result._id, function(error, resultObj) {
            if (error) return next(error);
            res.json(resultObj);
        });
        //res.json(result);
    });
}

exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var id = req.params.id;
    var data = req.body;

    Model.findById(id, function(error, result) {
        result.name = data.name;
        result.code = data.code;

        //Update by Toshan
        if (data.category && (data.category.toUpperCase() == "PROFILE" || data.category.toUpperCase() == "PACKAGES") ) {
            result.masterservice.service_id = null;
            result.masterservice.test_id = null;
            result.masterservice.tubes = null;
            result.masterservice.department_id = null;
        }else{
            if (data.masterservice) {
                result.masterservice.service_id = data.masterservice.service_id;    
                result.masterservice.test_id = data.masterservice.test_id;    
                result.masterservice.tubes = data.masterservice.tubes;    
                result.masterservice.department_id = data.masterservice.department_id;    
            };
        };
        //result.masterservice = data.masterservice;

        result.partner_id = data.partner_id;
        // result.department_id = data.department_id;
        result.description = data.description;
        result.B2B = data.B2B;
        result.B2C = data.B2C;
        result.category = data.category;
        result.childs = data.childs;
        result.price = data.price;
        result.customerinstruction = data.customerinstruction;
        result.customerinstructiontype = data.customerinstructiontype;
        result.specialinstruction = data.specialinstruction;
        result.specialinstructions = data.specialinstructions;

        result.customerinstructions = data.customerinstructions;

        result.sharetubes = data.sharetubes;
        result.clientservices = data.clientservices;
        result.alias = data.alias;
        result.tat = data.tat
        result.postsample = data.postsample
        result.sampletype = data.sampletype
        result.collectionprocedure = data.collectionprocedure;
        result.sechedule = data.sechedule;
        result.specialtest = data.specialtest;
        result.postservices = data.postservices;
        
        result["provider_id"] = req.user.provider_id._id
        result.save(function(error, partnerservice) {
            if (error) return next(error);
            getbyid(partnerservice._id, function(error, resultObj) {
                if (error) return next(error);
                res.json(resultObj);
            });
            //res.json(partnerservice);
        });
    });
}

exports.delete = function(req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Params_id Not Present"));
    Model.findById(id, function(err, result) {
        if (err) {
            return next(err);
        }
        // console.log(result);
        if (result._Deleted)
            result._Deleted = false;
        else
            result._Deleted = true;

        result.save(function(err, test) {
            if (err) {
                return next(err);
            }
            return res.json({
                response: test
            });
        });
    });
}

exports.deletePermanent = function(req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Params_id Not Present"));
    Model.findById(id, function (err, result) {
        if (err) return next(err);
        if (!result) return next(new Error("Service Not Present"));

        //todo remove test_id from childs of profile/package.

        async.waterfall(
            [
                function(nextfun) {
                    
                        var search = {}
                        //search["partner_id"] = result.partner_id._id;
                        search["childs.test_id"] = {
                            $in: [result._id]
                        }

                        Model.find(search,function(err, Services){
                            if (err) return nextfun(err);
                            // allServices.forEach(function (serviceObj) {
                            //     console.log()
                            //     return nextfun(serviceObj)
                            // })
                            async.eachSeries(Services, function(obj, nextrow) {
                                
                                    
                                Model.findById(obj._id, function(error, resultSer) {
                                    resultSer.childs.forEach(function (childObj, index) {
                                        if(childObj.test_id._id.toString() == result._id.toString())
                                        {
                                            resultSer.childs.splice(index,1)
                                            resultSer.save(function(error, partnerservice) {
                                            });
                                        }
                                    })
                                    return nextrow()
                                })
                                        
                                
                                
                            }, function(error) {
                                // console.log("error from client update");
                                if (error) return next(error)
                                return nextfun(null)
                            })
                        });
                        
                    
                    
                },
                function(nextfun) {
                    return nextfun()
                }
            ], 
            function(error) {
                if(error) return next(error);
                result.remove(function(err, test) {
                    if (err) {
                        return next(err);
                    }
                    return res.json({
                        response: test
                    });
                });
                
                // return res.json({
                //     response: result
                // });
            }
        )
    })
}

exports.deletePermanent_old = function(req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Params_id Not Present"));
    Model.findById(id, function (err, result) {
        if (err) return next(err);
        if (!result) return next(new Error("Service Not Present"));

        //todo remove test_id from childs of profile/package.

        async.waterfall(
            [
                function(nextfun) {
                    if(result.category == "TEST")
                    {
                        var search = {}
                        search["partner_id"] = result.partner_id._id;
                        search["category"] = {$ne:"TEST"}

                        Model.find(search,function(err, allServices){
                            if (err) return next(err);

                            allServices.forEach(function (serviceObj) {
                                if(serviceObj.category == "PROFILE")
                                {
                                    serviceObj.childs.forEach(function(childObj,index){
                                        if(childObj.test_id)
                                        {
                                            if(childObj.test_id.category == "TEST")
                                            {
                                                if(childObj.test_id._id.toString() == result._id.toString())
                                                {
                                                    serviceObj.childs.splice(index,1)
                                                    //to update service serviceObj.childs[index]._id
                                                    Model.findById(serviceObj._id, function(error, ser) {
                                                        ser.childs = serviceObj.childs;
                                                        ser.save(function(error, partnerservice) {
                                                        });
                                                    })
                                                }
                                            }
                                            if(childObj.test_id.category == "PROFILE")
                                            {
                                                if(childObj.test_id.childs.length)
                                                {
                                                    removeTestFromProfile(childObj, result, function(e, data){
                                                                    
                                                    })
                                                }
                                            }
                                        }
                                    })
                                }
                                if(serviceObj.category == "PACKAGES")
                                {
                                    serviceObj.childs.forEach(function(childObj,index){
                                        if(childObj.test_id)
                                        {
                                            if(childObj.test_id.category == "TEST")
                                            {
                                                if(childObj.test_id._id.toString() == result._id.toString())
                                                {
                                                    serviceObj.childs.splice(index,1)
                                                    //to update service serviceObj.childs[index]._id
                                                    Model.findById(serviceObj._id, function(error, ser) {
                                                        ser.childs = serviceObj.childs;
                                                        ser.save(function(error, partnerservice) {
                                                        });
                                                    })
                                                }
                                            }
                                            if(childObj.test_id.category == "PROFILE")
                                            {
                                                removeTestFromProfile(childObj, result, function(e, data){
                                                                    
                                                })
                                            }
                                            if(childObj.test_id.category == "PACKAGES")
                                            {
                                                removeTestFromPackage(childObj, result, function(e, data){
                                                                    
                                                })
                                            }
                                        }
                                    })
                                }
                            });
                            return nextfun()
                        });
                    }
                    else
                    {
                        return nextfun()
                    }
                },
                function(nextfun) {
                    if(result.category == "PROFILE")
                    {
                        var search = {}
                        search["partner_id"] = result.partner_id._id;
                        search["category"] = {$ne:"TEST"}
                        search["_id"] = {$ne:result._id}

                        Model.find(search,function(err, allServices){
                            allServices.forEach(function (serviceObj) {
                                if(serviceObj.category == "PROFILE")
                                {
                                    serviceObj.childs.forEach(function(childObj,index){
                                        if(childObj.test_id)
                                        {
                                            if(childObj.test_id.category == "PROFILE")
                                            {
                                                if(childObj.test_id.childs.length)
                                                {
                                                    removeProfileFromProfile(childObj, result, function(e, data){
                                                                    
                                                    })
                                                }
                                            }
                                        }
                                    })
                                }
                                if(serviceObj.category == "PACKAGES")
                                {
                                    serviceObj.childs.forEach(function(childObj,index){
                                        if(childObj.test_id)
                                        {
                                            if(childObj.test_id.category == "PROFILE")
                                            {
                                                removeProfileFromProfile(childObj, result, function(e, data){
                                                                    
                                                })
                                            }
                                            if(childObj.test_id.category == "PACKAGES")
                                            {
                                                removeProfileFromPackage(childObj, result, function(e, data){
                                                                    
                                                })
                                            }
                                        }
                                    })
                                }
                            });
                            return nextfun()
                        })
                        
                    }
                    else
                    {
                        return nextfun()
                    }
                },
                function(nextfun) {
                    if(result.category == "PACKAGES")
                    {

                        var search = {}
                        search["partner_id"] = result.partner_id._id;
                        //search["category"] = {$ne:"TEST"}
                        search["$and"] = [{"category":{$ne:'TEST'}},{"status":{$ne:'PROFILE'}}]
                        search["_id"] = {$ne:result._id}

                        Model.find(search,function(err, allServices){
                            allServices.forEach(function (serviceObj) {
                                if(serviceObj.category == "PACKAGES")
                                {
                                    serviceObj.childs.forEach(function(childObj,index){
                                        if(childObj.test_id)
                                        {
                                            if(childObj.test_id.category == "PACKAGES")
                                            {
                                                if(childObj.test_id.childs.length)
                                                {
                                                    removePackageFromPackage(childObj, result, function(e, data){
                                                                    
                                                    })
                                                }
                                            }
                                        }
                                    })
                                }
                            });
                            return nextfun()
                        })
                    }
                    else
                    {
                        return nextfun()
                    }
                },
            ], 
            function(error) {
                if(error) return next(error);
                // result.remove(function(err, test) {
                //     if (err) {
                //         return next(err);
                //     }
                //     return res.json({
                //         response: test
                //     });
                // });
                
                return res.json({
                    response: result
                });
            }
        )
    })
}

function removeTestFromProfile(childProfile, result, callback) {
    if(childProfile.test_id)
    {
        if(childProfile.test_id.childs)
        {
            if(childProfile.test_id.childs.length)
            {
                childProfile.test_id.childs.forEach(function(childObj, index){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "TEST")
                        {
                            
                            if(childObj.test_id._id.toString() == result._id.toString())
                            {
                                childObj.test_id.childs.splice(index,1)
                                //to update service childObj.test_id.childs[index]._id
                                Model.findById(childObj.test_id._id, function(error, ser) {
                                    ser.childs = childObj.test_id.childs;
                                    ser.save(function(error, partnerservice) {
                                    });
                                })
                            }
                        }
                        if(childObj.test_id.category == "PROFILE")
                        {
                            removeTestFromProfile(childObj, result, function(e, data){
                                
                            })
                        }
                    }
                });
            }
        }
    }
    return callback(null,childProfile);
}

function removeTestFromPackage(childPackage, result, callback) {
    if(childPackage.test_id)
    {
        if(childPackage.test_id.childs)
        {
            if(childPackage.test_id.childs.length)
            {
                childPackage.test_id.childs.forEach(function(childObj, index){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "TEST")
                        {
                            //tempServices.push(childObj.test_id)
                            if(childObj.test_id._id.toString() == result._id.toString())
                            {
                                childPackage.test_id.childs.splice(index,1)
                                //to update service childPackage.test_id.childs[index]._id
                                Model.findById(childPackage.test_id._id, function(error, ser) {
                                    ser.childs = childPackage.test_id.childs;
                                    ser.save(function(error, partnerservice) {
                                    });
                                })
                            }
                        }
                        if(childObj.test_id.category == "PROFILE")
                        {
                            if(childObj.test_id.childs)
                            {
                                if(childObj.test_id.childs.length)
                                {
                                    childObj.test_id.childs.forEach(function(childsChildObj, indexChild){
                                        if(childsChildObj.test_id)
                                        {
                                            if(childsChildObj.test_id.category == "TEST")
                                            {
                                                if(childsChildObj.test_id._id.toString() == result._id.toString())
                                                {
                                                    childObj.test_id.childs.splice(indexChild,1)
                                                    //to update service childObj.test_id.childs[index]._id
                                                    Model.findById(childObj.test_id._id, function(error, ser) {
                                                        ser.childs = childObj.test_id.childs;
                                                        ser.save(function(error, partnerservice) {
                                                        });
                                                    })
                                                }
                                            }
                                            if(childsChildObj.test_id.category == "PROFILE")
                                            {
                                                removeTestFromProfile(childsChildObj, result, function(e,data){

                                                });
                                            }
                                        }
                                    })
                                }
                            }
                        }
                        if(childObj.test_id.category == "PACKAGES")
                        {
                            removeTestFromPackage(childObj, result, function(e, data){
                                            
                            });
                        }
                    }
                });
            }
        }
    }
    return callback(null,childPackage);
}

function removeProfileFromProfile(childProfile, result, callback) {
    if(childProfile.test_id)
    {
        if(childProfile.test_id.childs)
        {
            if(childProfile.test_id.childs.length)
            {
                childProfile.test_id.childs.forEach(function(childObj, index){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "PROFILE")
                        {
                            if(childObj.test_id._id.toString() == result._id.toString())
                            {
                                childProfile.test_id.childs.splice(index,1)
                                //to update service childObj.test_id.childs[index]._id
                                Model.findById(childProfile.test_id._id, function(error, ser) {
                                    ser.childs = childProfile.test_id.childs;
                                    ser.save(function(error, partnerservice) {
                                    });
                                })
                            }
                        }
                    }
                });
            }
        }
    }
    return callback(null,childProfile);
}

function removeProfileFromPackage(childPackage, result, callback) {
    if(childPackage.test_id)
    {
        if(childPackage.test_id.childs)
        {
            if(childPackage.test_id.childs.length)
            {
                childPackage.test_id.childs.forEach(function(childObj, index){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "PROFILE")
                        {
                            if(childObj.test_id._id.toString() == result._id.toString())
                            {
                                childPackage.test_id.childs.splice(index,1)
                                //to update service childObj.test_id.childs[index]._id
                                Model.findById(childPackage.test_id._id, function(error, ser) {
                                    ser.childs = childPackage.test_id.childs;
                                    ser.save(function(error, partnerservice) {
                                    });
                                })
                            }
                        }
                        if(childObj.test_id.category == "PACKAGES")
                        {
                            removeProfileFromPackage(childObj, result, function(e, data){
                                            
                            });
                        }
                    }
                });
            }
        }
    }
    return callback(null,childPackage);
}

function removePackageFromPackage(childPackage, result, callback) {
    if(childPackage.test_id)
    {
        if(childPackage.test_id.childs)
        {
            if(childPackage.test_id.childs.length)
            {
                childPackage.test_id.childs.forEach(function(childObj, index){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "PACKAGES")
                        {
                            if(childObj.test_id._id.toString() == result._id.toString())
                            {
                                childObj.test_id.childs.splice(index,1)
                                //to update service childObj.test_id.childs[index]._id
                                Model.findById(childObj.test_id._id, function(error, ser) {
                                    ser.childs = childObj.test_id.childs;
                                    ser.save(function(error, partnerservice) {
                                    });
                                })
                            }
                        }
                    }
                });
            }
        }
    }
    return callback(null,childPackage);
}


exports.getTubes = getTubesByService;

exports.getTubesAndCI = getTubesAndCI;

exports.getSuperSetServices_oldwitharray= function(req, res, next) {
    if(!req.body.serviceIds) return next(new Error("Please send serviceIds"))
    if(!req.body.serviceIdtoadd) return next(new Error("Please send serviceIdtoadd"))

    var serviceIds = req.body.serviceIds;
    //serviceIds.push(req.body.serviceIdtoadd);

    var services = [];
    var resServices = [];
    var finalServicesId = [];
    var fewExist = false;
    var message = "";

    async.waterfall([
        function(nextfun) {
            //find service using ids
            var search = {};
            search["_id"]={$in: serviceIds}
            Model.find(search, null, { lean:true }, function(err, servicesResult) {
                if (err) return nextfun(new Error(err));
                servicesResult.forEach(function(serObj){
                    services.push({"service_id":serObj})
                })
                Model.findById({"_id":req.body.serviceIdtoadd}, null, { lean:true }, function(err, serviceaddobj) {
                    services.push({"service_id":serviceaddobj})
                    return nextfun(null)
                })
                //return nextfun(null)
                
            });
        },
        function(nextfun) {
            services.forEach(function (serviceObj) {
                var obj = {}
                //var name = serviceObj.service_id.name;
                var _id = serviceObj.service_id._id.toString();
                getUniqueTestsFromServices([serviceObj],function(err, uniqueServices){
                    var ids = [];
                    uniqueServices.forEach(function(us){
                        ids.push(us._id.toString());
                    })
                    obj[_id] = ids
                })
                resServices.push(obj)
            });
            return nextfun(null)
        },
        function(nextfun) {
            if(resServices.length > 1)
            {
                for (var i = 0; i < resServices.length; i++) {
                    for (var j = i+1; j < resServices.length; j++) {
                        var firstServices;
                        var firstID;
                        for (var key in resServices[i]) {
                          firstServices = resServices[i][key];
                          firstID = key;
                        }

                        var secondServices;
                        var secondID;
                        for (var key in resServices[j]) {
                          secondServices = resServices[j][key];
                          secondID=key
                        }

                        var diff = _.difference(firstServices, secondServices);

                        if(diff.length!=0 && diff.length == firstServices.length)
                        {
                            // both array are different
                            var foundIndexfirst = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[i][firstID]; 
                                        }
                                        
                                    });
                            if(foundIndexfirst < 0)
                                finalServicesId = finalServicesId.concat(resServices[i])

                            var foundIndexsecond = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[j][secondID]; 
                                        }
                                        
                                    });

                            if(foundIndexsecond < 0)
                                finalServicesId = finalServicesId.concat(resServices[j])
                        }
                        else if(diff.length!=0 && diff.length < firstServices.length)
                        {
                            var diffRev = _.difference(secondServices, firstServices);

                            // if(diffRev.length!=0 && diffRev.length == secondServices.length)
                            // {
                            //     var foundIndex = _.findIndex(finalServicesId, function(t)
                            //         { 
                            //             for (var key in t) {
                            //                 return t[key] == resServices[j][secondID]; 
                            //             }
                                        
                            //         });
                            //     if(foundIndex < 0)
                            //         finalServicesId = finalServicesId.concat(resServices[j])
                            // }
                            if(diffRev.length!=0 && diffRev.length < secondServices.length)
                            {
                                //some are present
                                fewExist = true;
                                var service2 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == secondID)
                                    {
                                        service2 = ser.service_id.name;
                                    }
                                });
                                var service1 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == firstID)
                                    {
                                        service1 = ser.service_id.name;
                                    }
                                });
                                message = "Some Components of "+service2+" are present in "+service1 +",<br>Are you sure you want to add "+service2+".<br><br>";
                                finalServicesId = [];
                                break;
                            }
                            else if(diffRev.length == 0)
                            {
                                //service 2 is already covered in service 1
                                var foundIndex = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[i][firstID]; 
                                        }
                                        
                                    });
                                if(foundIndex < 0)
                                {
                                    var service2 = "";
                                    services.forEach(function(ser){
                                        if(ser.service_id._id.toString() == secondID)
                                        {
                                            service2 = ser.service_id.name;
                                            message += service2+" is already covered in selected services"+".<br><br>"
                                        }
                                    })
                                    finalServicesId = finalServicesId.concat(resServices[i])
                                }
                            }
                        }
                        else if(diff.length == 0)
                        {
                            var diffRev = _.difference(secondServices, firstServices);
                            if(diffRev.length!=0 && diffRev.length == secondServices.length)
                            {
                            }
                            else if(diffRev.length < secondServices.length)
                            {

                                //service 1 is already covered in service 2

                                finalServicesId.forEach(function(t,index){
                                    for (var key in t) {
                                        if(t[key] == resServices[i][firstID])
                                        {
                                            finalServicesId.splice(index,1)

                                            var service1 = "";
                                            services.forEach(function(ser){
                                                if(ser.service_id._id.toString() == firstID)
                                                {
                                                    service1 = ser.service_id.name;
                                                    message += service1+" is remove, as it gets covered in new service"+".<br><br>"
                                                }
                                            });

                                        }
                                    }
                                })
                                


                                var foundIndexsecond = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[j][secondID]; 
                                        }
                                        
                                    });

                                if(foundIndexsecond < 0)
                                {
                                    finalServicesId = finalServicesId.concat(resServices[j])
                                    message = "";
                                    var service1 = "";
                                    services.forEach(function(ser){
                                        if(ser.service_id._id.toString() == firstID)
                                        {
                                            service1 = ser.service_id.name;
                                            message += service1+" is remove, as it gets covered in new service"+".<br><br>"
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            else
            {
                resServices.forEach(function(fid){
                    finalServicesId = finalServicesId.concat(fid)
                })
            }
            return nextfun(null)
        },
        function(nextfun) {
            var sortedIds = [];
            finalServicesId.forEach(function(fid){
                for (var key in fid) {
                    sortedIds.push(key)
                }
            })
            
            return nextfun(null, sortedIds)
        }
    ], function(error, sortedIds) {
        if(error) return next(error);
        var search = {};
            search["_id"]={$in: sortedIds}
        Model.find(search, function(err, servicesResult) {
            resp = {"services":servicesResult,
                    "fewExist":fewExist,
                    "message":message};
        return res.json(resp);
        })
        
        
    })
}

exports.getSuperSetServices = function(req, res, next) {
    if(!req.body.serviceIds) return next(new Error("Please send serviceIds"))
    if(!req.body.serviceIdtoadd) return next(new Error("Please send serviceIdtoadd"))

    var serviceIds = req.body.serviceIds;
    //serviceIds.push(req.body.serviceIdtoadd);

    var services = [];
    var resServices = [];
    var resServiceToAdd = {};
    var finalServicesId = [];
    var fewExist = false;
    var message = "";
    var messageSome = "";
    var serviceIdsToAdd = [];

    var service2FullCovered = false;;

    async.waterfall([
        function(nextfun) {
            //find service using ids
            var search = {};
            search["_id"]={$in: serviceIds}
            Model.find(search, null, { lean:true }, function(err, servicesResult) {
                if (err) return nextfun(new Error(err));
                servicesResult.forEach(function(serObj){
                    services.push({"service_id":serObj})
                })
                Model.findById({"_id":req.body.serviceIdtoadd}, null, { lean:true }, function(err, serviceaddobj) {
                    services.push({"service_id":serviceaddobj})
                    return nextfun(null)
                })
                //return nextfun(null)
                
            });
        },
        function(nextfun) {
            services.forEach(function (serviceObj, index) {
                var obj = {}
                //var name = serviceObj.service_id.name;
                var _id = serviceObj.service_id._id.toString();
                getUniqueTestsFromServices([serviceObj],function(err, uniqueServices){
                    var ids = [];
                    uniqueServices.forEach(function(us){
                        ids.push(us._id.toString());
                    })
                    obj[_id] = ids
                })
                if(services.length - 1 == index)
                {
                    resServiceToAdd = obj;
                }
                else
                {
                    resServices.push(obj)
                }
                
            });
            return nextfun(null)
        },
        function(nextfun) {
            if(resServices.length > 0)
            {
                for (var j = 0; j < resServices.length; j++) {
                        var firstServices;
                        var firstID;
                        for (var key in resServices[j]) {
                          firstServices = resServices[j][key];
                          firstID = key;
                        }

                        var secondServices;
                        var secondID;
                        for (var key in resServiceToAdd) {
                          secondServices = resServiceToAdd[key];
                          secondID=key
                        }

                        var diff = _.difference(firstServices, secondServices);

                        if(diff.length!=0 && diff.length == firstServices.length)
                        {
                            // both array are different
                            //fewExist = false;
                            var foundIndexfirst = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[j][firstID]; 
                                        }
                                        
                                    });
                            if(foundIndexfirst < 0)
                                finalServicesId = finalServicesId.concat(resServices[j])

                            var foundIndexsecond = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServiceToAdd[secondID]; 
                                        }
                                        
                                    });

                            if(foundIndexsecond < 0)
                                finalServicesId = finalServicesId.concat(resServiceToAdd)

                            if(service2FullCovered)
                            {
                                finalServicesId.forEach(function(t,index){
                                    for (var key in t) {
                                        if(t[key] == resServiceToAdd[secondID])
                                        {
                                            finalServicesId.splice(index,1)

                                        }
                                    }
                                })
                            }
                        }
                        else if(diff.length!=0 && diff.length < firstServices.length)
                        {
                            var diffRev = _.difference(secondServices, firstServices);

                            // if(diffRev.length!=0 && diffRev.length == secondServices.length)
                            // {
                            //     var foundIndex = _.findIndex(finalServicesId, function(t)
                            //         { 
                            //             for (var key in t) {
                            //                 return t[key] == resServiceToAdd[secondID]; 
                            //             }
                                        
                            //         });
                            //     if(foundIndex < 0)
                            //         finalServicesId = finalServicesId.concat(resServiceToAdd)
                            // }
                            if(diffRev.length!=0 && diffRev.length < secondServices.length)
                            {
                                //some are present
                                fewExist = true;
                                var service2 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == secondID)
                                    {
                                        service2 = ser.service_id.name;
                                    }
                                });
                                var service1 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == firstID)
                                    {
                                        service1 = ser.service_id.name;
                                    }
                                });
                                messageSome += "Some Components of "+service2+" are present in "+service1 +",<br>Are you sure you want to add "+service2+".<br><br>";
                                //serviceIdsToAdd.push(secondID)
                                var foundIndexsecond = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServiceToAdd[secondID]; 
                                        }
                                        
                                    });
                                if(foundIndexsecond < 0)
                                    finalServicesId = finalServicesId.concat(resServiceToAdd)

                                var foundIndexfirst = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[j][firstID]; 
                                        }
                                        
                                    });
                                if(foundIndexfirst < 0)
                                    finalServicesId = finalServicesId.concat(resServices[j])

                                if(service2FullCovered)
                                {
                                    finalServicesId.forEach(function(t,index){
                                        for (var key in t) {
                                            if(t[key] == resServiceToAdd[secondID])
                                            {
                                                finalServicesId.splice(index,1)

                                            }
                                        }
                                    })
                                }

                                // finalServicesId = [];
                                // break;
                            }
                            else if(diffRev.length == 0)
                            {
                                //fewExist = false;
                                //service 2 is already covered in service 1
                                var foundIndex = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServices[j][firstID]; 
                                        }
                                        
                                    });
                                if(foundIndex < 0)
                                {

                                    finalServicesId.forEach(function(t,index){
                                        for (var key in t) {
                                            if(t[key] == resServiceToAdd[secondID])
                                            {
                                                finalServicesId.splice(index,1)

                                            }
                                        }
                                    })

                                    var service2 = "";
                                    services.forEach(function(ser){
                                        if(ser.service_id._id.toString() == secondID)
                                        {
                                            service2 = ser.service_id.name;
                                        }
                                    });
                                    var service1 = "";
                                    services.forEach(function(ser){
                                        if(ser.service_id._id.toString() == firstID)
                                        {
                                            service1 = ser.service_id.name;
                                        }
                                    });
                                    message += service2+" is already covered in "+service1+".<br><br>"

                                    service2FullCovered = true

                                    // var service2 = "";
                                    // services.forEach(function(ser){
                                    //     if(ser.service_id._id.toString() == secondID)
                                    //     {
                                    //         service2 = ser.service_id.name;
                                    //         message += service2+" is already covered in selected services"+".<br><br>"
                                    //     }
                                    // })
                                    finalServicesId = finalServicesId.concat(resServices[j])
                                    if(service2FullCovered)
                                    {
                                        finalServicesId.forEach(function(t,index){
                                            for (var key in t) {
                                                if(t[key] == resServiceToAdd[secondID])
                                                {
                                                    finalServicesId.splice(index,1)

                                                }
                                            }
                                        })
                                    }
                                }
                            }
                        }
                        else if(diff.length == 0)
                        {
                            //fewExist = false;
                            var diffRev = _.difference(secondServices, firstServices);
                            if(diffRev.length!=0 && diffRev.length == secondServices.length)
                            {
                            }
                            else if(diffRev.length < secondServices.length)
                            {

                                //service 1 is already covered in service 2

                                finalServicesId.forEach(function(t,index){
                                    for (var key in t) {
                                        if(t[key] == resServices[j][firstID])
                                        {
                                            finalServicesId.splice(index,1)

                                            

                                        }
                                    }
                                })

                                var service2 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == secondID)
                                    {
                                        service2 = ser.service_id.name;
                                    }
                                });
                                var service1 = "";
                                services.forEach(function(ser){
                                    if(ser.service_id._id.toString() == firstID)
                                    {
                                        service1 = ser.service_id.name;
                                    }
                                });

                                message += service1+" is removed, as it gets covered in "+service2+".<br><br>"
                                


                                var foundIndexsecond = _.findIndex(finalServicesId, function(t)
                                    { 
                                        for (var key in t) {
                                            return t[key] == resServiceToAdd[secondID]; 
                                        }
                                        
                                    });

                                if(foundIndexsecond < 0)
                                {
                                    finalServicesId = finalServicesId.concat(resServiceToAdd)

                                    // var service2 = "";
                                    // services.forEach(function(ser){
                                    //     if(ser.service_id._id.toString() == secondID)
                                    //     {
                                    //         service2 = ser.service_id.name;
                                    //     }
                                    // });
                                    // var service1 = "";
                                    // services.forEach(function(ser){
                                    //     if(ser.service_id._id.toString() == firstID)
                                    //     {
                                    //         service1 = ser.service_id.name;
                                    //     }
                                    // });
                                    // message += service1+" is removed, as it gets covered in "+service2+".<br><br>"
                                    
                                    
                                }
                            }
                        }
                }
            }
            else
            {
                finalServicesId = finalServicesId.concat(resServiceToAdd)
            }
            return nextfun(null)
        },
        function(nextfun) {
            var sortedIds = [];
            finalServicesId.forEach(function(fid){
                for (var key in fid) {
                    sortedIds.push(key)
                }
            })
            
            return nextfun(null, sortedIds)
        }
    ], function(error, sortedIds) {
        if(error) return next(error);
        var search = {};
            search["_id"]={$in: sortedIds}
        Model.find(search, function(err, servicesResult) {
            resp = {"services":servicesResult,
                    "fewExist":fewExist,
                    "message":message,
                    "messageSome":messageSome};
        return res.json(resp);
        })
        
        
    })
}

function getTubesAndCI(services,partnerShareTubeFlag, callback) {
    var uniqServices = [], returnParam = {};
    var getUniqueSevices = function(next){
        getUniqueTestsFromServices(services, function(e, s){
            if(e) return next(e);
            uniqServices = s;
            return next(null);
        });
    }

    var getTubes = function (next) {
        var tubeCount = 0, totalCount =0, lastTubeId, tempTubes = [];
        uniqServices.forEach(function(ptObj){
            lastTubeId = undefined; //to update tube id for next test
            if (ptObj.masterservice && ptObj.masterservice.tubes) {
                var tubeIdsCount = _.groupBy(ptObj.masterservice.tubes, function (t) {
                                    return [t._id]
                                });
                ptObj.masterservice.tubes.forEach(function(tube) {
                    foundIndex = _.findIndex(tempTubes, function(t) { return t._id == tube._id.toString(); });
                    //checking test id index for tube
                    if(!lastTubeId || lastTubeId != tube._id){
                        tubeCount = tubeIdsCount[tube._id].length;
                        totalCount = tubeIdsCount[tube._id].length;
                    }
                    lastTubeId = tube._id;
                    
                    // tube not found 
                    if (foundIndex<0){
                       var tubeObj = {
                           count:1,
                           _id: tube._id,
                           company: tube.company,
                           size: tube.size,
                           type: tube.type,
                           departments: [],
                           test_ids:[]
                       };

                       tubeObj.departments.push({id:ptObj.masterservice.department_id._id,count:tubeCount});
                       tubeObj.test_ids.push(ptObj._id);
                       tubeCount--;
                       tempTubes.push(tubeObj);
                    }
                    else{
                        var departmentIndexInAddedTube = _.findIndex(tempTubes[foundIndex].departments, function(o){return o.id.toString()==ptObj.masterservice.department_id._id});

                        //share tube  false and department not added in temptube
                        if(!partnerShareTubeFlag && departmentIndexInAddedTube <0){
                            tempTubes[foundIndex].departments.push({id:ptObj.masterservice.department_id._id,count:tubeCount});
                            
                            tempTubes[foundIndex].count = 0
                            tempTubes[foundIndex].departments.forEach(function(d){
                                tempTubes[foundIndex].count = tempTubes[foundIndex].count + d.count;
                            })
                            tubeCount--;
                        }
                        //if share tube is false and department found in added tempTubes  
                        else if(!partnerShareTubeFlag && departmentIndexInAddedTube>=0){
                            // check if all tubes for given test is added?

                            // if same deparment having two tests and tube count is less in one test so taking highest tubecount
                            if(tempTubes[foundIndex].departments[departmentIndexInAddedTube].count < totalCount) 
                                tempTubes[foundIndex].departments[departmentIndexInAddedTube].count = totalCount; 

                            tempTubes[foundIndex].count = 0
                            tempTubes[foundIndex].departments.forEach(function(d){
                                tempTubes[foundIndex].count = tempTubes[foundIndex].count + d.count;
                            })
                            tubeCount--;
                        }

                        //if shareTube = true
                        else if(_.findIndex(tempTubes[foundIndex].test_ids, function(testId) {return testId == ptObj._id }) > -1 && tubeCount >0){
                            tempTubes[foundIndex].count++;
                            tubeCount--;
                        }

                        // check if all tubes for given test is added?
                        else if(_.findIndex(tempTubes[foundIndex].test_ids, function(testId) {return testId != ptObj._id }) > -1 && tubeCount>tempTubes[foundIndex].count){
                            tempTubes[foundIndex].count++;
                            tubeCount--;
                        }
                        // //multiple same tubes in a test 
                        // if(_.findIndex(tempTubes[foundIndex].department_id, function(o){return o==ptObj.masterservice.department_id._id})>-1){
                        //     tempTubes[foundIndex].count++;
                        // }
                            // }
                    };
                });
            };
        });
        returnParam.tubes = tempTubes;
        return next(null);
    }   

    var sortTube = function(next) {
        sortTubes(returnParam.tubes, 'TubeType', function(e,sotredTubes){
            returnParam.tubes = sotredTubes;
            return next(null);
        });
    }

    var getCI = function(next) {
        getCIFromUniqueServices(uniqServices, function(e,cis){
            returnParam.ci = cis
            return next(null);
        });
    }

    var getSI = function(next) {
        getSIFromUniqueServices(uniqServices, function(e,sis){
            returnParam.si = sis
            return next(null);
        });
    }

    async.waterfall([getUniqueSevices, getTubes, sortTube, getCI, getSI], function(error) {
        if(error) callback(error);
        return callback(null, returnParam);
    });
 }

function getTubesByService(services,partnerShareTubeFlag, nexttube) { 
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
            
            Model.find({ _id: { $in: tempServiceIds }},  null, { lean:true }, function (e, partnerTests) {
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
            Model.find({ _id: { $in: tempServiceIds } }, null, { lean:true }, function (e, partnerTests) {
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

exports.getPPTests = getPPTestList;

exports.getCustomerInstructions = function(req, res, next) {
    var services = req.body.services;
    // getCustomerInstruction(services, function(e, result){
    //     //return next(null,result)
    //     return res.json({
    //         response:result
    //     });
    // })
    var partnerShareTubeFlag = services[0].service_id.partner_id.sharetubes;
    getTubesAndCI(services, partnerShareTubeFlag, function(e, result){
        return res.json({
            "patientInstructions":result.ci,
            "specialInstructions":result.si,
            "tubes":result.tubes
        });
    })
}

exports.getOrderCustomerInstructions = function(services, next) {
    getCustomerInstruction(services, function(e, result){
        return next(null,result)
    })
}

exports.getAllUniqueTestsFromServices = function(req, res, next) {
    var services = req.body.services;
    getUniqueTestsFromServices(services, function(e, result){
        return res.json({
            "response":result
        });
    })
}

exports.getUniqueTestsFromServices = getUniqueTestsFromServices;

function getUniqueTestsFromServices(services, callback) {
    var uniqueServices = [];
    var allServices = [];
    services.forEach(function (serviceObj) {
        if(serviceObj.service_id)
        {
            if(serviceObj.service_id.category == 'TEST')
            {
                allServices.push(serviceObj.service_id)
                //allServices = [];
            }
            if(serviceObj.service_id.category == 'PROFILE')
            {
                if(serviceObj.service_id.childs)
                {
                    if(serviceObj.service_id.childs.length)
                    {
                        serviceObj.service_id.childs.forEach(function(childObj){
                            if(childObj.test_id)
                            {
                                if(childObj.test_id.category == "TEST")
                                {
                                    allServices.push(childObj.test_id)
                                }
                                if(childObj.test_id.category == "PROFILE")
                                {
                                    var tempServices = []
                                    getTestFromProfile(childObj,tempServices, function(e, data){
                                        allServices = allServices.concat(data)
                                    })
                                }
                            }
                        })
                    }
                }
            }
            if(serviceObj.service_id.category == 'PACKAGES')
            {
                if(serviceObj.service_id.childs)
                {
                    if(serviceObj.service_id.childs.length)
                    {
                        serviceObj.service_id.childs.forEach(function(childObj){
                            if(childObj.test_id)
                            {
                                if(childObj.test_id.category == "TEST")
                                {
                                    allServices.push(childObj.test_id)
                                }
                                if(childObj.test_id.category == "PROFILE")
                                {
                                    if(childObj.test_id.childs)
                                    {
                                        if(childObj.test_id.childs.length)
                                        {
                                            childObj.test_id.childs.forEach(function(childsChildObj){
                                                if(childsChildObj.test_id)
                                                {
                                                    if(childsChildObj.test_id.category == "TEST")
                                                    {
                                                        allServices.push(childsChildObj.test_id)
                                                    }
                                                    if(childsChildObj.test_id.category == "PROFILE")
                                                    {
                                                        var tempServices = []
                                                        getTestFromProfile(childsChildObj,tempServices, function(e, data){
                                                            allServices = allServices.concat(data)
                                                        })
                                                    }
                                                }
                                            })
                                        }
                                    }
                                }
                                if(childObj.test_id.category == "PACKAGES")
                                { 
                                    var tempServices = []
                                    getTestFromPackages(childObj,tempServices, function(e, data){
                                        allServices = allServices.concat(data)
                                    })
                                }
                            }
                        })
                    }
                }
            }
        }
    })

    var allServicesWithIds = _.filter(allServices, function(ser)
    { 
        return ser._id; 
    });

    if(allServicesWithIds.length)
    {
        uniqueServices = _.uniq(allServicesWithIds, function (item, key, _id) {
            return item._id.toString();
        });
        return callback(null,uniqueServices);
    }
    else
    {
        uniqueServices = [];
        return callback(null,uniqueServices);
    }
}

function getTestFromPackages(childPackage, tempServices, callback) {
    if(!tempServices)
        var tempServices = [];
    if(childPackage.test_id)
    {
        if(childPackage.test_id.childs)
        {
            if(childPackage.test_id.childs.length)
            {
                childPackage.test_id.childs.forEach(function(childObj){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "TEST")
                        {
                            tempServices.push(childObj.test_id)
                        }
                        if(childObj.test_id.category == "PROFILE")
                        {
                            if(childObj.test_id.childs)
                            {
                                if(childObj.test_id.childs.length)
                                {
                                    childObj.test_id.childs.forEach(function(childsChildObj){
                                        if(childsChildObj.test_id)
                                        {
                                            if(childsChildObj.test_id.category == "TEST")
                                            {
                                                tempServices.push(childsChildObj.test_id)
                                            }
                                            if(childsChildObj.test_id.category == "PROFILE")
                                            {
                                                getTestFromProfile(childsChildObj, tempServices, function(e,data){

                                                });
                                            }
                                        }
                                    })
                                }
                            }
                        }
                        if(childObj.test_id.category == "PACKAGES")
                        {
                            getTestFromPackages(childObj, tempServices, function(e, data){
                                            
                            });
                        }
                    }
                });
            }
        }
    }
    return callback(null,tempServices);
}

function getTestFromProfile(childProfile, tempServices, callback) {
    if(!tempServices)
        var tempServices = [];
    if(childProfile.test_id)
    {
        if(childProfile.test_id.childs)
        {
            if(childProfile.test_id.childs.length)
            {
                childProfile.test_id.childs.forEach(function(childObj){
                    if(childObj.test_id)
                    {
                        if(childObj.test_id.category == "TEST")
                        {
                            tempServices.push(childObj.test_id)
                        }
                        if(childObj.test_id.category == "PROFILE")
                        {
                            getTestFromProfile(childObj,tempServices, function(e, data){
                                // allServices = allServices.concat(data)
                            })
                        }
                    }
                });
            }
        }
    }
    return callback(null,tempServices);
}

function getCIFromUniqueServices_old(uniqueServices, nextfun) {
    var fastingInstruction = []
    uniqueServices.forEach(function(serObj){
        if(serObj.customerinstructiontype == 'fasting')
        {
            if(serObj.customerinstruction)
            {
                serObj.customerinstruction = serObj.customerinstruction.toLowerCase();
                var a = [];
                a = serObj.customerinstruction.split(',\n');

                //fastingInstruction.push(serObj.customerinstruction)
                fastingInstruction = fastingInstruction.concat(a)
            }
        }
    })
    fastingInstruction = _.uniq(fastingInstruction, function (item, key, a) {
        return item;
    });

    var randomBloodInstruction = [];
    var randomRandomInstruction = []
    uniqueServices.forEach(function(serObj){
        if(!serObj.sampletype)
        {
            serObj.sampletype = "";
        }
        if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() != 'blood')
        {
            if(serObj.customerinstruction)
            {
                serObj.customerinstruction = serObj.customerinstruction.toLowerCase();

                var a = [];
                a = serObj.customerinstruction.split(',\n');
                //randomRandomInstruction.push(serObj.customerinstruction)
                randomRandomInstruction = randomRandomInstruction.concat(a)
            }
        }
        if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() == 'blood')
        {
            if(serObj.customerinstruction)
            {
                serObj.customerinstruction = serObj.customerinstruction.toLowerCase();

                var a = [];
                a = serObj.customerinstruction.split(',\n');

                //randomBloodInstruction.push(serObj.customerinstruction)
                randomBloodInstruction=randomBloodInstruction.concat(a)
            }
        }
    })
    
    randomBloodInstruction = _.uniq(randomBloodInstruction, function (item, key, a) {
        return item;
    });
    randomRandomInstruction = _.uniq(randomRandomInstruction, function (item, key, a) {
        return item;
    });
    var custInst = []
    if(fastingInstruction.length)
    {
        custInst = fastingInstruction.concat(randomRandomInstruction)
    }
    else
    {
        custInst = randomBloodInstruction.concat(randomRandomInstruction)
    }
    custInst = _.uniq(custInst, function (item, key, a) {
        return item;
    });
    
    return nextfun(null, custInst)
}

function getCIFromUniqueServices(uniqueServices, nextfun) {
    var fastingInstruction = [];
    var randomBloodInstruction = [];
    var randomRandomInstruction = [];

    var createFasting = function(next){
        async.each(uniqueServices, function(serObj, uniquenextrow) {
            if(serObj.customerinstructiontype == 'fasting')
            {
                if(serObj.customerinstructions)
                {
                    if(serObj.customerinstructions.length)
                    {
                        async.each(serObj.customerinstructions, function(obj, nextrow) {
                            PatientInstructionModel.findById(obj, function(error, ciObj) {
                                if(ciObj && ciObj.description)
                                    fastingInstruction.push(ciObj.description)
                                return nextrow()
                            })
                        }, function(error) {
                            if (error) return nextfun(error)
                            return uniquenextrow();
                        })
                    }
                    else
                        return uniquenextrow();
                }
                else
                    return uniquenextrow();
            }
            else
                return uniquenextrow();
        }, function(error) {
            if (error) return nextfun(error)
            fastingInstruction = _.uniq(fastingInstruction, function (item, key, a) {
                return item;
            });
            return next()
        })
    }

    var creatRandom = function(next){
        async.each(uniqueServices, function(serObj, uniquenextrow) {
            if(!serObj.sampletype)
            {
                serObj.sampletype = "";
            }
            if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() != 'blood')
            {
                if(serObj.customerinstructions)
                {
                    if(serObj.customerinstructions.length)
                    {
                        async.each(serObj.customerinstructions, function(obj, nextrow) {
                            PatientInstructionModel.findById(obj, function(error, ciObj) {
                                if(ciObj && ciObj.description)
                                    randomRandomInstruction.push(ciObj.description)
                                return nextrow()
                            })
                        }, function(error) {
                            if (error) return nextfun(error)
                            return uniquenextrow();
                        })
                    }
                    else
                        return uniquenextrow();
                }
                else
                    return uniquenextrow();
            }
            else if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() == 'blood')
            {
                if(serObj.customerinstructions)
                {
                    if(serObj.customerinstructions.length)
                    {
                        async.each(serObj.customerinstructions, function(obj, nextrow) {
                            PatientInstructionModel.findById(obj, function(error, ciObj) {
                                if(ciObj && ciObj.description)
                                    randomBloodInstruction.push(ciObj.description)
                                return nextrow()
                            })
                        }, function(error) {
                            return uniquenextrow();
                        })
                    }
                    else
                        return uniquenextrow();
                }
                else
                    return uniquenextrow();
            }
            else
                return uniquenextrow();
        }, function(error) {
            if (error) return nextfun(error)
            randomBloodInstruction = _.uniq(randomBloodInstruction, function (item, key, a) {
                return item;
            });
            randomRandomInstruction = _.uniq(randomRandomInstruction, function (item, key, a) {
                return item;
            });
            return next()
        })
    }
    

    async.waterfall([createFasting, creatRandom], function(error){
        var custInst = []
        if(fastingInstruction.length)
        {
            custInst = fastingInstruction.concat(randomRandomInstruction)
        }
        else
        {
            custInst = randomBloodInstruction.concat(randomRandomInstruction)
        }
        custInst = _.uniq(custInst, function (item, key, a) {
            return item;
        });
        
        return nextfun(null, custInst)
    });
}

function getSIFromUniqueServices_old(uniqueServices, nextfun) {
    var specialInstruction = []
    uniqueServices.forEach(function(serObj){
        if(serObj.specialinstruction)
        {
            serObj.specialinstruction = serObj.specialinstruction.toLowerCase();
            var a = [];
            a = serObj.specialinstruction.split(/,\n|,/);
            specialInstruction = specialInstruction.concat(a)
        }
    });
    specialInstruction.forEach(function(serObj, index){
        specialInstruction[index]=serObj.trim();
    })
    specialInstruction = _.uniq(specialInstruction, function (item, key, a) {
        return item;
    });
    return nextfun(null, specialInstruction)
}

function getSIFromUniqueServices(uniqueServices, nextfun) {
    var specialInstruction = [];

    async.each(uniqueServices, function(serObj, uniquenextrow) {
        if(serObj.specialinstructions)
        {
            if(serObj.specialinstructions.length)
            {
                async.each(serObj.specialinstructions, function(obj, nextrow) {
                    OptionMasterModel.findById(obj, function(error, siObj) {
                        // if(siObj && siObj.displayname)
                        //     specialInstruction.push(siObj)
                        var tempsiObj=siObj.toObject();
                        if(tempsiObj && tempsiObj.displayname){
                            if(tempsiObj.isattachment)
                                {
                                    delete tempsiObj.attachments;
                                }
                            specialInstruction.push(tempsiObj)
                        }
                        return nextrow()
                    })
                }, function(error) {
                    return uniquenextrow();
                })
            }
            else
                return uniquenextrow();
        }
        else
            return uniquenextrow();
    }, function(error) {
        if (error) return nextfun(error)
        specialInstruction = _.uniq(specialInstruction, function (item, key, a) {
            // return item.toObject()._id.toString();
            return item._id.toString();
        });
        return nextfun(null, specialInstruction)
    })
}

function getCustomerInstruction(services, callback) {
    if(!services) return callback(null,[]);
    if(!services.length) return callback(null,[]);
    var fastingInstruction = [], randomInstruction = [];

    async.waterfall([
        function(nextfun) {
            getUniqueTestsFromServices(services, function(err, uniqueServices){
                return nextfun(null, uniqueServices)
            })
            
        },
        function(uniqueServices, nextfun) {
            var fastingInstruction = []
            uniqueServices.forEach(function(serObj){
                if(serObj.customerinstructiontype == 'fasting')
                {
                    if(serObj.customerinstruction)
                    {
                        serObj.customerinstruction = serObj.customerinstruction.toLowerCase();
                        var a = [];
                        a = serObj.customerinstruction.split(',\n');

                        //fastingInstruction.push(serObj.customerinstruction)
                        fastingInstruction = fastingInstruction.concat(a)
                    }
                }
            })
            fastingInstruction = _.uniq(fastingInstruction, function (item, key, a) {
                return item;
            });

            var randomBloodInstruction = [];
            var randomRandomInstruction = []
            uniqueServices.forEach(function(serObj){
                if(!serObj.sampletype)
                {
                    serObj.sampletype = "";
                }
                if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() != 'blood')
                {
                    if(serObj.customerinstruction)
                    {
                        serObj.customerinstruction = serObj.customerinstruction.toLowerCase();

                        var a = [];
                        a = serObj.customerinstruction.split(',\n');
                        //randomRandomInstruction.push(serObj.customerinstruction)
                        randomRandomInstruction = randomRandomInstruction.concat(a)
                    }
                }
                if(serObj.customerinstructiontype != 'fasting' && serObj.sampletype.toLowerCase() == 'blood')
                {
                    if(serObj.customerinstruction)
                    {
                        serObj.customerinstruction = serObj.customerinstruction.toLowerCase();

                        var a = [];
                        a = serObj.customerinstruction.split(',\n');

                        //randomBloodInstruction.push(serObj.customerinstruction)
                        randomBloodInstruction=randomBloodInstruction.concat(a)
                    }
                }
            })
            
            randomBloodInstruction = _.uniq(randomBloodInstruction, function (item, key, a) {
                return item;
            });
            randomRandomInstruction = _.uniq(randomRandomInstruction, function (item, key, a) {
                return item;
            });
            var custInst = []
            if(fastingInstruction.length)
            {
                custInst = fastingInstruction.concat(randomRandomInstruction)
            }
            else
            {
                custInst = randomBloodInstruction.concat(randomRandomInstruction)
            }
            custInst = _.uniq(custInst, function (item, key, a) {
                return item;
            });
            
            return nextfun(null, custInst)
        }
    ], function(error, custInst) {
        if(error) return next(error);
        
        return callback(null,custInst);
        
    })
}

exports.getOrderTubesPriority = function(order, option, next) {
    getTubesPriority(order, option, function(e, result){
        return next(null,result)
    })
}

function getTubesPriority(order, option, callback){
    async.waterfall([
        function(nextfun) {
            // get optionmaster based on name = TubeType

            var search = {}
            search["name"] = option;

            OptionMasterModel.findOne(search, function(err, resultParent) {
                if (err) return nextfun(new Error(err));
                return nextfun(null, resultParent)
            });
        },
        function(resultParent, nextfun){
            // based on TubeType id , find add childs based on priority;
            var search = {};
            search["parent_id"] = resultParent._id;
            OptionMasterModel.find(search, function(err, resultChilds) {
                if (err) return nextfun(new Error(err));
                resultParent = resultParent;
                //resultParent.set('childs', resultChilds)
                resultParent.childs = resultChilds;
                resultParent.childs = _.sortBy(resultParent.childs,function(a){
                    return a.priority
                })
                return nextfun(null, resultParent)
            });
        },
        function(resultParent, nextfun){
            // sort order tubes based on its priority.
            var newtubes = [];
            resultParent.childs.forEach(function(typeObj) {
                var found = false;
                //order.tubes.forEach(function(tubeObj){                  
                order.tubes.filter(function(tubeObj) {
                    if(!found && tubeObj.type == typeObj.displayname) {
                        newtubes.push(tubeObj);
                        found = true;
                        return false;
                    } else {
                        return true;
                    }
                });
            });
            // order.set('tubes', newtubes);
            //order.tubes = newtubes;
            return nextfun(null, newtubes)
        }
    ], function(err, newtubes) {
        callback(null, newtubes)
    });
}

exports.sortTubes = sortTubes;

function sortTubes(tubes, option, callback){
    async.waterfall([
        function(nextfun) {
            // get optionmaster based on name = TubeType

            var search = {}
            search["name"] = option;

            OptionMasterModel.findOne(search, {}, {lean:true}, function(err, resultParent) {
                if (err) return nextfun(new Error(err));
                return nextfun(null, resultParent)
            });
        },
        function(resultParent, nextfun){
            // based on TubeType id , find add childs based on priority;
            var search = {};
            search["parent_id"] = resultParent._id;
            OptionMasterModel.find(search, {}, {lean:true}, function(err, resultChilds) {
                if (err) return nextfun(new Error(err));
                resultParent = resultParent;
                //resultParent.set('childs', resultChilds)
                resultParent.childs = resultChilds;
                resultParent.childs = _.sortBy(resultParent.childs,function(a){
                    return a.priority
                })
                return nextfun(null, resultParent)
            });
        },
        function(resultParent, nextfun){
            // sort order tubes based on its priority.
            var newtubes = [];
            resultParent.childs.forEach(function(typeObj) {
                var found = false;
                //order.tubes.forEach(function(tubeObj){                  
                tubes.forEach(function(tubeObj) {
                    if(tubeObj.type == typeObj.displayname && _.findIndex(newtubes, function(t){return t._id == tubeObj._id}) < 0) {
                        newtubes.push(tubeObj);
                    }                          
                    
                });
            });
            // order.set('tubes', newtubes);
            //order.tubes = newtubes;
            return nextfun(null, newtubes)
        }
    ], function(err, newtubes) {
        callback(null, newtubes)
    });
}

function getPPTestList(params, callback){
    if(!params.services) return callback("Service not found");
    var  returnTests = [], uniqTests= [], ppTests = [];
    
    var getServericesByIds = function(next) {
        Model.find({_id:{$in: params.services}}, {}, {lean:true}, function(e, tests){
            tests.forEach(function(test){
                returnTests.push({"service_id":test});
            });
            return next(null);
        });
    }

    var getUnqTests = function(next) {
        getUniqueTestsFromServices(returnTests, function(e,tests){
            uniqTests = tests;
            return next(null);
        });
    }

    var getPPTestsFromServices = function(next){
        uniqTests.forEach(function (pt) {
            if (pt.postsample) {                            
                pt.postservices.forEach(function(pp) {
                    ppTests.push(pp);
                });                    
            }
        });
        ppTests = _.uniq(ppTests, function(t){
            return t._id;
        });
        return next(null);
    }

    async.waterfall([getServericesByIds, getUnqTests, getPPTestsFromServices], function(err){
        if(err) return callback(err);
        return callback(null, ppTests);
    })
}