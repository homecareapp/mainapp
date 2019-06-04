var Model = require("../models/Role"),
    mongoose = require("mongoose");


exports.getList = function(req, res, next) {
    if (req.user.provider_id) {
        if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    };
    var search = {};
    var response = {}
    var columns = 'name label menus privileges';

    search = {
        name: {
            $ne: 'superuser'
        }
    };
    search["provider_id"] = req.user.provider_id._id
    Model.find(search, columns, function(error, result) {
        console.log(search);
        response.response = result;
        res.json(response);
    });
}

exports.add = function(req, res, next) {
    if (req.user.provider_id) {
        if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    };
    var data = req.body,
        response = {};
    data["provider_id"] = req.user.provider_id._id
    var addRole = new Model(data);

    if (!data.name) {
        response.message = "Name does not exist";
        return res.json(response);
    };

    search = {
        name: data.name
    };
    Model.find(search, function(err, result) {
        if (result.length > 0) {
            response.message = "Name already exist";
            return res.json(response);
        };
        addRole.save(function(error, roleObj) {
            if (error) return next();

            response.response = roleObj;
            res.json(response);
        });
    });
}


exports.update = function(req, res, next) {

    if (req.user.provider_id) {
        if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    };

    var id = req.params.id;
    var data = req.body,
        response = {};

    if (!data.name) {
        response.message = "Name does not exist";
        return res.json(response);
    };

    Model.findById(id, function(error, result) {
        if (result) {
            result.name = data.name;
            result.label = data.label;
            result.description = data.description;
            result.privileges = data.privileges;
            result.active = data.active;
            result.menus = data.menus;
            result["provider_id"] = req.user.provider_id._id
            result.save(function(error, updateresult) {
                response.response = updateresult;
                res.json(response);
            });
        } else {
            response.message = "Does not found";
            return res.json(response);
        }
    });
}
