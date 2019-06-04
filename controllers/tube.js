var Model = require('../models/Tube');
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');


exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
    var limit = parseInt(req.query.limit);
    var page = req.query.page;
    var search = {};
    search["provider_id"] = req.user.provider_id._id
    var options = {
        page: page,
        limit: limit
    }
    if (req.query.name) {
        search["company"] = new RegExp(req.query.name, "i");
    };
    if (req.query.company) {
        search["company"] = req.query.company
    }
    if (req.query.type) {
        search["type"] = req.query.type
    }
    if (req.query.color) {
        search["color.name"] = req.query.color
    }
    if (req.query.size) {
        search["size"] = req.query.size
    };

    if (req.query.searchtube) {
        // var searchClient = {};
        search['$or'] = [{
            'type': new RegExp(req.query.searchtube, 'i')
        }, {
            'container': new RegExp(req.query.searchtube, 'i')
        }];
    }

    if (!req.params.id) {
        if (req.query.page) {
            // console.log(search);
            // options.sortBy["company"] = 1;
            Model.paginate(search, options, function(error, paginatedResults, pageCount, itemCount) {
                if (error) return next(new Error(error));
                res.json({
                    response: paginatedResults,
                    pageCount: pageCount,
                    itemCount: itemCount
                });
            });
        } else {
            // console.log(search);
            Model.find(search, {}, {
                sort: {
                    'company': 1
                }
            }, function(error, result) {
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
    }
};

exports.add = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
    var data = req.body;
    data["provider_id"] = req.user.provider_id._id
    var tube = new Model(data);
    tube.save(function(err, tube) {
        if (err) {
            return next(err)
        };

        return res.json(tube);
    })
};

exports.update = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"))
        //console.dir(req.params.id);
    var id = req.params.id;
    var data = req.body;

    Model.findById(id, function(err, tube) {
        if (err) return next(new Error(err));

        if (!tube) return next(new Error("tube not found."));

        tube.type = data.type;
        tube.color = data.color;
        tube.company = data.company;
        tube.size = data.size;
        tube.comment = data.comment;
        tube.provider_id = req.user.provider_id._id

        tube.save(function(err, result) {
            if (err) return next(error);
            return res.json(result);
        })
    })
};



exports.delete = function(req, res, next) {
    var id = req.params.id;

    if (!id) return next();

    Model.findById(id, function(err, result) {
        if (err) {
            return next(err);
        }
        if (result._Deleted)
            result._Deleted = false;
        else
            result._Deleted = true;

        result.save(function(err, tube) {
            if (err) {
                return next(err);
            }
            return res.json({
                response: tube
            });
        });
    });
}



exports.imports = function(req, res, next) {
    var parser = csv.parse({
        delimiter: ','
    }, function(err, data) {
        addTubes(data, function(error, result) {
            res.json(result);
        });
    });
    fs.createReadStream(req.files.file.path).pipe(parser);
}

function addTubes(tubeObj, next) {
    tubeObj.forEach(function(obj, index) {
        if (index == 0) {} else {
            // console.log(obj);
        }
    });

}
