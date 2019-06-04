/**
 * author:=> arbaz.
 * date:=> 19-10-2015
 */
var Model = require("../models/Department"),
    mongoose = require("mongoose"),
    mongoosePaginate = require("mongoose-paginate");







exports.getList = function(req, res, next) {
    //provider id necessary
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var search = {};
    var page = req.query.page;
    var limit = parseInt(req.query.limit);

    var option = {
        page: page,
        limit: limit
    }

    if (req.query.name) {
        search["name"] = new RegExp(req.query.name, "i");
    };

    search["provider_id"] = req.user.provider_id._id;
    if (!req.params.id) {
        if (req.query.page) {
            // console.log("pagingResult(paging)");


            Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
                if (error) {
                    return next(error)
                };
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            // console.log("whole record");
            Model.find(search, function(error, result) {
                // console.log("into normal search");
                if (error) {
                    return next(error)
                };
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

    // Model.paginate(search,options,function(error,paginatedResults,pageCount,itemCount){
    //     if (error) {return next(error)};

    //     res.json({
    //         response:paginatedResults,
    //         pageCount:pageCount,
    //         itemCount:itemCount
    //     });
    // });
}





exports.add = function(req, res, next) {
    //provider id necessary
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var data = req.body;
    data["provider_id"] = req.user.provider_id._id;
    var department = new Model(data)
    department.save(function(error, result) {
        res.json(result);
    });
}



exports.update = function(req, res, next) {
    //provider id necessary
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var id = req.params.id;
    var data = req.body;
    // console.log(data);
    Model.findById(id, function(error, result) {
        result.name = data.name;
        result.description = data.description;
        result.provider_id = req.user.provider_id._id
        result.save(function(error, result) {
            res.json(result);
        });

    })
}
