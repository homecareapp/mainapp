var Model = require('../../models/Area');


exports.getList = function(req, res, next) {
    if (!req.query.apikey) {
        res.json(new Error("Provider_id Not Provided"))
    }
    var search = {}
    Model.find(search, function(error, result) {
        if (error)
            return res.json(error)
        res.json(result);
    })
}
