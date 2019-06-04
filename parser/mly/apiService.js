var Model = require('../../models/Service');

exports.getList = function(req, res, next) {
    if (!req.query.apikey) {
        res.json(new Error("Provider_id Not Provided"))
    }
    var search = {}
    search["type"] = "Client"
    Model.find(search, function(error, result) {
        if (error)
            return res.json(error)
        res.json(result);
    })
}
