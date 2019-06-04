// var mongoose = require("mongoose"),
//     async = require("async"),
//     ModelDepartment = require("../models/Department"),
//     json2csv = require('json2csv'),
//     express = require("express"),
//     fs = require('fs');
// var dep = ["name", "description"]
// var finalc;
// exports.getFile = function(req, res, next) {
//     var json2csv = require('json2csv');
//     var fields = dep
//     var d;
//     ModelDepartment.find({}, function(error, result) {
//         d = result
//             // console.log(result);
//         json2csv({
//             data: result,
//             fields: fields
//         }, function(err, csv) {
//             fs.writeFile('file.csv', csv, function(err) {
//                 if (err) throw err;
//                 console.log(appRoot + "/public/exports/file.csv");
//                 res.sendFile(appRoot + "/public/exports/file.csv");
//             });
//         });
//     })
// }
