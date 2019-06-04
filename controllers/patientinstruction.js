/**
 * author => arbaz.
 * date => 29-10-2015
 */

var Model = require("../models/PatientInstruction"),
    mongoose = require("mongoose");


exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var option = {};
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);
    var search = {};
    search["provider_id"] = req.user.provider_id._id
    if (req.query.name) {
        search["name"] = RegExp(req.query.name, "i");
    };
    if (!req.params.id) {
        if (req.query.page) {
            Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) return next(error);
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            Model.find(search, function(error, result) {
                res.json(result);
            });
        }
    } else {
        Model.findById(req.params.id, function(error, result) {
            if (error) return next(error);
            res.json({
                response: result
            });
        });
    }
}

exports.add = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))

    var data = req.body;
    data["provider_id"] = req.user.provider_id._id
    var patientinstructionObj = new Model(data);
    patientinstructionObj.save(function(error, result) {
        res.json(result);
    });
}


exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
        
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(error, patientinstructionObj) {
        patientinstructionObj.name = data.name;
        patientinstructionObj.description = data.description;
        patientinstructionObj["provider_id"] = req.user.provider_id._id
        patientinstructionObj.save(function(error, result) {
            res.json(result);
        });
    });
}
