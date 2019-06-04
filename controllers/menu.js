var Model = require('../models/Menu');
var mongoose = require('mongoose');
var mongoosePaginate = require("mongoose-paginate");


exports.getList = function(req, res, next) {
    var search = {},
        response = {};

    var option = {};
    var mongoosePaginate = require("mongoose-paginate");
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);


    if (req.query.isparent)
        search.isParent = req.query.isparent;

    if(req.query.name)
        search.name = new RegExp(req.query.name, "i");

    if (!req.params.id) {
        if (req.query.page) {
            Model.paginate(search, option, function(error, paginateResult, pageCount, itemCount) {
                if (error) return next(error);
                res.json({
                    response: paginateResult,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            Model.find(search, function(err, result) {
                if (err) return next(new Error(err));
                response.response = result;
                res.json(response);
            })
        }
    } else {
        Model.findById(req.params.id, function(error, result) {
            if (error) return next();
            res.json(result);
        });
    }

};

exports.add = function(req, res, next) {
    var menuData = req.body;
    var search = {},response = {};

    var MenuObj = new Model(menuData);

    if (!menuData.name) {
        response.message = "Menu name does not exist";
        return res.json(response);
    }
    else
        search.name = menuData.name;

    Model.find(search, function(err, result) {
        // console.log(result);
        if (result.length > 0) {
            response.message = "Menu name already exist";
            return res.json(response);
        };

        MenuObj.save(function(err, result) {
            if (err) return next(new Error(err));

            res.json(result);
        });
    });
};

exports.update = function(req, res, next) {
    var menuData = req.body;
    var id = req.params.id;

    Model.findById(id, function(err, menu) {
        if (err) return next(new Error(err));

        if (!menu) return next(new Error("Menu not found."));

        menu.name = menuData.name;
        menu.url = menuData.url;
        menu.state = menuData.state;
        menu.isParent = menuData.isParent;
        menu.isParent = menuData.isParent;
        menu.parentID = menuData.parentID;
        menu.isLabel = menuData.isLabel;
        menu.sequence = menuData.sequence;
        
        menu.save(function(err, result) {
            if (err) return next(new Error("Error while saving" + err));

            return res.json(result);
        })
    })
};
