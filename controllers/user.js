var _ = require('lodash');
var async = require('async');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var Model = require('../models/User');
var RoleModel = require('../models/Role');
var CityModel = require('../models/City');
var ModelOrder = require('../models/Order');
var ModelArea = require('../models/Area');
var ModelPartner = require("../models/Partner");
var ModelOption = require("../models/OptionMaster");
var ModelSpecialNeed = require("../models/SpecialNeed");
var ModelService = require("../models/Service");
var pushnotification = require('../controllers/pushnotification');
var ModelWo = require("../models/WeekOffRequest");

var secrets = require('../config/secrets');
var fs = require('fs');
var Grid = require('gridfs-stream');
var mime = require('mime');
var cloudinary = require('cloudinary');
_ = require("lodash");

exports.getList = function (req, res, next) {

    // // if (req.user.role != "admin") return next(new Error("No Access To Users"))
    // var option = {};
    // option["page"] = req.query.page;
    // option["limit"] = parseInt(req.query.limit);
    // var search = {};


    // /***  [remove comment when provider being conf ] **/
    // if (req.user.provider_id) {
    //     search["provider_id"] = req.user.provider_id._id;
    // };

    // if (req.query.usersearch) {
    //     search['$or'] = [{
    //         'profile.name': new RegExp(req.query.usersearch, 'i')
    //     }, {
    //         'profile.code': new RegExp(req.query.usersearch, 'i')
    //     }, {
    //         'profile.email': new RegExp(req.query.usersearch, 'i')
    //     }, {
    //         'username': new RegExp(req.query.usersearch, 'i')
    //     }, {
    //         'profile.mobilenumber': new RegExp(req.query.usersearch, 'i')
    //     }];
    // }


    // if (req.query.name) {
    //     search["username"] = new RegExp(req.query.name, "i");
    // };
    // if (req.query.area_id) {
    //     search["availability.morningareas"] = req.query.area_id;
    // }
    // if (req.query.partner_id) {
    //     search["userinfo.partners"] = req.query.partner_id;
    // }
    // if (req.query.role) {
    //     search["role"] = req.query.role;
    // };
    // if (!req.params.id) {
    //     if (req.query.page) {
    //         Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
    //             if (error) {
    //                 return next(error)
    //             };
    //             res.json({
    //                 response: paginatedResults,
    //                 pageCount: pageCount,
    //                 itemCount: itemCount
    //             });
    //         });
    //     } else {

    //         Model.find(search, function(err, result) {
    //             if (err) return next(new Error(err));
    //             res.json({
    //                 response: result
    //             });
    //         });
    //     }

    // } else {
    //     Model.findById(req.params.id, function(error, result) {
    //         if (error) return next(error);
    //         res.json({
    //             response: result
    //         });
    //     });
    // }
    var params = req.query;
    params.provider_id = req.user.provider_id._id;
    params.id = req.params.id;


    list(params, function (err, result) {
        if (err) return next(new Error(err));

        return res.json(result);
    });
};

exports.getUsers = list;

function list(params, callback) {
    // if (req.user.role != "admin") return next(new Error("No Access To Users"))
    var search = {};
    search['$or'] = [];
    search["provider_id"] = params.provider_id;
    var option = {};
    option["page"] = params.page;
    option["limit"] = parseInt(params.limit);

    var populateList = [
        {
            path: 'userinfo.partners',
            select: '_id info.name info.acronym info.code'
        }
    ]

    if (params.usersearch) {
        search['$or'].push({ 'profile.name': new RegExp(params.usersearch, 'i') })
        search['$or'].push({ 'profile.code': new RegExp(params.usersearch, 'i') })
        search['$or'].push({ 'username': new RegExp(params.usersearch, 'i') })
        search['$or'].push({ 'profile.mobilenumber': new RegExp(params.usersearch, 'i') })
    }


    if (params.name) {
        search["username"] = new RegExp(req.query.name, "i");
    };
    if (params.area_id) {
        search['$or'].push({ 'availability.morningareas': params.area_id })
        search['$or'].push({ 'availability.eveningareas': params.area_id })
    }

    var areas = [];
    if (params.areas) // string comma seperated
    {
        if (params.areas) {
            areas = params.areas.split(',')
        }
        if (areas.length) {
            search['$or'].push({ 'availability.morningareas': { $in: areas } })
            search['$or'].push({ 'availability.eveningareas': { $in: areas } })
        }
    }

    if (params.partner_id) {
        search["userinfo.partners"] = params.partner_id;
    }
    if (params.role) {
        search["role"] = params.role;
    };

    var roles = [];
    if (params.roles) // string comma seperated
    {
        if (params.roles) {
            roles = params.roles.split(',')
        }
        if (roles.length) {
            search["role"] = {
                $in: roles
            }
        }
    }

    var specialtests = [];
    if (params.specialtests) {
        if (params.specialtests) {
            specialtests = params.specialtests.split(',')
        }
        if (specialtests.length) {
            search["profile.specialtestlist"] = {
                $in: specialtests
            }
            search["profile.specialtest"] = true;
        }
    }

    var specialneeds = [];
    if (params.specialneeds) {
        if (params.specialneeds) {
            specialneeds = params.specialneeds.split(',')
        }
        if (specialneeds.length) {
            search["profile.specialneedlist"] = {
                $in: specialneeds
            }
            search["profile.specialneed"] = true;
        }
    }



    if (params.city_id) search["profile.city_id"] = params.city_id;

    if (!search['$or'].length) {
        delete search['$or'];
    }

    if (params.active == "true") search["_Deleted"] = false;
    else if (params.active == "false") search["_Deleted"] = true;

    if (!params.id) {
        if (params.page) {
            //option.populate = populateList;
            //option.columns = 'profile.name userinfo.partners role _Deleted';

            Model.paginate(search, option, function (error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return callback(error)
                };
                var result = {
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                };
                return callback(null, result);

            });
        } else {
            search["_Deleted"] = false;
            Model.find(search, function (err, result) {
                if (err) return callback(new Error(err));
                var returnResponse = {
                    response: result
                }
                return callback(null, returnResponse);
            });
        }

    } else {
        Model.findById(params.id, function (error, result) {
            if (error) return callback(error);
            var returnResponse = {
                response: result
            }
            return callback(null, returnResponse);
        });
    }
}

exports.add = function (req, res, next) {

    // if (!req.user.provider_id) {
    //     return next(new Error("No Provider Id Define"))
    // }
    // var role = req.data.role;
    var data = req.body;
    /**
     * [for any add and update provider_id is require without provider_id reject the request]
     */
    if (!req.user.provider_id) {
        return next(new Error("Cannot  Add New User ProviderId is Missing For " + req.user.profile.name));
    };

    /** [ if role == "partnerfrontoffice" no need off making entry ]*/
    if (data.role == "partnerfrontoffice") {
        if (!data.userinfo.partners.length) {
            return next(new Error("Partner Not Assign To " + data.username + " Require Partner"));
        };
    };
    /* [role == "providerfrontoffice" no need off making entry ]*/
    if (data.role == "providerfrontoffice") {
        if (data.userinfo.partners.length) {
            return next(new Error("Provider Will Not Have Any Partner"));
        };
    };

    data["provider_id"] = req.user.provider_id._id;
    var user = new Model(data);
    user.save(function (err, user) {
        if (err) {
            return next(err)
        };
        return res.json(user);
    })

    /** [uncomment when provider being config with nos of user  provider data transfer url  ] **/
    // getUserAndValidate(req, function(error, result) {
    //     if (result) {
    //         console.log("add new user");
    //     } else {
    //         console.log("cannot add new use");
    //     }
    // });
};


exports.update = function (req, res, next) {
    //console.log("found");
    var id = req.params.id;
    var data = req.body;
    Model.findById(id).select('+password').exec(function (err, user) {
        //console.log("database");

        if (err) return next(err);
        // console.log(user);
        if (!user) return next(new Error("User not found."));
        // user.username = data.username;update
        // user.password = dat--a.password;
        if (data.oldpassword && data.newpassword) {
            user.comparePassword(data.oldpassword, function (err, match) {
                if (err) return next(err);
                // console.log(match)
                if (!match)
                    return next(new Error("password not matched."));
                user.password = data.newpassword;
                user._Deleted = data._Deleted;
                user.role = data.role;
                user.userinfo = data.userinfo;
                user.profile = data.profile;
                user.availability = data.availability;
                user.workinghour = data.workinghour;
                user.deviceinfo = data.deviceinfo;
                user.username = data.username;
                user.save(function (err, result) {
                    if (err) return next(err);
                    delete result.password;
                    return res.json(result);
                })
            })
        } else {
            user._Deleted = data._Deleted;
            user.role = data.role;
            user.userinfo = data.userinfo;
            user.profile = data.profile;
            user.availability = data.availability;
            user.workinghour = data.workinghour;
            user.deviceinfo = data.deviceinfo;
            user.username = data.username;
            user.save(function (err, result) {
                if (err) return next(err);
                return res.json(result);
            })
        }

    })
};

exports.changePassword = function (req, res, next) {
    //console.log("found");
    var id = req.params.id;
    var data = req.body;
    if (!id)
        return next(new Error("id not found."));
    if (!data.oldpassword)
        return next(new Error("Password not found."));
    if (!data.newpassword)
        return next(new Error("Password not found."));

    Model.findById(id).select('+password').exec(function (err, user) {
        //console.log("database");

        if (err) return next(err);
        // console.log(user);
        if (!user) return next(new Error("User not found."));

        if (data.oldpassword && data.newpassword) {
            user.comparePassword(data.oldpassword, function (err, match) {
                if (err) return next(err);
                // console.log(match)
                if (!match)
                    return next(new Error("password not matched."));
                user.password = data.newpassword;

                user.save(function (err, result) {
                    if (err) return next(err);
                    delete result.password;
                    return res.json(result);
                })
            })
        }
    })
};

/**
 * POST /login
 * Sign in using email and password......
 */
exports.postLogin = function (req, res, next) {
    console.log("log API called");
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err)
        }
        if (!user) {
            var err = new Error('username/password not valid');
            err.status = 400;
            return next(err);
        }

        //user has authenticated correctly thus we create a JWT token
        if (user.userinfo) {

            if (!user.userinfo.partners) {
                user.userinfo.partners = [];
            } else {
                user.userinfo.partners.forEach(function (obj, index) {
                    if (obj._Deleted == true) {
                        user.userinfo.partners.splice(index, 1);
                    }
                });
            }
        }
        user = user.toObject();
        var payload = {};
        payload.username = user.username;
        payload.uid = user._id;
        delete user.profile.specialneedlist
        delete user.profile.specialtestlist
        payload.profile = user.profile;
        payload.password = user.password;
        // fireBase
        var firebaseConfig = {
            apiKey: secrets.firebaseConfig.apiKey,
            authDomain: secrets.firebaseConfig.authDomain,
            databaseURL: secrets.firebaseConfig.firebaseDBURL,
            storageBucket: secrets.firebaseConfig.storageBucket
        };


        if (user.role == "superuser") {
            var token = jwt.sign(payload, secrets.tokenSecret);
            var userMenu;

            var userdata = user;
            delete userdata.password;

            RoleModel.findOne({
                "name": user.role
            }, function (err, resRole) {
                if (err) return next(new Error("Error in getting role."));

                //userdata.menu = resRole.menus
                userdata.menu = userMenu;
                return res.json({
                    token: token,
                    userdata: userdata,
                    firebaseConfig: firebaseConfig
                });
            })
        } else {
            async.waterfall([
                function (nextfun) {
                    if (user.role == 'serviceagent' || user.role == 'logistic') {
                        user.userinfo.partners = [];
                        Model.findById(user._id, function (err, result) {
                            result.userinfo.partners = [];
                            result.save(function (err, result) {
                                return nextfun()
                            })
                        })
                    }
                    else {
                        return nextfun()
                    }
                },

                function (nextfun) {
                    var token = jwt.sign(payload, secrets.tokenSecret);
                    var userMenu;
                    var search = {
                        name: user.role
                    }
                    var userdata = user;
                    delete userdata.password;

                    RoleModel.findOne(search, function (err, resRole) {
                        if (!resRole) {
                            return next("no result found");
                        }
                        userdata.menu = resRole.menus;
                        ress = {
                            token: token,
                            userdata: userdata,
                            firebaseConfig: firebaseConfig
                        }
                        return nextfun(null, ress)
                    });

                }
            ], function (error, response) {
                if (error) return next(error)
                res.json(
                    ress
                )
            })
        }
    })(req, res, next);

};

/** [get all user from database according to login provider_id then validate the
     number of user count amongs the number of user creating ] */
function getUserAndValidate(req, callback) {
    var provider_id = req.user.provider_id._id;
    var providerUserCount = req.user.provider_id.plan.users;
    var providerUserCreated;
    // console.log(providerUserCount);
    if (!provider_id) return callback(new Error("No provider_id assign to " + req.user.profile.name + " "));
    Model.find({
        "provider_id": provider_id
    }, function (error, result) {
        if (error) return callback(error);
        providerUserCreated = result.length;
        if (providerUserCreated + 1 == providerUserCount || providerUserCreated + 1 < providerUserCount) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    })
}


// IMPORTANT Need to add below mlyusers route into admin routes to access if its done delete the comment
/*
    IMPORTANT
    and add route into indexRoutes
 */

/*
    [ for mly to get all users which are not assign to any orders]
 */
exports.getAvailableServiceAgent = function (req, res, next) {

    async.waterfall([
        /*
            [get all users from user collection where morning area match with query.areas_id]
         */
        function getUsers(nextfun) {
            var searchUser = {}
            searchUser["role"] = "serviceagent"
            searchUser["provider_id"] = req.user.provider_id._id
            searchUser["availability.morningareas"] = {
                $in: [req.query.area_id]
            }
            searchUser["userinfo.partners"] = {
                $in: [req.query.partner_id]
            }
            Model.find(searchUser, function (error, users) {
                if (error) return next(error)
                if (users.length > 0) return nextfun(null, users)
                else return next(new Error("No Users Found This Area"))
            })
        },
        /*
            [get all orders from order collection basbased on partner_id fromtime fromday area_id]
         */
        function (users, nextfun) {
            var userList = []
            var searchOrder = {}
            if (req.query.fromdate) {
                var fdate = new Date(req.query.fromdate);
                var tdate = new Date(fdate);
                tdate.setDate(tdate.getDate() + 1);
                tdate.setSeconds(tdate.getSeconds() - 1);
                searchOrder["fromdate"] = {
                    $gte: fdate.toUTCString(),
                    $lte: tdate.toUTCString()
                }
                async.eachSeries(users, function (user, nextuser) {
                    searchOrder["provider_id"] = req.user.provider_id._id
                    searchOrder["fromtime"] = req.query.fromtime
                    searchOrder["partner_id"] = req.query.partner_id
                    searchOrder["assignto"] = user._id
                    ModelOrder.find(searchOrder, function (error, orders) {
                        if (error) return next(error)
                        if (orders.length > 0) {
                            return nextuser()
                        } else {
                            userList.push(user)
                            return nextuser()
                        }
                    });
                }, function (error) {
                    return nextfun(null, userList)
                })
            }
        }
    ], function (error, response) {
        if (error) return next(error)
        res.json({
            response: response
        })
    })
}

/*
[ get all users not assign to any order for srl ]
 */
exports.getSRLUsers = function (req, res, next) {
    /*
        get all query required to get users if missing query reject the request with error
     */
    if (!req.query.fromdate) return next(new Error("Query Missing Fromdate"))
    // if (!req.query.fromtime) return next(new Error("Query Missing Fromtime"))
    if (!req.query.pincode) return next(new Error("Query Missing Pincode"))
    // if (!req.query.area) return next(new Error("Query Missing Area"))
    var searchOrder = {}
    if (req.query.fromdate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(fdate);
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        // for time being need to have correct solution for server date
        // 
        // @abs [ old code given below ]
        // uncomment below code while running this code on local enviroment
        // var day = days[fdate.getDay()];
        // new code below to get the correct iso while running on server
        // comment below code while running this code on local enviroment
        var day = days[fdate.getDay() + 1];
        tdate.setDate(tdate.getDate() + 1);
        tdate.setSeconds(tdate.getSeconds() - 1);
        searchOrder["fromdate"] = {
            $gte: fdate.toUTCString(),
            $lte: tdate.toUTCString()
        };

        // **** only for server check its work fine in local enviroment ****
        // @abs [ if index in out of collection then set the correct day]
        // on server
        // if day = monday index is 0
        if (fdate.getDay() == 6) {
            // console.log(" 6");
            day = days[0];
        };

        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++");
        // console.log(fdate.getDay());
        // console.log(day);
        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++");
        // var dayqw = days[fdate.getDay() + 1];
        // console.log(dayqw);
        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++");


        var finalOutPut = [];
        async.waterfall([
            /*
            [  get all partner according to provider_id ]
             */
            function (nextfun) {
                if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"))
                var search = {}
                if (req.user.userinfo.partners.length) {
                    return nextfun(null, req.user.userinfo.partners)
                } else {
                    search["provider_id"] = req.user.provider_id._id
                    ModelPartner.find(search, function (error, partners) {
                        if (error) return next(error)
                        return nextfun(null, partners)
                    })
                }

            },
            /*
            [ sort partner based on pincodes ]
             */
            function (partners, nextfun) {
                var pincodePartners = [];
                // console.log("nextrow")
                // console.log(partners.length)
                async.each(partners, function (obj, nextrow) {
                    // console.log("nextrow")
                    // console.log(obj)
                    for (var countarea = 0; countarea < obj.areas.length; countarea++) {
                        for (var countpincode = 0; countpincode < obj.areas[countarea].area_id.pincodes.length; countpincode++) {

                            if (obj.areas[countarea].area_id.pincodes[countpincode] == req.query.pincode) {
                                //console.log(_.indexOf(partners, obj._id));
                                //console.log();
                                if ((_.findIndex(pincodePartners, function (o) {
                                    return o._id == obj._id;
                                })) < 0)
                                    pincodePartners.push(obj)
                            };
                        }
                    }
                    return nextrow()
                }, function (error) {
                    if (error) return next(error)
                    return nextfun(null, pincodePartners)
                })
            },

            function (pincodePartners, nextfun) {
                var search = {};
                search["name"] = "PhleboType";
                ModelOption.find(search, function (error, PhleboTypeParent) {
                    if (error) return next(error)
                    var optionSearch = {}
                    var option = {};
                    optionSearch["parent_id"] = PhleboTypeParent[0]._id;
                    option.sort = {};
                    option.sort["priority"] = 1;

                    ModelOption.find(optionSearch, {}, option, function (error, phlebotypepriorities) {
                        //console.log('phlebotypepriorities ===' + phlebotypepriorities + 'phlebotypepriorities ===')
                        if (error) return next(error)
                        return nextfun(null, pincodePartners, phlebotypepriorities)
                    })
                })

            },
            /*
            [ find partner users and Orders of the user on pincodes ]
             */
            function (pincodePartners, phlebotypepriorities, nextfun) {
                var ordersList = [];
                var resultArray = [];
                async.eachSeries(phlebotypepriorities, function (phlebotypeobj, nextrow) {
                    var search = {};
                    var option = {};
                    //console.log(phlebotypeobj.displayname);
                    search["profile.type"] = phlebotypeobj.displayname;
                    search["provider_id"] = req.user.provider_id._id;
                    search["role"] = "serviceagent";
                    search["_Deleted"] = false;
                    search["userinfo.partners"] = {
                        $in: pincodePartners
                    }
                    option.sort = {};
                    option.sort["profile.rating"] = -1;
                    // console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
                    // console.log(day);
                    // console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
                    search["workinghour.day"] = day // Commented due server date time issue

                    var exist;

                    Model.find(search, {}, option, function (error, users) {
                        // console.log(search["profile.type"])
                        if (error) return next(error)
                        if (!users)
                            return nextrow()


                        async.eachSeries(users, function (user, nextUser) {
                            var resultObj = user.toObject();
                            resultObj.partners = [];
                            var searchOrder = {};
                            searchOrder["provider_id"] = req.user.provider_id._id
                            searchOrder["partner_id"] = {
                                $in: pincodePartners
                            }
                            searchOrder["fromdate"] = req.query.fromdate
                            // searchOrder["fromtime"] = req.query.fromtime
                            searchOrder["assignto"] = user._id;
                            searchOrder["status"] = {
                                $ne: 'Cancelled'
                            }
                            var populateQuery = [{
                                path: "area_id",
                                select: "_id name pincodes"
                            }, {
                                path: "client_id",
                                select: "_id demography.salutation demography.fullname"
                            }]

                            ModelOrder.find(searchOrder, function (error, orders) {
                                resultObj.orders = orders
                                //console.log(orders)
                                pincodePartners.forEach(function (pp) {
                                    var partnerExist = _.find(resultObj.userinfo.partners, function (up) {
                                        return pp._id.equals(up._id)
                                    })
                                    if (partnerExist)
                                        resultObj.partners.push(partnerExist)
                                })
                                resultArray.push(resultObj);
                                return nextUser();

                            }).populate(populateQuery)
                        }, function (err) {
                            if (err) return next(err)
                            return nextrow()
                        })
                    })

                }, function (error) {
                    if (error) return next(error)
                    return nextfun(null, resultArray);
                })
            }
        ],
            function (error, ordersList) {
                if (error) return next(error)
                res.json({
                    response: ordersList
                });
            })
    }
}

exports.delete = function (req, res, next) {
    var id = req.params.id;
    if (!id) return next(new Error("Params_id Not Present"));
    Model.findById(id, function (err, result) {
        if (err) {
            return next(err);
        }
        // console.log(result);
        if (result._Deleted)
            result._Deleted = false;
        else
            result._Deleted = true;

        result.save(function (err, test) {
            if (err) {
                return next(err);
            }
            return res.json({
                response: test
            });
        });
    });
    // console.log("hello");
}

exports.getUsersByArea = function (req, res, next) {
    return res.json({ error: "generic method not defined. please check parser." })
}

/* Method to get Users(Phlebo) list based on 
- time (Morning/Evening)
- area
- date
*/
exports.getUsersWithOrders = function (req, res, next) {
    var date = req.query.date, day = req.query.day, evening = req.query.evening, area_id = req.query.area_id;



    if (!area_id) return res.json({ error: "Area not found." });
    var area_ids = area_id.split(",");
    if (!date) return res.json({ error: "Date not found." })

    if (day == "true") day = true;
    else day = false;
    if (evening == "true") evening = true;
    else evening = false;

    var timeSlot = JSON.parse('[{"time":"360"},{"time":"420"},{"time":"480"},{"time":"540"},{"time":"600"},{"time":"660"},{"time":"720"},{"time":"780"},{"time":"840"},{"time":"900"},{"time":"960"},{"time":"1020"},{"time":"1080"},{"time":"1140"},{"time":"1200"},{"time":"1260"},{"time":"1320"},{"time":"1380"},{"time":"0"},{"time":"60"},{"time":"120"},{"time":"180"},{"time":"240"},{"time":"300"}]');

    var populateOrderQuery = [{
        path: 'client_id',
        select: '_id demography.salutation demography.fullname demography.mobilenumber demography.gender demography.age'
    }, {
        path: 'servicedeliveryaddress.sublocation_id',
        select: '_id  name'
    }, {
        path: 'partner_id',
        select: '_id  info.name'
    }]

    var morningSlot = _.filter(timeSlot, function (t) {
        return parseInt(t.time) > 359 && parseInt(t.time) < 1080
    }),
        eveningSlot = _.filter(timeSlot, function (t) {
            return (parseInt(t.time) >= 1080 || (parseInt(t.time) >= 0 && parseInt(t.time) < 360))
        }),
        finalSlot = [];

    async.waterfall([
        // get user by area and time
        function getPhlebos(userNextFunc) {
            var searchUser = {};
            // if time is before 4:30 PM {day:true}
            searchUser["provider_id"] = req.user.provider_id._id;
            searchUser["role"] = "serviceagent";

            if (day) {
                searchUser["availability.day"] = true;
                searchUser["availability.morningareas"] = { $in: area_ids };
                finalSlot = morningSlot;
            }
            // if time is after 4:30 PM {evening:true}
            else if (evening) {
                searchUser["availability.evening"] = true;
                searchUser["availability.eveningareas"] = { $in: area_ids };
                finalSlot = eveningSlot;
            }
            searchUser["_Deleted"] = false;
            Model.find(searchUser, { profile: 1 }, { lean: true }, function (err, resultUser) {
                if (err) res.json({ error: "Error while finding users: " + err });
                return userNextFunc(null, resultUser);
            })
        },

        //get order of the users for the date
        function getOrders(users, orderNextFunc) {

            var searchOrder = {};
            searchOrder["fromdate"] = date;
            searchOrder["provider_id"] = req.user.provider_id._id;
            // searchOrder["assignto"] = {$in:users};
            searchOrder["servicedeliveryaddress.area_id"] = { $in: area_ids };

            // console.log(searchOrder);
            ModelOrder.find(searchOrder, { client_id: 1, assignto: 1, partner_id: 1, fromtime: 1, servicedeliveryaddress: 1, status: 1 }, { lean: true }, function (err, resultOrder) {
                if (err) res.json({ error: "Error while finding userOrder: " + err });
                return orderNextFunc(null, users, resultOrder);
            }).populate(populateOrderQuery);
        },

        //add order JSON in User JSON
        function makePhleboList(users, orders, userOrderNextFunc) {
            var tempTimeSlot = [];
            var tempTimeObj;
            for (var i = 0; i < users.length; i++) {
                tempTimeSlot = [];
                for (var j = 0; j < finalSlot.length; j++) {
                    tempTimeObj = {
                        time: finalSlot[j].time,
                        available: true
                    }
                    // get users order for given time 
                    tempTimeObj.orders = _.filter(orders, function (o) {
                        if (o.fromtime == finalSlot[j].time) {
                            if (o.assignto) {
                                if (o.assignto.toString() == users[i]._id.toString()) return true;
                            }
                            else return false;
                        }
                        else
                            return false;
                    });
                    // available false if order present for the time
                    if (tempTimeObj.orders.length)
                        tempTimeObj.available = false;

                    tempTimeSlot.push(tempTimeObj)
                };
                users[i].availableTime = tempTimeSlot;
            };
            return userOrderNextFunc(null, users, orders);
        },
        function makeOrderList(users, orders, makeOrderListNextFunc) {
            var tempTimeOrders = [];
            var tempTimeObj;
            for (var j = 0; j < finalSlot.length; j++) {
                tempTimeObj = {
                    time: finalSlot[j].time,
                    orders: 0
                }
                // get order count for given time 
                tempTimeObj.orders = _.filter(orders, function (o) {
                    return (o.fromtime >= finalSlot[j].time && o.fromtime < (parseInt(finalSlot[j].time) + 60) && o.status == "Unassigned");
                }).length;

                tempTimeOrders.push(tempTimeObj)
            };
            return makeOrderListNextFunc(null, users, tempTimeOrders);
        }
    ],
        function (err, users, orders) {
            if (err) return next();
            return res.json({ response: { "users": users, "orders": orders } });
        }
    );
}

exports.registerdeviceid = function (req, res, next) {

    var device = req.body.device;
    var deviceid = req.body.deviceid;
    console.log(req.user);
    var userid = req.user._id;
    var name = req.user.profile.firstname;
    if (req.user.profile.lastname)
        name += ' ' + req.user.profile.lastname;
    var mobilenumber = req.user.mobilenumber;

    async.waterfall([
        function (nextfunc) {
            //Register with SNS
            var pn = {};
            pn.type = 'register';
            pn.userid = userid;
            pn.name = name;
            pn.mobilenumber = mobilenumber;
            pn.device = device;
            pn.deviceid = deviceid;
            // messagequeue.sendMessage({
            //     qname: "push",
            //     message: JSON.stringify(pn)
            // }, function(err, resp) {
            //     if (err) console.log(err);
            //     return nextfunc();
            // })
            pushnotification.register(pn, function (err, result) {
                if (err) console.log(err);
                return nextfunc();
            })
        }
    ], function (err, result) {
        if (err) return next(new Error(err));
        var message = "registered sucessfully"

        res.json(message);
    });
}

exports.unregisterdeviceid = function (req, res, next) {
    var device = req.body.device;
    var deviceid = req.body.deviceid;
    var user_id = req.user._id;

    async.waterfall([
        function (nextfunc) {

            //unregister from resonator
            var pn = {};
            pn.type = 'unregister';
            pn.userid = user_id;
            pn.device = device;
            pn.deviceid = deviceid;

            // messagequeue.sendMessage({
            //     qname: "push",
            //     message: JSON.stringify(pn)
            // }, function(err, resp) {
            //     if (err)
            //         console.log(err);
            // })

            pushnotification.unregister(pn, function (err, result) {
                if (err) console.log(err);
                return nextfunc();
            })
        }], function (err) {
            if (err) return next(new Error(err));
            var message = "unregistered sucessfully"

            res.json(message);
        });
}


exports.resetPassword = function (req, res, next) {
    var user_id = req.params.id;
    // console.log("user_id", user_id);
    if (!user_id) return next(new Error("user_id not found"));



    Model.findById(user_id, function (e, r) {
        if (e) return next(new Error(e));
        if (!r) return next(new Error("no user found"));
        r.password = '12345';
        // console.log(r);
        r.save(function (e1, r1) {
            // console.log(e1);
            return res.json({
                message: "updated"
            });
        })
    })
}

exports.getLogisticUsersByArea = function (req, res, next) {
    var data = req.body;

    if (!data.area_id) return res.json({ error: "Area not found." })
    if (!data.date) return res.json({ error: "Date not found." })
    if (!data.time && parseInt(data.time) != 0) return res.json({ error: "Time not found." })

    var populateQuery = [{
        path: 'client_id',
        select: '_id demography.salutation demography.fullname demography.mobilenumber demography.gender demography.age'
    }, {
        path: 'servicedeliveryaddress.sublocation_id',
        select: '_id  name'
    },
    {
        path: 'partner_id',
        select: '_id  info.name'
    },
    {
        path: 'assignto',
        select: '_id profile.name profile.mobilenumber'
    }]

    async.waterfall([
        // get user by area and time
        function (userNextFunc) {
            var searchUser = {};
            searchUser.role = "logistic"; // as now added for 
            // if time is before 4:30 PM {day:true}
            if (data.time <= 990) {
                searchUser["provider_id"] = req.user.provider_id._id;
                searchUser["availability.day"] = true;
                searchUser["availability.morningareas"] = { $in: [data.area_id] };
            }
            // if time is after 4:30 PM {evening:true}
            else {
                searchUser["provider_id"] = req.user.provider_id._id;
                searchUser["availability.evening"] = true;
                searchUser["availability.eveningareas"] = { $in: [data.area_id] };
            }
            searchUser["_Deleted"] = false;
            Model.find(searchUser, { profile: 1 }, { lean: true }, function (err, resultUser) {
                if (err) res.json({ error: "Error while finding users: " + err });
                return userNextFunc(null, resultUser);
            })
        },

        //get wo/leave of the users for the date
        function (users, woNextFunc) {
            var searchWo = {};
            searchWo["requestdate"] = { $lte: data.date };
            searchWo["requesttodate"] = { $gte: data.date };
            searchWo["user_id"] = { $in: users };
            searchWo["status"] = 'accepted'

            // console.log(searchOrder);
            ModelWo.find(searchWo, {}, { lean: true }, function (err, resultWo) {
                if (err) res.json({ error: "Error while finding userOrder: " + err });
                return woNextFunc(null, users, resultWo);
            });
            //return woNextFunc(null,resultUser);
        },

        // function (users, wos, userWoNextFunc) {
        //  var filteredUsers = [];
        //  users.forEach(function (userObj) {
        //      userObj.wos = [];
        //      wos.forEach(function (woObj) {
        //          if (userObj._id.toString() == woObj.user_id.toString()) userObj.wos.push(woObj);                        
        //      })
        //      filteredUsers.push(userObj);
        //  })
        //  return userWoNextFunc(null, filteredUsers); 
        // },

        function (users, wos, userWoNextFunc) {
            var filteredUsers = users;

            _.find(wos, function (wosObj, index) {
                if (wosObj.requesttype == 'halfday') {
                    if (wosObj.requesttime && wosObj.requesttotime) {
                        if (wosObj.requesttime > data.time || data.time > wosObj.requesttotime) {
                            wos.splice(index, 1);
                        }


                    }
                }
            })


            // for (var i = 0; i < filteredUsers.length; i++) {
            //     _.find(wos, function (woObj) { 
            //         if(filteredUsers[i]._id.toString() == woObj.user_id._id.toString())
            //         {
            //             filteredUsers.splice(i,1);
            //         }
            //     })
            // }
            if (filteredUsers.length) {
                for (var i = 0, count = filteredUsers.length; i < count;) {
                    _.find(wos, function (woObj) {
                        if (i < count) {
                            if (filteredUsers[i]._id.toString() == woObj.user_id._id.toString()) {
                                filteredUsers.splice(i, 1);
                                count--;
                            }
                        }
                    })
                    i++;
                };
            }
            return userWoNextFunc(null, filteredUsers);
        },

        //get order of the users for the date
        function (users, orderNextFunc) {

            var searchOrder = {};
            searchOrder["logistic.pickupdate"] = data.date;
            searchOrder["logistic.logistic_id"] = { $in: users };
            searchOrder["status"] = { $ne: "xyz" };
            searchOrder["provider_id"] = req.user.provider_id._id;

            ModelOrder.find(searchOrder, { client_id: 1, logistic: 1, fromtime: 1, servicedeliveryaddress: 1, partner_id: 1, assignto: 1, status: 1 }, { lean: true }, function (err, resultOrder) {
                if (err) res.json({ error: "Error while finding userOrder: " + err });
                return orderNextFunc(null, users, resultOrder);
            }).populate(populateQuery);
        },

        //complete JSON structure
        function (users, orders, userOrderNextFunc) {
            var filteredUsers = [];
            users.forEach(function (userObj) {
                userObj.orders = [];
                orders.forEach(function (orderObj) {
                    if (userObj._id.toString() == orderObj.logistic.logistic_id.toString()) userObj.orders.push(orderObj);
                })
                filteredUsers.push(userObj);
            })
            return userOrderNextFunc(null, filteredUsers);
        }
    ], function (err, filteredUsers) {
        if (err) return next();
        return res.json({ response: { users: filteredUsers } });
    });
}

exports.getUserInfoList = function (req, res, callback) {
    var searchUser = {}, searchPartner = {}, searchArea = {},
        users = [], partners = [], cities = [], roles = [], areas = [], specialneeds = [], services = [],
        page, items, option, populateQuery,
        params = req.query,
        sort = (req.query.sort && req.query.sort != "asc") ? -1 : 1;
    function makeUserSearchObj() {
        if (params.active == "true") searchUser._Deleted = false
        if (params.active == "false") searchUser._Deleted = true
        if (params.usersearch || params.area_id) searchUser['$or'] = [];
        if (params.usersearch) {
            searchUser['$or'].push({ 'profile.name': new RegExp(params.usersearch, 'i') })
            searchUser['$or'].push({ 'profile.code': new RegExp(params.usersearch, 'i') })
            searchUser['$or'].push({ 'username': new RegExp(params.usersearch, 'i') })
            searchUser['$or'].push({ 'profile.mobilenumber': new RegExp(params.usersearch, 'i') })
        }
        if (params.area_id) {
            searchUser['$or'].push({ 'availability.morningareas': params.area_id })
            searchUser['$or'].push({ 'availability.eveningareas': params.area_id })
        }
        if (params.role) searchUser.role = params.role;
        if (params.specialtests) searchUser['profile.specialtestlist'] = params.specialtests;
        if (params.specialneeds) searchUser['profile.specialneedlist'] = params.specialneeds;
        if (params.city_id) searchUser['profile.city_id'] = params.city_id;
        if (params.partner_id) searchUser["userinfo.partners"] = params.partner_id;
    }
    function populateUserObj() {
        populateUserQuery = [
            { path: 'userinfo.partners', select: '_id info.name info.acronym info.code' }
        ];
    }
    function optionObj() {
        option = {
            page: params.page,
            limit: parseInt(params.limit),
            populate: populateUserQuery,
            sortBy: {
                "info.name": sort,
            },
            columns: `_Deleted userinfo.partners role username profile.name profile.code profile.mobilenumber profile.specialneed profile.specialtestlist profile.city_id profile.address1 profile.email profile.gender profile.location profile.pincode`
        }
    }
    function getUsers(next) {
        makeUserSearchObj()
        populateUserObj()
        optionObj()
        if (params.page && params.limit) {
            Model.paginate(searchUser, option, function (error, paginatedResults, pageCount, itemCount) {
                if (error) return next(error);
                users = paginatedResults;
                page = pageCount;
                items = itemCount;
                return next(null);
            });
        }
    }
    function getCities(next) {
        if (params.onloadlist != "true" && params.onLogisticSelection != "true" && params.onPhleboSelection != "true") return next(null)
        CityModel.find({}, { "name": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            cities = result;
            return next(null);
        });
    }
    function getRoles(next) {
        if (params.onloadlist != "true" && params.onLogisticSelection != "true" && params.onPhleboSelection != "true") return next(null)

        var searchRole
        searchRole = {
            name: {
                $ne: 'superuser'
            }
        };
        searchRole["provider_id"] = req.user.provider_id._id

        RoleModel.find(searchRole, { "name": 1, "label": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            roles = result;
            return next(null);
        });
    }
    function getPartners(next) {
        if (params.city_id) searchPartner['info.city_id'] = params.city_id;
        searchPartner._Deleted = false
        ModelPartner.find(searchPartner, { "info.name": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            partners = result;
            return next(null);
        });
    }
    function getAreas(next) {
        if (params.onLogisticSelection != "true" && params.onPhleboSelection != "true") return next(null)

        if (params.city_id) searchArea['city_id'] = params.city_id;
        searchArea['type'] = "MA";

        ModelArea.find(searchArea, { "name": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            areas = result;
            return next(null);
        });
    }
    function getSpecialneed(next) {
        if (params.onPhleboSelection != "true") return next(null)
        ModelSpecialNeed.find({}, { "name": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            specialneeds = result;
            return next(null);
        });
    }
    function getServices(next) {
        if (params.onPhleboSelection != "true") return next(null)
        ModelService.find({}, { "name": 1 }, { lean: true }, function (error, result) {
            if (error) return next(error);
            services = result;
            return next(null);
        });
    }
    function response() {
        if (params.onPhleboSelection == "true") {
            return res.json(
                {
                    cities: cities,
                    roles: roles,
                    areas: areas,
                    specialneeds: specialneeds,
                    services: services,
                    partners: partners,
                    users: users,
                    pageCount: page,
                    itemCount: items
                })
        }
        else if (params.onLogisticSelection == "true") {
            return res.json({
                cities: cities,
                roles: roles,
                areas: areas,
                partners: partners,
                users: users,
                pageCount: page,
                itemCount: items
            })
        }
        else if (params.onloadlist == "true") {
            return res.json({
                cities: cities,
                roles: roles,
                partners: partners,
                users: users,
                pageCount: page,
                itemCount: items
            })
        }
        else {
            return res.json({
                partners: partners,
                users: users,
                pageCount: page,
                itemCount: items
            })
        }
    }
    async.waterfall([getCities, getRoles, getAreas, getPartners, getSpecialneed, getServices, getUsers], function (err) {
        if (err) return callback(err);
        response();
    })
}

