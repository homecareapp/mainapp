var Model = require('../models/City');
var mongoose = require('mongoose');
var mongoosePaginate = require("mongoose-paginate");


exports.getList = function(req, res, next) {

    var search = {};
    var option = {};
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);

    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    search["provider_id"] = req.user.provider_id._id;

    if (req.query.name) {
        search["name"] = new RegExp(req.query.name, "i");
    };
    if (!req.params.id) {
        if (req.query.page) {
            // console.log("into paginate");
            Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) return next(error);
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            cityList(search, function(err, result) {
                res.json({
                    response: result
                })
            });
        }

    } else {
        citybyID(req.params.id, function(err, result) {
            res.json({
                response:result
            });
        });
    }
}

function cityList(search, next) {
    Model.find(search, function(err, result) {
        if (err) return next(new Error(err));

        next(null, result);
    })
}

function citybyID(id, next) {
    Model.findById(id, function(err, result) {
        if (err) return next(new Error(err));

        next(null, result);
    })
}

exports.add = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));


    var data = req.body;
    data["provider_id"] = req.user.provider_id._id;
    
    var city = new Model(data);
    city.save(function(err, city) {
        if (err) {
            return next(err)
        };
        return res.json({
            response: city
        });
    })

}

exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    //console.dir(req.params.id);
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(err, city) {
        if (err) return next(new Error(err));
        if (!city) return next(new Error("City not found."));
        city.name = data.name;
        city.shortname = data.shortname;
        city["provider_id"] = req.user.provider_id._id;
        city.save(function(err, result) {
            if (err) return next(new Error("Error while saving" + err));

            return res.json(result);
        })
    })
};
