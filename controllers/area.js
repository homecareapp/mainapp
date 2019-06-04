var Model = require('../models/Area'),
    mongoose = require('mongoose'),
    mongoosePaginate = require("mongoose-paginate"),
    async = require("async");


exports.getList = function(req, res, next) {

    var page = req.query.page;
    var limit = parseInt(req.query.limit);
    var search = {};
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    search["provider_id"] = req.user.provider_id._id;

    if (req.query.name) {
        search["name"] = new RegExp(req.query.name, "i");
    };

    if (req.user.provider_id._id) {
        search["provider_id"] = req.user.provider_id._id;
    };

    if (req.query.areasearch) {
        var searchArea = {};
        searchArea['$or'] = [{
            'name': new RegExp(req.query.areasearch, 'i')
        }, {
            'pincodes': new RegExp(req.query.areasearch, "i")
        }];
        search = searchArea;
    };

    if (req.query.pincode)
        search.pincode = new RegExp(req.query.pincode, "i");

    if (req.query.type)
        search.type = req.query.type;

    if (req.query.city_id)
        search.city_id = req.query.city_id;

    if (req.query.area_id) {
        search["parent_areas.area_id"] = req.query.area_id;
    }

    var options = {
        page: page,
        limit: limit
    }

    if (!req.params.id) {
        if (req.query.page) {
            Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return next(error);
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
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var data = req.body;
    data["provider_id"] = req.user.provider_id._id;
    var area = new Model(data);
    area.save(function(err, area) {
        if (err) {
            return next(err)
        }
        return res.json(area);
    })
};


exports.update = function(req, res, next) {
    //provider id necessary
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(err, area) {
        if (err) return next(new Error(err));
        if (!area) return next(new Error("Area not found."));
        area.name = data.name;
        area.description = data.description;
        area.pincodes = data.pincodes;
        area.type = data.type;
        area.coordinates = data.coordinates;
        area.city_id = data.city_id;
        area.parent_areas = data.parent_areas;
        area.provider_id = req.user.provider_id._id
        area.otherArea = data.otherArea;
        area.save(function(err, result) {
            if (err) return next(new Error("Error while saving" + err));
            return res.json(result);
        })
    })
};

exports.getAreas = getArea;

function getArea(params, callback){
    var search = {};
    if(params.pincode) search.pincodes = {$in:[params.pincode]};
    if(params.partner_id) search.partner_id = params.partner_id;
    if(!params.options) params.options = {};

    Model.find(search, params.options, {lean:true}, function(e,r){
        if(e) return callback(e);

        return callback(null, r);
    });
}