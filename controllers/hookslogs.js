var Model = require("../models/HooksLog")
var mongoosePaginate = require("mongoose-paginate");



// @abs [ maintain all request inbound and outbound into hooksLogs collection and also add all thirdparty api request and response  ] 
exports.addHooksLogs = function(data, callback) {

    // console.log("called hookslogs");
    var addLogs = new Model(data)
    addLogs.save(function(error, result) {
        if (error)
            return callback(error)
        if (result) {
            // console.log("hooks enterd into database");
            return callback(null, "Done")
        };
    })
}


exports.getList = function(req, res, next) {
    if (req.user.provider_id) {
        if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    } else {
        return next(new Error("No Provider Assigned To This User"));
    }


    var search = {};
    var option = {};
    option["page"] = req.query.page;
    option["limit"] = parseInt(req.query.limit);

    if (req.query.fromdate) {
        var fdate = new Date(req.query.fromdate);
        var tdate = new Date(fdate);
        tdate.setDate(tdate.getDate() + 1);
        tdate.setSeconds(tdate.getSeconds() - 1);
        search["datetime"] = {
            $gte: fdate.toUTCString(),
            $lte: tdate.toUTCString()
        };

    };
    // need to uncomment if testing is done
    // search["provider_id"] = req.user.provider_id._id

    if (option.page) {
        // console.log("into paginatedResults");
        Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
            if (error) return next(error)
            res.json({
                response: paginatedResults,
                pageCount: pageCount,
                itemCount: itemCount
            });
        });
    } else {
        // console.log("into normal result");
        Model.find(search, function(error, result) {
            if (error)
                return next(error)

            res.json({
                response: result
            })
        })
    }

}
