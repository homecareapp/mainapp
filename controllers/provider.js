var Model = require('../models/Provider'),
    mongoose = require('mongoose'),
    mongoosePaginate = require("mongoose-paginate");
exports.checkparser = function(endpoint, req, res, next) {
    // console.log("into provider_id");
    var provider_id = req.user.provider_id;
    //get apiconfig for provider with above endpoint
    //if endpoint available and active get parse name and forward req to parser and parser handler
    //else next
    var override = false;
    var apiconfig = {};

    Model.findById(provider_id, {}, {
        lean: true
    }, function(err, result) {
        if (err) return next(new Error(err));
        for (var i = 0; i < result.apiConfig.length; i++) {
            if (result.apiConfig[i].endpoint == endpoint) {
                override = true;
                apiconfig = result.apiConfig[i];
            }
        }
        if (override) {
            var handler = require("../parser/" + apiconfig.parser);
            handler[apiconfig.functionname](req, res, next);
        } else {
            return next();
        }
    })
}
exports.getList = function(req, res, next) {
    var page = req.query.page;
    var limit = parseInt(req.query.limit);
    var search = {};
    var options = {
            page: page,
            limit: limit
        }
        //
    if (req.query.name) {
        search["name"] = new RegExp(req.query.name, "i")
    };
    if (!req.params.id) {
        if (req.query.page) {
            Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return next()
                }
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            Model.find(search, function(error, result) {
                res.json({
                    response: result
                });
            });
        }
    } else {
        Model.findById(req.params.id, function(err, result) {
            if (err) return next(new Error(err));
            return res.json({
                response: result
            });
        })
    };
};
exports.add = function(req, res, next) {
    var data = req.body;
    var provider = new Model(data);
    provider.save(function(err, provider) {
        if (err) {
            return next(err)
        };
        return res.json({
            response: provider
        });
    })
};
exports.update = function(req, res, next) {
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(err, provider) {
        if (err) return next(new Error(err));
        // for (var key in data) {
        //     if (typeof provider[key] !== "function") {
        //         provider[key] = data[key];
        //         console.log(provider[key] + "=" + data[key]);
        //     };
        // };
        provider.name = data.name
        provider.description = data.description
        provider.logo_small = data.logo_small
        provider.logo_big = data.logo_big
        provider.apiConfig = data.apiConfig
        provider.validity = data.validity
        provider.plan = data.plan
        provider.config = data.config
        provider.order = data.order
        provider.hooks = data.hooks
        provider.routes = data.routes
        provider.save(function(err, result) {
            if (err) return next(new Error("Error while saving" + err));
            return res.json({
                response: result
            });
        });
    })
};


function activeTimeSlot(params, callback) {
    if(!params.partner_id) return callback("ParnterID not found");
    if(params.day) return callback("Day not found");
    if(params.fromtime) return callback("Fromtime not found");

    var search = {
        partner_id:params.partner_id,
        fromtime:params.fromtime,
        day:params.day
    }
}