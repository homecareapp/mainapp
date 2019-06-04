var Model = require('../models/OptionMaster');

exports.add = function(req, res, next) {
    if (!req.user.provider_id) return next(new Error("No Provider_id Assigin To This User"));
    if (!req.user.provider_id._id) return next(new Error("No Provider_id Assigin To This User"));

    var data = req.body;
    data.provider_id = req.user.provider_id._id
    var search = {};

    var optionMaster = new Model(data);
    optionMaster.save(function(err, optionObj) {
        if (err) {
            return next(err)
        };
        return res.json(optionObj);
    })
};

exports.update = function(req, res, next) {
    var data = req.body;
    var _id = data._id;
    Model.findById(_id, function(err, doc) {
        if (!doc) {
            var err = new Error("Data Not found");
            err.status = 500;
            return (err);
        };

        if (req.body.roles) {
            doc.roles = req.body.roles;
        };
        if(!req.body.attachments)
        {
            req.body.attachments=[];
        }
        if (req.body.isattachment) {
            doc.attachments = req.body.attachments;
            doc.isattachment = req.body.isattachment;
        }else
        {
            doc.isattachment = req.body.isattachment;
            doc.attachments=[];
        }
        doc.name = data.name;
        doc.displayname = data.displayname;
        doc.description = data.description;
        doc.parent_id = data.parent_id;
        doc.isParent = data.isParent;
        doc.isEditable = data.isEditable;
        doc.priority = data.priority;
        doc.save(function(err, result) {
            if (err) return next(new Error(err))
            res.json(result);
        });
    });
};

exports.getList = function(req, res, next) {

    //var skip = req.query.skip;
    // var limit = parseInt(req.query.limit);
    // var page = req.query.page;  
    // var search = {
    //     isEditable: true,
    //     name:""
    // };

    // if (req.query.name) search.name = req.query.name.split('|');


    // console.log(search);

    // if(req.query.type){
    //   search["name"] = req.query.type;
    // };
    /*
    Model.findOne(search, function(err, result){
      if (err) return next(new Error(err));

      res.json(result);
    });
    */
    // var options = {
    //   sortBy:{
    //       name:1
    //   }
    // };
    //q, pageNumber, resultsPerPage, callback, options
    // Model.paginate(search,page,limit,function(error, pageCount, paginatedResults, itemCount){
    //   if(error) return next(new Error(error));

    //     res.json(paginatedResults);
    // }, options);

    // {_id: { $in: arry }, name: name }, function(e, r){

    var search = {
        isEditable: true
    };
    // var search = {};
    if (req.query.name) search.name = {
        $in: req.query.name.split('|')
    }
    if (req.query.parent_id) {
        search["parent_id"] = req.query.parent_id
    };

    if (req.query.isParent) {
        search["isParent"] = req.query.isParent
    };
    if (req.query.isOption) search.isOption = req.query.isOption;
    
    if (req.query.active) search._Deleted = false; //All option which are not deleted
    
    

    //uncomment when all options master are inserted with provider_id 
    //reason to commit its session not being created when getList is based on provider
    if (req.user.provider_id)
        search.provider_id = req.user.provider_id._id;
    Model.find(search,{attachments:0}, function(err, result) {
        if (err) return next(new Error(err));
        return res.json({
            response: result
        });
    });
};

exports.getObjByID = function(req, res, next) {
    var id = req.params.id;
    Model.findOne({
        _id: id
    }, function(error, obj) {
        if (error) return next(new Error("Not found data for ID: " + id));
        res.json(obj);
    });
};


exports.deleteOption = function(req, res, next) {
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

        result.save(function(err, option) {
            if (err) {
                return next(err);
            }
            return res.json({
                response: option
            });
        });
    });
}
