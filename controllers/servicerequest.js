var mongoose = require('mongoose');
var Model = require('../models/ServiceRequest');
var functionList = require('./functionList');
var ModelOrder = require('../models/Order');


exports.getList = function(req, res, next) {

    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var search = {};
    var option = {
        page: req.query.page,
        limit: parseInt(req.query.limit)
    }

    search["provider_id"] = req.user.provider_id._id

    if (!req.params.id) {
        if (req.query.page) {
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
            
            Model.find(search, function(error, result) {
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
}


exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var id = req.params.id;
    var data = req.body;
    if (!id) return next(new Error("Id Not Found For Update"));
    if (!data.call_id) return next("No Data Present To Add Client");
    Model.findById(id, function(error, result) {
        if (error) return next(error);
        for (var key in data) {
            if (typeof result[key] !== "function") {
                result[key] = data[key];
            };
        };
        result.save(function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    });
}



exports.add = function(req, res, next) {
    // var data = req.body;
    // if (!data.client_id) return next(new Error("No Data Present To Add ServiceRequest"));
    // var addClient = new Model(data)
    // addClient.save(function(error, result) {
    //     if (error) return next(error);
    //     res.json({
    //         response: result
    //     });
    // });

    var data = req.body;
    if (!data.client_id) return next(new Error("No Data Present To Add ServiceRequest"));
    data["createdby"] = req.user._id;
    // console.log(data);
    var addService = new Model(data);
    addService.save(function(error, result) {
        if (error) return next(error);
        // console.log(result);
        var order = data;
        order["servicerequest_id"] = result._id;
        var addOrder = new ModelOrder(order);
        addOrder.save(function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    });
}
