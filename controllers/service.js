var Model = require('../models/Service');
var mongoose = require('mongoose'),
    csv = require("csv"),
    mongoosePaginate = require("mongoose-paginate");



exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));

    var page = req.query.page;
    var limit = parseInt(req.query.limit);
    var specialservice = req.query.specialservice;
    var type = req.query.type;
    var search = {};
    var option = {
        page: page,
        limit: limit
    }
    search["provider_id"] = req.user.provider_id._id;

    /*if (req.query.name) {
        search["name"] = new RegExp(req.query.name, "i");
    };*/
    if (req.query.name) {
        // var searchClient = {};
        search['$or'] = [{
            'name': new RegExp(req.query.name, 'i')
        }, {
            'code': new RegExp(req.query.name, 'i')
        }];
    }

    if (req.query.active == 'true')
        search["_Deleted"] = false;
    if (req.query.active == 'false')
        search["_Deleted"] = true;

    if (req.query.specialservice) {
        search["specialservice"] = req.query.specialservice;
    };
    if (req.query.type) {
        search["type"] = req.query.type;
    } else {
        search["type"] = {
            $ne: "Client"
        };
    }
    // search["specialservice"] = req.user.provider_id;

    // if (req.query.type) {
    //     search[""]
    // };

    if (!req.params.id) {
        if (req.query.page) {
            option.sortBy = {};
            option.sortBy["name"] = 1;
            //console.log(search);
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
            //console.log(search);
            Model.find(search, {}, {
                sort: {
                    'name': 1
                }
            }, function(error, result) {
                if (error) return next(error);
                res.json({
                    response: result
                });
            });
        }

    } else {
        Model.findById(req.params.id, function(err, result) {
            if (err) return next(err);

            return res.json({
                response: result
            });
        })
    };


};



exports.add = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var data = req.body;
    var searchObj = {
        'code': data.code
    };
    Model.findOne(searchObj, function(error, result) {
        console.log(searchObj);
        if (error) return next(error)
        if (result) return next(new Error("Service code/externalId already exist"));

        data["provider_id"] = req.user.provider_id._id
        var service = new Model(data);
        service.save(function(err, service) {
            if (err) {
                return next(err)
            };
            return res.json(service);
        });
    })
};



exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(err, service) {
        if (err) return next(new Error(err));
        service.name = data.name;
        service.method = data.method;
        service.description = data.description;
        service.sampletype = data.sampletype;
        service.specialservice = data.specialservice;
        service.repeat = data.repeat;
        service.type = data.type;
        service.alias = data.alias;
        service.discountnotapplicable = data.discountnotapplicable
        service.provider_id = req.user.provider_id._id
        service.save(function(err, result) {
            if (err) return next(err);
            return res.json(result);
        });
    });
};


/** below functions are only for open api routes as mention in ../router/api.js **/
exports.getServicesList = function(req, res, next) {
    var searchService = {};
    var option = {};


    searchService["type"] = "Client";

    if (req.query.clientservice) {
        searchService['$or'] = [{
            'name': new RegExp(req.query.clientservice, 'i')
        }, {
            'alias': new RegExp(req.query.clientservice, 'i')
        }];
    };

    if (req.query.page || parseInt(req.query.limit)) {
        Model.paginate(searchService, option, function(error, paginatedResults, pageCount, itemCount) {
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
        Model.find(searchService, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    }
}

//arbaz
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
    // console.log("hello");
}
