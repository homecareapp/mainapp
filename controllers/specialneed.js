/**
 * author => arbaz.
 * date => 29-10-2015
 */
var Model = require("../models/SpecialNeed"),
    mongoose = require("mongoose"),
    mongoosePaginate = require("mongoose-paginate");

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};


exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
    var search = {};
    var options = {};
    options["page"] = req.query.page;
    options["limit"] = parseInt(req.query.limit);

    search["provider_id"] = req.user.provider_id._id

    if (req.query.name) {
        search["name"] = RegExp(req.query.name, "i");
    };

    if (!req.params.id) {
        if (req.query.page) {
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
            // console.log(search);
            Model.find(search, function(error, result) {
                result.forEach(function (sp, index) {
                    sp.name = sp.name.toUpperCase();
                })
                result = _.sortBy(result, 'name')
                
                result.forEach(function (sp, index) {
                    if(sp.name.toUpperCase() == 'NA')
                    {
                        result.splice(index,1)
                        result.insert(0, sp);
                    }
                })
                res.json({
                    response: result
                })
            })
        }
    } else {
        Model.findById(req.params.id, function(error, result) {
            if (error) {
                return next(error)
            };
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
    var SpecailTestObj = new Model(data);
    SpecailTestObj.save(function(error, result) {
        if (error) return next(error);
        res.json(result);
    });
}

exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
    var id = req.params.id;
    var data = req.body;
    Model.findById(id, function(error, serviceTestResult) {
        serviceTestResult.name = data.name;
        serviceTestResult.description = data.description;
        serviceTestResult.provider_id = req.user.provider_id._id
        serviceTestResult.save(function(error, result) {
            if (error) return next(error);
            res.json(result);
        })
    });
}
