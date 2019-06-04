var Integrator = require('okasintegrator');
var secrets = require('../config/secrets');
var ObjectId = require('mongoose').Schema.ObjectId; 

var integrator = new Integrator({
    connectionString:secrets.db,
    parserPath: __dirname+"/../integrators/",
});

exports.startSync = function(req,res,next){
	var entity = req.params.entity;
	var provider_id = req.user.provider_id;
	integrator.syncNow(provider_id,entity,function(err){
		if(err)
			return next(err);
		return res.status(200).json({'msg':'Sync started'});
	});
}