var mongoose = require('mongoose');
var Model = require('../models/ImportLog');
var moment = require('moment');
var async = require('async');

var tempNumber = new Number();
var loggedinuser;

exports.getList = function(req, res, next) {
    var loggedinuser = req.user;

    if (!loggedinuser.provider_id._id) return next(new Error("No Provider Assigned To This User"))
    
    var search = {};

    if (loggedinuser.provider_id) {
        //search["provider_id"] = req.user.provider_id._id;
    };
    if (req.query.partner_id) {
        search["partner_id"] = req.query.partner_id;
    };
    if (req.query.fromdate && req.query.todate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(req.query.todate);
        tdate.setDate(tdate.getDate() + 1);
        tdate.setSeconds(tdate.getSeconds() - 1);
        search["datetime"] = {
            $gte: fdate.toUTCString(),
            $lte: tdate.toUTCString()
        };
    };

    var options = {
        page: req.query.page,
        limit: parseInt(req.query.limit),
        columns: 'status provider_id user_id file collectionname datetime',
        sortBy: { _id: -1 }
    };


    Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
        if (error) return next(error);

        var finalResult = [];
        async.eachSeries(paginatedResults, function(paginatedObj, nextPage){
            if (paginatedObj && paginatedObj.toObject && paginatedObj.toObject()) paginatedObj = paginatedObj.toObject();

            Model.aggregate(
                [
                    { $match: { _id: paginatedObj._id } },
                    {
                        $project: {
                            errorsize: { $size: "$error" },
                            datasize: { $size: "$data" }
                        }
                    }
               ], function(e, aggrR){
                    if (e) return nextPage(e);

                    if (!aggrR) return nextPage();
                    if (!aggrR.length) return nextPage();

                    paginatedObj.errorsize = aggrR[0].errorsize;
                    paginatedObj.datasize = aggrR[0].datasize;
                    finalResult.push(paginatedObj);

                    return nextPage();
            });
        }, function(e){
            if (e) return next(e);

            res.json({
                response: finalResult,
                pageCount: pageCount,
                itemCount: itemCount
            });
        })
            
    });
};

exports.getById = function(req, res, next) {
    var id = req.params.id;

    if (!id) return next(new Error("ID not found"));

    Model.findById({_id: id}, function(error, result) {
        if (error) return next(error);

        res.json({
            response: result
        });
    });
};