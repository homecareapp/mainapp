var csv = require('csv'),
    fs = require('fs'),
    async = require("async"),
    ModelTest = require("../../models/Service"),
    ModelTube = require("../../models/Tube")

var mongoose = require('mongoose');
var _ = require('lodash');
var array = require('lodash/array');
var chunk = require('lodash/array/chunk');
var path = require("path");



exports.addFile = function(req, res, next) {
    if (req.files.file.extension != "csv") {
        return next(new Error("File Was Not In CSV Format"))
    }
    var parser = csv.parse({
        delimiter: ','
    }, function(err, data) {
        var type = req.params.type;
        // console.log(type);
        switch (type) {
            case "tests":
                addTest(data, req, function(error, result) {

                    res.json(result);
                });
                break;
            case "tubes":
                addTubes(data, req, function(error, result) {
                    res.json(result);
                });
                break;
            case "testtubes":
                addTestTubes(data, req, function(error, result) {
                    res.json(result);
                });
                break;
            default:
                res.json({
                    message: "Type Not Found"
                });
                break;
        }
    });
    fs.createReadStream(req.files.file.path).pipe(parser);
}

function addTest(testObj, req, next) {
    var testCouter = 0;
    var counterObj = {
        insertCount: 0,
        updateCount: 0,
        errorCount: 0
    }
    var columns = {
            // shortname: 0,
            externalId: 0,
            code: 1,
            name: 2,
            price: 3,
            category: 4,
            // @abs [ need to add new column into excel import if its done remove the comment ]
            discountnotapplicable: 5
        }
        //next(null, "Import started");
    async.each(testObj, function(obj, callback) {
        testCouter++;
        searchObj = {
            code: obj[columns.code],
            provider_id: req.user.provider_id._id
        };
        if (testCouter == 1) return callback();
        if (obj[columns.name] == "" || obj[columns.code] == "" || obj[columns.externalId] == "" || obj[columns.category] == "") {
            counterObj.errorCount++;
            console.log("name and code not found");
            return callback();
        } else {
            ModelTest.find(searchObj, function(error, result) {
                if (error) {
                    counterObj.errorCount++;
                    return callback();
                }
                if (result.length) {
                    counterObj.updateCount++;
                    async.each(result, function(updateResult, next) {
                        updateResult.name = obj[columns.name];
                        updateResult.externalId = obj[columns.externalId];
                        updateResult.code = obj[columns.code];
                        updateResult.price = obj[columns.price];
                        updateResult.category = obj[columns.category].toUpperCase();
                        // @abs [ new attributed added for discountnotapplicable ]
                        updateResult.discountnotapplicable = obj[columns.discountnotapplicable]
                        updateResult.save(function(error, saveResult) {
                            if (error) return next(new Error("Error in updating"));
                            return next();
                        });
                    });
                    return callback();
                } else {
                    counterObj.insertCount++;
                    var testObj = {};
                    testObj.name = obj[columns.name];
                    testObj.externalId = obj[columns.externalId];
                    testObj.price = obj[columns.price];
                    testObj.category = obj[columns.category].toUpperCase();
                    // @abs [ new attributed added for discountnotapplicable ]
                    testObj.discountnotapplicable = obj[columns.discountnotapplicable]
                    testObj.code = obj[columns.code];
                    testObj['provider_id'] = req.user.provider_id._id;

                    var addTestObj = new ModelTest(testObj);
                    addTestObj.save(function(error, result) {
                        if (error) return next(error);
                        return callback();
                    });
                }
            });
        }

    }, function(error) {
        if (error) return next(error);
        // console.log(counterObj);
        return next(null, counterObj);
    });
}

function addTubes(tubeObj, req, next) {
    var counterObj = {
        insertCount: 0,
        updateCount: 0,
        errorCount: 0
    }
    var tubeCounter = 0;
    var columns = {
            externalId: 0,
            type: 1,
            unit: 2,
            container: 3,
        }
        //next(null, "Import started");
    async.eachSeries(tubeObj, function(obj, callback) {
        tubeCounter++;
        if (tubeCounter === 1) {
            return callback();
        } else {
            var searchObj = {
                externalId: obj[columns.externalId],
                provider_id: req.user.provider_id._id
            };
            if (searchObj.externalId == "" || searchObj.type == "" || searchObj.unit == "" || searchObj.container == "") {
                counterObj.errorCount++;
                return callback();

            } else {
                ModelTube.findOne(searchObj, function(e, result) {
                    if (e) {
                        console.log("External ID not found")
                        counterObj.errorCount++;
                        return callback()
                    };
                    if (result) {
                        counterObj.updateCount++;
                        async.each(result, function(rst, nextrst) {
                            rst.externalId = obj[columns.externalId];
                            rst.type = obj[columns.type];
                            rst.unit = obj[columns.unit];
                            rst.container = obj[columns.container];
                            rst.save(function(error, saveResult) {
                                if (error) return nextrst(error);
                                return nextrst();
                            });
                        }, function(e) {
                            if (e) {
                                counterObj.errorCount++;
                            }
                            return callback();
                        });
                    } else {
                        counterObj.insertCount++;
                        tubeAdd = {};
                        tubeAdd.externalId = obj[columns.externalId];
                        tubeAdd.type = obj[columns.type];
                        tubeAdd.container = obj[columns.container];
                        tubeAdd.unit = obj[columns.unit];
                        tubeAdd['provider_id'] = req.user.provider_id._id
                            //console.log(tubeAdd);
                        var addtubeObj = new ModelTube(tubeAdd);
                        addtubeObj.save(function(error, result) {
                            if (error) {
                                counterObj.errorCount++;
                                return callback()
                            }
                            return callback();
                        });
                    }
                });
            }

        }
    }, function(e) {
        if (e) return next(e);
        return next(null, counterObj);
    });
}

function addTestTubes(testTubes, req, next) {
    var testCouter = 0;
    var counterObj = {
        insertCount: 0,
        updateCount: 0,
        errorCount: 0
    }
    var columns = {
        // shortname: 0,
        service_id: 0,
        tube_id: 1
    }

    next(null, "Import started");
    async.eachSeries(testTubes, function(obj, callback) {
        testCouter++;
        if (testCouter == 1)
            return callback();

        console.log("obj" + obj);
        async.waterfall([
            function(nextfunc) {
                searchObj = {};
                searchObj["provider_id"] = req.user.provider_id._id;
                searchObj["externalId"] = obj[columns.tube_id];

                ModelTube.findOne(searchObj, {}, { lean: true }, function(e, tubeData) {
                    if (e) return next(e);
                    console.log("Tube" + tubeData);
                    if (!tubeData) {
                        counterObj.errorCount++;
                        return callback();
                    }
                    console.log("Tube" + counterObj.errorCount);
                    return nextfunc(null, tubeData);
                });
            },
            function(tubeData, nextfunc) {
                searchObj = {};
                searchObj["provider_id"] = req.user.provider_id._id;
                searchObj["externalId"] = obj[columns.service_id];

                ModelTest.findOne(searchObj, function(e, testData) {
                    if (e) return next(e);
                    if (!testData) {
                        counterObj.errorCount++;
                        console.log("no testData");
                        return callback();
                    }
                    console.log("Test" + counterObj.errorCount);
                    var found = false;
                    if (!testData.tubes.length) {
                        console.log(testData.tubes.length + "not length")
                        counterObj.insertCount++
                            testData.tubes.push(tubeData._id)
                    } else {
                        console.log(testData.tubes.length + "length")
                        for (var i = 0; i < testData.tubes.length; i++) {

                            if (testData.tubes[i]._id.equals(tubeData._id)) {
                                found = true;
                                console.log("found")
                                break;
                            }
                        };

                        if (!found) {
                            counterObj.insertCount++
                                testData.tubes.push(tubeData._id)
                        }
                    }

                    testData.save(function(err, result) {
                        if (err) return next(err);
                        console.log("save");
                        return nextfunc(null);
                    })

                });
            }
        ], function(e) {
            if (e) return next(e);
            return callback();
        });
    }, function(error) {
        //if (error) return next(error);
        // console.log(counterObj);
        //return next(null, counterObj);
    });
}
