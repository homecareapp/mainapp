var async = require('async'),
    Model = require('../models/ServicesInfo'),
    _ = require('lodash');
var Validation = require('../models/Validations');


exports.getList = function(req, res, next) {
    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    var params = {
        provider_id:req.user.provider_id._id,
        id:req.params.id,
        title:req.query.title,
        pagetype:req.query.pagetype,
        option:{
            page: req.query.page,
            limit: parseInt(req.query.limit)
        }
    }

    serviceInfoList(params, function (error, result) {
        if(error) return next(error);

        return res.json(result);
    })
}

function serviceInfoList(params, callback) {
    var search = {};
    search["provider_id"] = params.provider_id;
    if (params.title) search["title"] = new RegExp(params.title, 'i');
    if (params.pagetype) search["pagetype"] = new RegExp(params.pagetype, 'i');

    var id = params.id;
    var option = params.option;
    var result;

    if (option.page || parseInt(option.limit)) {
        Model.paginate(search, option, function(error, paginatedResults, pageCount, itemCount) {
            if (error) return callback(error);
            result  = {
                response: paginatedResults,
                pageCount: pageCount,
                itemCount: itemCount
            }
            return callback(null,result);
        })
    } else {
        if (id) {
            getById(id, function(error, result) {
                if (error) return callback(error);
                result = {
                    response: result
                }
                return callback(null,result);
            })
        } else {
            Model.find(search, function(error, result) {
                if (error) return callback(error);
                result = {
                    response: result
                }
                return callback(null,result);
            });
        }
    }
}

function getById(id, callback) {
    Model.findById(id, function(error, result) {
        if (error) return next(error);
        return callback(null, result);
    })
}

exports.add = function(req, res, next) {
    var data = req.body
    if (!data) return next(new Error("No Data Present To Add ServiceInfo"))

    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    data.provider_id = req.user.provider_id._id;
    addServiceinfo(data, function(error, result) {
        if(error) return next(error);

        return res.json(result);
    })
    
}

function addServiceinfo(params, callback) {
    if(!params) return callback("No Data Present To Add ServiceInfo");
    var result;
    var serviceInfoObj = new Model(params)
    serviceInfoObj.save(function(error, result) {
        if (error) return callback(error)
        result = {
            response: result
        }
        return callback(null, result);
    })
}


exports.update = function(req, res, next) {
    var data = req.body

    if (!req.user.provider_id._id) return next(new Error("No Provider Assigned To This User"));
    data.provider_id = req.user.provider_id._id;

    if (!req.params.id) return next(new Error("ID not present"))
    data.update_id = req.params.id;

    updateServiceinfo(data, function(error, result) {
        if (error) return next(error);

        return res.json(result);
    })

}

function updateServiceinfo(params, callback){
    var resultObj;
    Model.findById(params.update_id, function(error, result) {
        if (error) return callback(error)

        result.provider_id = params.provider_id;
        result.group = params.group;
        result.title = params.title;
        result.pagetype = params.pagetype;
        result.alias = params.alias;
        result.services = params.services;
        result.description = params.description;
        result.seo = params.seo;
        result.relatedservices = params.relatedservices;

        result.save(function(error, result) {
            if (error) return callback(error)
            resultObj = {
                response: result
            }
            return callback(null, resultObj);
        })
    })
}

exports.getTestList = function(req, res, next) {
    if (!req.query.apikey) {
        return next(new Error("Provider_id Not Provided"))
    }

    if (!req.query.pagetype) {
        return next(new Error("Pagetype is required"))
    }
    if(!Validation.validateEnum(Model, 'pagetype', req.query.pagetype)) return next(new Error("Please send proper pagetype value."));
    var search = {};
    search["pagetype"] = req.query.pagetype;
    Model.find(search, {description:0, provider_id:0},function(error, result) {
        if (error)
            return res.json(error)
        return res.json(result);
    })
}

exports.getTestById = function (req, res, next) {
    if (!req.query.apikey) {
        res.json(new Error("Provider_id Not Provided"))
    }
    if (!req.query.id) {
        res.json(new Error("Test id Not Provided"))
    }

    Model.findById(req.query.id,{provider_id:0}, function(error, result) {
        if (error)
            return res.json(error)
        if(!result) return res.json(new Error("Test not found"));

        return res.json(result);
    })
}