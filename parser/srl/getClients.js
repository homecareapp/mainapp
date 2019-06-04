var request = require('request');
var secret = require('../../config/secrets.js');

exports.getList = function (req,res,next) {
	var searchText = req.query.q;
	var PTNTCD='';
	var MOBILENO='';
	var PNAME='';

	//if searchText is number only then assing to mobilenumber
	if(new RegExp(/^[0-9]+$/).test(searchText))
		MOBILENO = searchText;
	else if(new RegExp(/^[A-Za-z ]+$/).test(searchText))
		PNAME=searchText;
	else
		PTNTCD=searchText;

	var uri = secret.srlApiUrl + '/api/SearchPtntDetails/Get?PTNTCD='+PTNTCD+'&MOBILENO='+MOBILENO+'&PNAME='+PNAME;
	console.log(uri);
    request.get(uri).pipe(res)
}