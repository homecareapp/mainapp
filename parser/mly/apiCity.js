var Model = require('../../models/City'),
    mongoose = require('mongoose'),
    mongoosePaginate = require("mongoose-paginate"),
    async = require("async");


exports.getList = function(req, res, next) {
    if (!req.query.apikey) {
        res.json(new Error("Provider_id Not Provided"))
    }
    // if filter required
    var search = {};
    var provider_id = req.query.apikey
    Model.find(search, function(error, result) {
        if (error) {
            res.json(error)
        }
        res.json(result)
    })
}
