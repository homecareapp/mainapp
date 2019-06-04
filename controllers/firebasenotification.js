var async = require('async');
var firebase = require("firebase");

exports.insertNotification = insert;
exports.multiRefInsertNotification = multiRefInsert;

function insert(params, callback){
	if(!params.ref) return callback("ref missing");
	if(!params.notiObj) return callback("noti object missing");

	var db = firebase.database();
	var ref = db.ref("/"+params.ref);
	var firebaseNewObject = ref.push();
	firebaseNewObject.set(params.notiObj,function(e,data){return callback(null);});	
}


function multiRefInsert(params,callback){
	if(!params.refs.length) return callback("ref missing");
	if(!params.notiObj) return callback("noti object missing");

	async.each(params.refs, function(ref, next){
		var param = {
			ref:ref,
			notiObj:params.notiObj
		}
		insert(param, function(e,r){ return next();})
	},function (e) {
		if(e) return callback(e)

		return callback(null);
	})
}