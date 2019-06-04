    var csv = require('csv'),
        fs = require('fs'),
        moment = require('moment'),
        ModelTube = require("../models/Tube"),
        async = require("async"),
        ModelTest = require("../models/Service"),
        ModelDepartment = require("../models/Department"),
        ModelPartnerService = require("../models/PartnerService"),
        ModelOptionMaster = require("../models/OptionMaster"),
        PatientInstructionModel = require("../models/PatientInstruction"),
        ModelPartner = require("../models/Partner"),
        ModelCity = require("../models/City"),
        ImportLog = require("../models/ImportLog"),
        ModelClient = require("../models/Client"),
        ModelMajorArea = require("../models/Area");
    var mongoose = require('mongoose');
    var _ = require('lodash');
    var array = require('lodash/array');
    var chunk = require('lodash/array/chunk');
    var path = require("path");

    var loggedinuser;
    var provider_id;
    var fileOriginalname;

    var tempDate = new Date();
    var tempNumber = new Number();

    exports.addFile = function(req, res, next) {
        if (req.files.file.extension != "csv") {
            return next(new Error("File Was Not In CSV Format"))
        };

        var parser = csv.parse({
            delimiter: ','
        }, function(err, data) {
            var type = req.params.type;
            // console.log(type);
            switch (type) {
                case "tubes":
                    if (!req) return next(new Error("Request data not found"));
                    if (req.user) loggedinuser = req.user;
                    if (req.user && req.user.provider_id) provider_id = req.user.provider_id;
                    if (req.files && req.files.file && req.files.file.originalname) fileOriginalname = req.files.file.originalname;
                    addTubes(data, req, function(e, result) {
                        if (e) return next(e);

                        res.json(result);
                    });
                    break;
                case "tests":
                if (!req) return next(new Error("Request data not found"));
                    if (req.user) loggedinuser = req.user;
                    if (req.user && req.user.provider_id) provider_id = req.user.provider_id;
                    if (req.files && req.files.file && req.files.file.originalname) fileOriginalname = req.files.file.originalname;
                    addTest(data, function(e, result) {
                        if (e) return next(e);

                        res.json(result);
                    });
                    break;
                case "departments":
                    // console.log("ctach in case");
                    addDepartment(data, req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "partnertest":
                    if (!req) return next(new Error("Request data not found"));
                    if (req.user) loggedinuser = req.user;
                    if (req.user && req.user.provider_id) provider_id = req.user.provider_id;
                    if (req.files && req.files.file && req.files.file.originalname) fileOriginalname = req.files.file.originalname;
                    addPartnerTest(data, function(e, result) {
                        if (e) return next(e);

                        return res.json(result);
                    });
                    break;
                case "optiongender":
                    addOptionMaster(data, 'Gender', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optiontitle":
                    addOptionMaster(data, 'Title', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionarea":
                    addOptionMaster(data, 'Area', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optioncity":
                    addOptionMaster(data, 'City', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionstate":
                    addOptionMaster(data, 'State', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optioncountry":
                    addOptionMaster(data, 'Country', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optiondispatchmethod":
                    addOptionMaster(data, 'Dispatch Method', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionservicetype":
                    addOptionMaster(data, 'Service Type', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionserviceclass":
                    addOptionMaster(data, 'Service Class', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionclinicalhistory":
                    addOptionMaster(data, 'Clinical History', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionservicegroup":
                    addOptionMaster(data, 'Service Group', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionService":
                    addOptionMaster(data, 'Service', req, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "optionpaymentmode":
                    addOptionMaster(data, 'Payment Mode', req, function(error, result) {
                        res.json(result);
                    });
                    break;

                    break;
                case "sublocation":
                    /*
                    importSublocation(data, req, next, function(error, result) {
                        res.json(result);
                    });
                    addSublocation(data, req, next, function(error, result) {                    
                        return res.json(result);
                    });
                    */

                    if (!req) return next(new Error("Request data not found"));
                    if (req.user) loggedinuser = req.user;
                    if (req.user && req.user.provider_id) provider_id = req.user.provider_id;
                    if (req.files && req.files.file && req.files.file.originalname) fileOriginalname = req.files.file.originalname;
                    addSublocation(data, function(e, result) {
                        if (e) return next(e);
                        
                        return res.json(result);
                    });
                    break;
                case "majorarea":
                    addMajorArea(data, req, next, function(error, result) {
                        res.json(result);
                    });
                    break;
                case "clientimport":
                    if (!req) return next(new Error("Request data not found"));
                    if (req.user) loggedinuser = req.user;
                    if (req.user && req.user.provider_id) provider_id = req.user.provider_id;
                    if (req.files && req.files.file && req.files.file.originalname) fileOriginalname = req.files.file.originalname;
                    addClient(data, function(e, result) {
                        if (e) return next(e);
                        
                        return res.json(result);
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

    function saveLog(logObj, next) {
        var ImportLogObj = ImportLog(logObj);
        ImportLogObj.save(function(e, r){
            if (e) next(e);
            
            if (r && r.toObject && r.toObject()) r = r.toObject();

            return next(null, r);
        });
    };

    function addTubes(tubeObj, req, next) { 
        if (!loggedinuser) return next(new Error("User not found"));
        if (!provider_id) return next(new Error("Provider not found"));
        if (!tubeObj) return next(new Error("Data not found"));
        if (!tubeObj.length) return next(new Error("Data is empty"));
        
        var log = {};
        log = {
            status: "Inprogress", 
            provider_id: provider_id._id,
            user_id: loggedinuser._id,
            file: fileOriginalname,  
            collectionname: "Tube Collection",
            error: [],
            data: [],
            result: [],
            datetime: new Date()
        };

        var columns = {};
        var tempcolumns = [
            'company',
            'type',
            'size',
            'color'
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        var tubetypeoptions = [];
        var tubecompanyoptions = [];
        var tubesizeoptions = [];

        async.waterfall([
            //Finding TubeType Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "TubeType" }, null, { lean: true }, function(e, tubetypeoption){
                    if (e) return outerfun(e);
                    if (!tubetypeoption) return outerfun(new Error("Master - Tube type not found"));
                    if (!tubetypeoption._id) return outerfun(new Error("Master - Tube type ID not found"));

                    return outerfun(null, tubetypeoption);
                });
            },
            //Finding TubeType List
            function(tubetypeoption, outerfun){
                ModelOptionMaster.find({ "parent_id": tubetypeoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, tubeTypeList){
                    if (e) return outerfun(e);
                    if (!tubeTypeList) return outerfun(new Error("Master - Tube type not found"));
                    if (!tubeTypeList.length) return outerfun(new Error("Master - Tube type not found"));

                    tubetypeoptions = tubeTypeList;

                    return outerfun();
                });
            },
            //Finding TubeCompany Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "TubeCompany" }, null, { lean: true }, function(e, tubecompanyoption){
                    if (e) return outerfun(e);
                    if (!tubecompanyoption) return outerfun(new Error("Master - Tube company not found"));
                    if (!tubecompanyoption._id) return outerfun(new Error("Master - Tube company ID not found"));

                    return outerfun(null, tubecompanyoption);
                });
            },
            //Finding TubeCompany List
            function(tubecompanyoption, outerfun){
                ModelOptionMaster.find({ "parent_id": tubecompanyoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, tubeCompanyList){
                    if (e) return outerfun(e);
                    if (!tubeCompanyList) return outerfun(new Error("Master - Tube company not found"));
                    if (!tubeCompanyList.length) return outerfun(new Error("Master - Tube company not found"));

                    tubecompanyoptions = tubeCompanyList;

                    return outerfun();
                });
            },
            //Finding TubeSize Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "TubeSize" }, null, { lean: true }, function(e, tubesizeoption){
                    if (e) return outerfun(e);
                    if (!tubesizeoption) return outerfun(new Error("Master - Tube size not found"));
                    if (!tubesizeoption._id) return outerfun(new Error("Master - Tube size ID not found"));

                    return outerfun(null, tubesizeoption);
                });
            },
            //Finding TubeSize List
            function(tubesizeoption, outerfun){
                ModelOptionMaster.find({ "parent_id": tubesizeoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, tubeSizeList){
                    if (e) return outerfun(e);
                    if (!tubeSizeList) return outerfun(new Error("Tube size not found"));
                    if (!tubeSizeList.length) return outerfun(new Error("Tube size not found"));

                    tubesizeoptions = tubeSizeList;

                    return outerfun();
                });
            }
        ], function(e){ 
            if (e) return next(e);

            saveLog(log, function(e, logResult){
                if (e) {
                    console.log("Error in log");
                    console.log(e);
                };

                next(null, "Import Started");

                var tubeIndex = 0;
                var searchObj = {};
                var datastatus = [];
                var tubeAdd = {};

                var tubetypeFound = undefined;
                var tubecompanyFound = undefined;
                var tubesizeFound = undefined;
                async.eachSeries(tubeObj, function(obj, nextTube) {
                    logResult.data.push(obj);
                    tubeIndex += 1;
                    //Checking, is this first row of excel sheet, if yes then return for the next row of excel sheet
                    if (tubeIndex == 1) {
                        datastatus = ["Status"];
                        datastatus = datastatus.concat(logResult.data[tubeIndex-1]);
                        logResult.data[tubeIndex-1] = datastatus;
                        return nextTube();
                    };

                    async.waterfall([
                        function(nextfun) { 
                            if (!obj[columns.type]) return nextfun({message:"Type not found at row number "+tubeIndex});
                            if (!obj[columns.company]) return nextfun({message:"Company not found at row number "+tubeIndex});
                            if (!obj[columns.size]) return nextfun({message:"Size not found at row number "+tubeIndex});

                            return nextfun();
                        },
                        function(nextfun) {
                            //Get tubetype from tubetypeoptions list by name
                            tubetypeFound = _.find(tubetypeoptions, function(o) { return o.displayname.toUpperCase() == obj[columns.type].trim().toUpperCase(); });
                            if (!tubetypeFound) return nextfun({message:"Tube type ("+ obj[columns.type].trim() +") not found at row number "+tubeIndex});
                            
                            //Get tubetype from tubecompanyoptions list by name
                            tubecompanyFound = _.find(tubecompanyoptions, function(o) { return o.displayname.toUpperCase() == obj[columns.company].trim().toUpperCase(); });
                            if (!tubecompanyFound) return nextfun({message:"Tube company ("+ obj[columns.company].trim() +") not found at row number "+tubeIndex});
                            
                            //Get tubetype from tubesizeoptions list by name
                            tubesizeFound = _.find(tubesizeoptions, function(o) { return o.displayname == obj[columns.size]; });
                            if (!tubesizeFound) return nextfun({message:"Tube size ("+ obj[columns.size].trim() +") not found at row number "+tubeIndex});
                            
                            return nextfun();
                        },
                        function(nextfun){ 
                            searchObj = {};
                            searchObj["company"] = obj[columns.company].trim();
                            searchObj["size"] = parseFloat(obj[columns.size]);
                            searchObj["type"] = obj[columns.type].trim();
                            searchObj["provider_id"] = provider_id._id;

                            ModelTube.findOne(searchObj, function(e, result) {
                                if (e) return nextfun({message: e + "Error at row number "+tubeIndex});

                                if (result) { 
                                    result.type = obj[columns.type];
                                    result.color.name = obj[columns.color];
                                    result.company = obj[columns.company];
                                    result.size = obj[columns.size];

                                    //result.comment = obj[columns.comments];
                                    //result.container = obj[columns.container];
                                    //result.unit = obj[columns.unit];
                                    
                                    result['provider_id'] = provider_id._id;

                                    result.save(function(e, saveResult) {
                                        if (e) return nextfun(e);

                                        datastatus = ["Update"];
                                        datastatus = datastatus.concat(logResult.data[tubeIndex-1]);
                                        logResult.data[tubeIndex-1] = datastatus;

                                        return nextfun();
                                    });
                                } else { 
                                    tubeAdd = {};
                                    tubeAdd.type = obj[columns.type];
                                    tubeAdd.color = {};
                                    tubeAdd.color.name = obj[columns.color];
                                    tubeAdd.company = obj[columns.company];
                                    tubeAdd.size = obj[columns.size];

                                    //tubeAdd.comment = obj[columns.comments];
                                    //tubeAdd.container = obj[columns.container];
                                    //tubeAdd.unit = obj[columns.unit];
                                    
                                    tubeAdd['provider_id'] = provider_id._id;
                                    var addtubeObj = new ModelTube(tubeAdd);
                                    addtubeObj.save(function(e, result) {
                                        if (e) if (e) return nextfun({message: e + "Error at row number "+tubeIndex});

                                        datastatus = ["New"];
                                        datastatus = datastatus.concat(logResult.data[tubeIndex-1]);
                                        logResult.data[tubeIndex-1] = datastatus;

                                        return nextfun();
                                    });
                                };
                            });

                        }
                    ], function(e){
                        if (e) {
                            logResult.error.push(e);
                            datastatus = ["Error"];
                            datastatus = datastatus.concat(logResult.data[tubeIndex-1]);
                            logResult.data[tubeIndex-1] = datastatus;
                            return nextTube();
                        };

                        return nextTube();
                    });
                }, function(e) {
                    if (e) return next(e);

                    logResult.status = "Completed";
                    ImportLog.update({ _id: logResult._id }, { $set: logResult }, function(e, logCount){
                        if (e) {
                            console.log("Error while update log");
                            console.log(e);
                        };
                        
                        console.log("Competed");
                    });
                });
            });
        });
    };

    function addTubes_old(tubeObj, req, next) {
        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        }
        var tubeCounter = 0;
        var columns = {
            company: 0,
            type: 1,
            size: 2,
            color: 3,
        }
        async.eachSeries(tubeObj, function(obj, callback) {
            tubeCounter++;
            if (tubeCounter === 1) {
                return callback();
            } else {
                var searchObj = {
                    company: obj[columns.company],
                    size: obj[columns.size],
                    type: obj[columns.type],
                    provider_id: req.user.provider_id._id
                };

                if (searchObj.company == "" || searchObj.size == "" || searchObj.type == "") {
                    counterObj.errorCount++;
                    return callback();

                } else {
                    ModelTube.findOne(searchObj, function(e, result) {
                        if (e) {
                            counterObj.errorCount++;
                            return callback()
                        };
                        if (result) {
                            counterObj.updateCount++;
                            async.each(result, function(rst, nextrst) {
                                rst.type = obj[columns.type];
                                //rst.color = {};
                                rst.comment = obj[columns.comments];
                                rst.color.name = obj[columns.color];
                                rst.company = obj[columns.company];
                                rst.container = obj[columns.container];
                                rst.unit = obj[columns.unit];
                                rst.size = obj[columns.size];
                                rst['provider_id'] = req.user.provider_id._id
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
                            tubeAdd.type = obj[columns.type];
                            tubeAdd.color = {};
                            tubeAdd.comment = obj[columns.comments];
                            tubeAdd.color.name = obj[columns.color];
                            tubeAdd.company = obj[columns.company];
                            tubeAdd.container = obj[columns.container];
                            tubeAdd.unit = obj[columns.unit];
                            tubeAdd.size = obj[columns.size];
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

    /*
    function addTest_old(testObj, req, next) {
        var testCouter = 0;
        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        }
        var columns = {
            // shortname: 0,
            name: 0,
            description: 1,
            sampletype: 2,
            specialservice: 3,
            repeat: 4,
            method: 5
        }
        async.each(testObj, function(obj, callback) {
            testCouter++;
            searchObj = {
                name: obj[columns.name]
            };
            if (testCouter == 1) return callback();
            if (obj[columns.name] == "" || obj[columns.sampletype] == "") {
                counterObj.errorCount++;
                // console.log("no entry");
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
                            updateResult.description = obj[columns.description];
                            updateResult.sampletype = obj[columns.sampletype];
                            updateResult.specialservice = obj[columns.specialservice];
                            updateResult.repeat = obj[columns.repeat];
                            updateResult.method = obj[columns.method];
                            updateResult['provider_id'] = req.user.provider_id._id
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
                        testObj.description = obj[columns.description];
                        testObj.sampletype = obj[columns.sampletype];
                        testObj.specialservice = obj[columns.specialservice];
                        testObj.repeat = obj[columns.repeat];
                        testObj.method = obj[columns.method];
                        testObj['provider_id'] = req.user.provider_id._id
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
    */

    function addTest(masterTest, finalCallback) {
        if (!loggedinuser) return finalCallback(new Error("User not found"));
        if (!provider_id) return finalCallback(new Error("Provider not found"));
        if (!masterTest) return finalCallback(new Error("Data not found"));
        if (!masterTest.length) return finalCallback(new Error("Data is empty"));

        var maasterservice = {};
        var sampletypeoptions = [];
        var sampleTypeFound = -1;
        var log = {};
        log = {
            status: "Inprogress", 
            provider_id: provider_id._id,
            user_id: loggedinuser._id,
            file: fileOriginalname,  
            collectionname: "Test",
            error: [],
            data: [],
            result: [],
            datetime: new Date()
        };

        var columns = {};
        var tempcolumns = [
            'code',
            'name',
            'description',
            'specialtest',
            'sampletype',
            'method'
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        //Finding # of columns
        if (masterTest && masterTest[0]) {
            var tempMasterTest = masterTest[0];
            var tempMasterTestIndex = 0;
            tempMasterTest.forEach(function(o){
                if (o && o.length) {
                    tempMasterTestIndex += 1;
                };
            });
            if (tempcolumns.length != tempMasterTestIndex) {
                return finalCallback(new Error("Columns are missing"));
            };
        }else{
            return finalCallback(new Error("Columns are missing"));
        };

        async.waterfall([
            //Finding Sampletype Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "SampleType" }, null, { lean: true }, function(e, sampletypeoption){
                    if (e) return outerfun(e);
                    if (!sampletypeoption) return outerfun(new Error("Sample type option not found"));
                    if (!sampletypeoption._id) return outerfun(new Error("Sample type option ID not found"));

                    return outerfun(null, sampletypeoption);
                });
            },
            //Finding Sampletype List
            function(sampletypeoption, outerfun){
                ModelOptionMaster.find({ "parent_id": sampletypeoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, sampleTypeList){
                    if (e) return outerfun(e);
                    if (!sampleTypeList) return outerfun(new Error("Sample type option list not found"));
                    if (!sampleTypeList.length) return outerfun(new Error("Sample type option list not found"));

                    sampletypeoptions = sampleTypeList;

                    return outerfun();
                });
            },
        ], function(e){ 
            if (e) return finalCallback(e);

            finalCallback(null, "Import Started");

            saveLog(log, function(e, logResult){
                if (e) {
                    console.log("Error in log");
                    console.log(e);
                };

                var masterServiceIndex = 0;
                var datastatus = [];
                async.eachSeries(masterTest, function(masterTestObj, nextMasterTest){
                    logResult.data.push(masterTestObj);
                    masterServiceIndex += 1;
                    //Checking, is this first row of excel sheet, if yes then return for the next row of excel sheet
                    if (masterServiceIndex == 1) {
                        datastatus = ["Status"];
                        datastatus = datastatus.concat(logResult.data[masterServiceIndex-1]);
                        logResult.data[masterServiceIndex-1] = datastatus;
                        return nextMasterTest();
                    }

                    maasterservice = {};
                    sampleTypeFound = -1;

                    async.waterfall([
                        function(nextfun){ 
                            if (!masterTestObj[columns.code]) return nextfun({message:"Code not found at row number "+masterServiceIndex});
                            if (!masterTestObj[columns.code].length) return nextfun({message:"Code not found at row number "+masterServiceIndex});
                            
                            if (!masterTestObj[columns.name]) return nextfun({message:"Name not found at row number "+masterServiceIndex});
                            if (!masterTestObj[columns.name].length) return nextfun({message:"Name not found at row number "+masterServiceIndex});
                            
                            if (!masterTestObj[columns.sampletype]) return nextfun({message:"Sample type not found at row number "+masterServiceIndex});
                            if (!masterTestObj[columns.sampletype].length) return nextfun({message:"Sample type not found at row number "+masterServiceIndex});
                            
                            //Get sampletype from sampletypeoptions list by name
                            sampleTypeFound = _.find(sampletypeoptions, function(o) { return o.displayname.toUpperCase() == masterTestObj[columns.sampletype].trim().toUpperCase(); });
                            if (!sampleTypeFound) return nextfun({message:"Sample type ("+ masterTestObj[columns.sampletype].trim() +") not found at row number "+masterServiceIndex});
                            maasterservice.sampletype = sampleTypeFound.displayname;

                            return nextfun();
                        },
                        function(nextfun){
                            maasterservice.provider_id = provider_id;
                            maasterservice.code = masterTestObj[columns.code].trim();
                            maasterservice.name = masterTestObj[columns.name].trim();

                            if (masterTestObj[columns.description]) 
                                maasterservice.description = masterTestObj[columns.description].trim();

                            if (masterTestObj[columns.specialtest] && masterTestObj[columns.specialtest].length) {
                                maasterservice.specialservice = true;
                            }else{
                                maasterservice.specialservice = false;
                            };

                            maasterservice.sampletype = masterTestObj[columns.sampletype].trim();

                            if (masterTestObj[columns.method]) 
                                maasterservice.method = masterTestObj[columns.method].trim();

                            return nextfun();
                        }
                    ], function(e){
                        if (e) {
                            logResult.error.push(e);
                            datastatus = ["Error"];
                            datastatus = datastatus.concat(logResult.data[masterServiceIndex-1]);
                            logResult.data[masterServiceIndex-1] = datastatus;
                            return nextMasterTest();
                        };
                        //Get Service by code
                        //console.log(maasterservice);
                        ModelTest.findOne({ code: maasterservice.code, provider_id: maasterservice.provider_id }, null, { lean: true }, function(e, masterServiceResult){
                            if (e) return nextMasterTest(e);

                            if (masterServiceResult && masterServiceResult.code && masterServiceResult.provider_id) {
                                //Update record 
                                ModelTest.update({ _id: masterServiceResult._id}, { $set: maasterservice }, function(e, masterServiceCount){ 
                                    
                                    datastatus = ["Update"];
                                    datastatus = datastatus.concat(logResult.data[masterServiceIndex-1]);
                                    logResult.data[masterServiceIndex-1] = datastatus;
                                    return nextMasterTest();
                                });
                            }else{ 
                                var partnerServiceParse = ModelTest(maasterservice);
                                partnerServiceParse.save(function(e, saveResult){
                                    
                                    datastatus = ["New"];
                                    datastatus = datastatus.concat(logResult.data[masterServiceIndex-1]);
                                    logResult.data[masterServiceIndex-1] = datastatus;
                                    return nextMasterTest();
                                });
                            };
                        });
                    });
                }, function(e){
                    logResult.status = "Completed";
                    ImportLog.update({ _id: logResult._id }, { $set: logResult }, function(e, logCount){
                        if (e) {
                            console.log("Error while update log");
                            console.log(e);
                        };

                        console.log("Competed");
                    });
                });
            });
        });
    };

    function addDepartment(departmentObj, req, next) {
        var departmentCounter = 0;
        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        }
        var columns = {
            name: 0,
            description: 1
        }
        async.each(departmentObj, function(obj, callback) {
            departmentCounter++;
            searchObj = {
                name: obj[columns.name]
            };
            if (departmentCounter == 1) return callback();
            // console.log(searchObj);
            if (obj[columns.name] == "") {
                counterObj.errorCount++;
                return callback();
            } else {
                ModelDepartment.find(searchObj, function(error, result) {
                    if (error) {
                        counterObj.errorCount++;
                        return callback();
                    }
                    if (result.length) {
                        counterObj.updateCount++;
                        async.each(result, function(updateResult, next) {
                            updateResult.name = obj[columns.name];
                            updateResult.description = obj[columns.description];
                            updateResult['provider_id'] = req.user.provider_id._id
                            updateResult.save(function(error, saveResult) {
                                if (error) {
                                    counterObj.errorCount++;
                                }
                                return next();
                            });
                        });
                        return callback();
                    } else {
                        counterObj.insertCount++;
                        var departmentObj = {};
                        departmentObj.name = obj[columns.name];
                        departmentObj.description = obj[columns.description];
                        departmentObj['provider_id'] = req.user.provider_id._id
                            // console.log(departmentObj);
                        var departmentObj = new ModelDepartment(departmentObj);
                        departmentObj.save(function(error, result) {
                            if (error) {
                                counterObj.errorCount++;
                                return next();
                            }
                        });
                        return callback();
                    }
                });
            }
        }, function(error) {
            if (error) return next(error);
            // console.log(counterObj);
            return next(null, counterObj);
        });
    }

    function addPartnerTest(partnerTest, finalCallback) {
        if (!loggedinuser) return finalCallback(new Error("User not found"));
        if (!provider_id) return finalCallback(new Error("Provider not found"));
        if (!partnerTest) return finalCallback(new Error("Data not found"));
        if (!partnerTest.length) return finalCallback(new Error("Data is empty"));

        var partnerservice = {};
        var tempoutertubes;
        var tempinnertubes;
        var temptubes;
        var tube = [];
        var log = {};
        var searchtube = {};
        log = {
            status: "Inprogress", 
            provider_id: provider_id._id,
            user_id: loggedinuser._id,
            file: fileOriginalname,  
            collectionname: "PartnerService",
            error: [],
            data: [],
            result: [],
            datetime: new Date()
        };

        var columns = {};
        var tempcolumns = [
            'partnername',
            'code', //code change to ServiceCodes
            'category', //category change to MainGroup
            'name', //name change to servicedescription
            'mastertestname',
            'tube', //tube to collection tubes
            'department', //department change to subgroup
            'specialinstruction', //specialinstruction change to Special Requirements
            'customerinstruction', //customerinstrucition change to CustomerInstruction
            'description',
            'sellingprice',
            'mrp',
            'b2bpurchase',
            'b2cpurchase',
            'B2B',
            'B2C',
            'sechedule', //new attrbibute added
            'tat', //new attribute added into excel and in model to
            'specialtest', //new attribute added into excel and in model to
            'postsample', //new attribute added into excel and in model to
            'sampletype', //new attribute added into excel and in model to
            'collection' //new attribute added into excel and in model to
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        //Finding # of columns
        if (partnerTest && partnerTest[0]) {
            var tempPartnerTest = partnerTest[0];
            var tempPartnerTestIndex = 0;
            tempPartnerTest.forEach(function(o){
                if (o && o.length) {
                    tempPartnerTestIndex += 1;
                };
            });
            if (tempcolumns.length != tempPartnerTestIndex) {
                return finalCallback(new Error("Columns are missing"));
            };
        }else{
            return finalCallback(new Error("Columns are missing"));
        };

        finalCallback(null, "Import Started");

        saveLog(log, function(e, logResult){
            if (e) {
                console.log("Error in log");
                console.log(e);
            };

            var partnerServiceIndex = 0;
            var datastatus = [];
            async.eachSeries(partnerTest, function(partnerTestObj, nextPartnerTest){
                logResult.data.push(partnerTestObj);
                partnerServiceIndex += 1;
                //Checking, is this first row of excel sheet, if yes then return for the next row of excel sheet
                if (partnerServiceIndex == 1) {
                    datastatus = ["Status"];
                    datastatus = datastatus.concat(logResult.data[partnerServiceIndex-1]);
                    logResult.data[partnerServiceIndex-1] = datastatus;
                    return nextPartnerTest();
                }

                partnerservice = {};
                partnerservice.masterservice = {};
                partnerservice.price = {};
                partnerservice.specialinstructions = [];
                partnerservice.customerinstructions = [];
                temptubes = [];
                tubes = [];

                async.waterfall([
                    function(nextfun){ 
                        if (!partnerTestObj[columns.partnername]) return nextfun({message:"Partnername not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.partnername].length) return nextfun({message:"Partnername not found at row number "+partnerServiceIndex});
                        
                        if (!partnerTestObj[columns.code]) return nextfun({message:"Code not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.code].length) return nextfun({message:"Code not found at row number "+partnerServiceIndex});
                        
                        if (!partnerTestObj[columns.category]) return nextfun({message:"Category not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.category].length) return nextfun({message:"Category not found at row number "+partnerServiceIndex});
                        
                        if (!partnerTestObj[columns.name]) return nextfun({message:"Name not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.name].length) return nextfun({message:"Name not found at row number "+partnerServiceIndex});
                        
                        //if (!partnerTestObj[columns.mastertestname]) return nextfun({message:"Master service not found at row number "+partnerServiceIndex});
                        //if (!partnerTestObj[columns.mastertestname].length) return nextfun({message:"Master service not found at row number "+partnerServiceIndex});
                        
                        if (!partnerTestObj[columns.tube]) return nextfun({message:"Tube not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.tube].length) return nextfun({message:"Tube not found at row number "+partnerServiceIndex});

                        if (!partnerTestObj[columns.department]) return nextfun({message:"Department not found at row number "+partnerServiceIndex});
                        if (!partnerTestObj[columns.department].length) return nextfun({message:"Department not found at row number "+partnerServiceIndex});
                        
                        return nextfun();
                    },
                    function(nextfun){
                        //Get partner from db by name
                        ModelPartner.findOne({ "info.name": new RegExp(partnerTestObj[columns.partnername].trim(),'i') }, null, { lean: true }, function(e, partnerResult){
                            if (e) return nextfun(e);
                            if (!partnerResult) return nextfun({message:"Partner ("+ partnerTestObj[columns.partnername].trim() +") not found at row number "+partnerServiceIndex});

                            partnerservice.partner_id = partnerResult._id;
                            return nextfun();
                        });
                    },
                    function(nextfun){
                        if (!partnerTestObj[columns.mastertestname].trim().length) return nextfun();
                        
                        //Get master service
                        ModelTest.findOne({name: new RegExp(partnerTestObj[columns.mastertestname].trim(),'i'), provider_id: provider_id }, null, { lean: true }, function(e, masterSerResult){
                            if (e) return nextfun(e);
                            if (!masterSerResult) return nextfun();
                                if (!masterSerResult._id) return nextfun();

                            partnerservice.masterservice.service_id = masterSerResult._id;
                            return nextfun();
                        });
                    },
                    function(nextfun){
                        partnerTestObj[columns.tube] = partnerTestObj[columns.tube].toString();
                        tempoutertubes = partnerTestObj[columns.tube].split("&");

                        async.each(tempoutertubes, function(tempoutertube, nexttubeouter){
                            tempinnertubes = tempoutertube.split("|");
                            if (tempinnertubes.length == 3) {
                                searchtube = {};
                                searchtube.type = new RegExp(tempinnertubes[0].trim(),'i');
                                searchtube.company = new RegExp(tempinnertubes[1].trim(),'i');
                                searchtube.size = tempinnertubes[2].trim();
                                ModelTube.findOne(searchtube, null, { lean:true }, function(e, tubeResult){
                                    if (e) return nexttubeouter(e);
                                    if (!tubeResult) return nexttubeouter();
                                    
                                    tubes.push(tubeResult._id);
                                    return nexttubeouter();
                                });
                            }else{
                                return nexttubeouter();
                            };
                        }, function(e){
                            if (e) return nextfun({message:"Tube ("+ partnerTestObj[columns.tube] +") not found at row number "+partnerServiceIndex});
                            if (!tubes) return nextfun({message:"Tube ("+ partnerTestObj[columns.tube] +") not found at row number "+partnerServiceIndex});
                            if (!tubes.length) return nextfun({message:"Tube ("+ partnerTestObj[columns.tube] +") not found at row number "+partnerServiceIndex});
                            
                            return nextfun();
                        });
                    },
                    function(nextfun){
                        //Get department
                        ModelDepartment.findOne({name: new RegExp(partnerTestObj[columns.department].trim(),'i'), provider_id: provider_id }, null, { lean: true }, function(e, departmentResult){
                            if (e) return nextfun(e);
                            if (!departmentResult) return nextfun({message:"Department ("+ partnerTestObj[columns.department] +") not found at row number "+partnerServiceIndex});
                            
                            partnerservice.masterservice.department_id = departmentResult._id;
                            return nextfun();
                        });
                    },
                    function(nextfun){
                        //Category
                        partnerTestObj[columns.category] = partnerTestObj[columns.category].toString();
                        partnerTestObj[columns.category] = partnerTestObj[columns.category].toUpperCase();
                        if (partnerTestObj[columns.category] == "TEST") {
                            partnerservice.category = partnerTestObj[columns.category];
                            return nextfun();
                        }else{
                            return nextfun({message:"Category ("+ partnerTestObj[columns.category] +") not available at row number "+partnerServiceIndex});   
                        };
                    },
                    //Added by paresh
                    function(nextfun){
                        //if (!partnerTestObj[columns.customerinstruction]) return nextfun(null)
                        var search = {};
                        search["provider_id"] = provider_id;
                        PatientInstructionModel.find(search, function(error, customerInstructions) {
                            var find = false;
                            customerInstructions.forEach(function(ciObj, index){
                                
                                if(!partnerTestObj[columns.customerinstruction])
                                {
                                    if( ciObj.description.trim().toLowerCase() == 'na' )
                                    {
                                        partnerservice.customerinstructions.push(ciObj._id);
                                        find = true;
                                    }
                                }
                                else
                                {
                                    if( ciObj.description.trim().toLowerCase() == partnerTestObj[columns.customerinstruction].trim().toLowerCase() )
                                    {
                                        partnerservice.customerinstructions.push(ciObj._id);
                                        find = true;
                                    }
                                }
                            });
                            if(!find)
                            {
                                return nextfun({message:"Customer Instruction ("+ partnerTestObj[columns.customerinstruction] +") not available at row number "+partnerServiceIndex});
                            }
                            return nextfun(null)
                        })
                    },
                    //Added by paresh
                    function(nextfun){
                        //if (!partnerTestObj[columns.specialinstruction]) return nextfun(null)

                        var search = {};
                        search["name"] = "SpecialInstruction";
                        search["provider_id"] = provider_id;
                        ModelOptionMaster.findOne(search, function(error, SpecialInstructionParent) {
                            if (error) return next(error)
                            var optionSearch = {}
                            var option = {};
                            optionSearch["parent_id"] = SpecialInstructionParent._id;
                            // option.sort = {};
                            // option.sort["priority"] = 1;

                            ModelOptionMaster.find(optionSearch, {}, option, function(error, sepecialInstructions) {
                                var find = false;
                                sepecialInstructions.forEach(function(siObj, index){
                                    if(!partnerTestObj[columns.specialinstruction])
                                    {
                                        if(siObj.displayname.trim().toLowerCase() == 'na')
                                        {
                                            partnerservice.specialinstructions.push(siObj._id)
                                            find = true;
                                        }
                                    }
                                    else
                                    {
                                        if(siObj.displayname.trim().toLowerCase() == partnerTestObj[columns.specialinstruction].trim().toLowerCase())
                                        {
                                            partnerservice.specialinstructions.push(siObj._id)
                                            find = true;
                                        }
                                    }
                                    
                                });
                                if(!find)
                                {
                                    return nextfun({message:"Special Instruction ("+ partnerTestObj[columns.specialinstruction] +") not available at row number "+partnerServiceIndex});
                                }
                                return nextfun(null)
                            })
                        })
                        
                    },
                    function(nextfun){
                        partnerservice.provider_id = provider_id;
                        partnerservice.name = partnerTestObj[columns.name].trim();
                        partnerservice.code = partnerTestObj[columns.code].trim();

                        partnerservice.category = partnerTestObj[columns.category].trim();

                        partnerservice.masterservice.tubes = [];
                        partnerservice.masterservice.tubes = tubes;

                        if (partnerTestObj[columns.specialinstruction]) 
                            partnerservice.specialinstruction = partnerTestObj[columns.specialinstruction].trim();
                        if (partnerTestObj[columns.customerinstruction]) 
                            partnerservice.customerinstruction = partnerTestObj[columns.customerinstruction].trim();
                        if (partnerTestObj[columns.description]) 
                            partnerservice.description = partnerTestObj[columns.description].trim();

                        if (partnerTestObj[columns.mrp]) 
                            partnerservice.price.mrp = tempNumber.makeFloat(partnerTestObj[columns.mrp]);
                        if (partnerTestObj[columns.sellingprice]) 
                            partnerservice.price.selling = tempNumber.makeFloat(partnerTestObj[columns.sellingprice]);
                        if (partnerTestObj[columns.b2bpurchase]) 
                            partnerservice.price.b2bpurchase = tempNumber.makeFloat(partnerTestObj[columns.b2bpurchase]);
                        if (partnerTestObj[columns.b2cpurchase]) 
                            partnerservice.price.b2cpurchase = tempNumber.makeFloat(partnerTestObj[columns.b2cpurchase]);

                        if (partnerTestObj[columns.B2B]) 
                            partnerservice.B2B = true;
                        if (partnerTestObj[columns.B2C]) 
                            partnerservice.B2C = true;
                        if (partnerTestObj[columns.postsample]) 
                            partnerservice.postsample = true;

                        if (partnerTestObj[columns.tat]) 
                            partnerservice.tat = partnerTestObj[columns.tat].trim();
                        if (partnerTestObj[columns.specialtest]) 
                            partnerservice.specialtest = partnerTestObj[columns.specialtest].trim();
                        if (partnerTestObj[columns.sechedule]) 
                            partnerservice.sechedule = partnerTestObj[columns.sechedule].trim();
                        if (partnerTestObj[columns.sampletype]) 
                            partnerservice.sampletype = partnerTestObj[columns.sampletype].trim();
                        if (partnerTestObj[columns.collection]) 
                            partnerservice.collectionprocedure = partnerTestObj[columns.collection].trim();

                        return nextfun();
                    }
                ], function(e){
                    if (e) {
                        logResult.error.push(e);
                        datastatus = ["Error"];
                        datastatus = datastatus.concat(logResult.data[partnerServiceIndex-1]);
                        logResult.data[partnerServiceIndex-1] = datastatus;
                        return nextPartnerTest();
                    };
                    //Get Partner-Service by code
                    //console.log(partnerservice);
                    ModelPartnerService.findOne({ code: partnerservice.code, partner_id: partnerservice.partner_id }, null, { lean: true }, function(e, partnerServiceResult){
                        if (e) return nextPartnerTest(e);

                        if (partnerServiceResult && partnerServiceResult.code && partnerServiceResult.partner_id) {
                            //Update record 
                            ModelPartnerService.update({ _id: partnerServiceResult._id}, { $set: partnerservice }, function(e, partnerCount){ 
                                
                                datastatus = ["Update"];
                                datastatus = datastatus.concat(logResult.data[partnerServiceIndex-1]);
                                logResult.data[partnerServiceIndex-1] = datastatus;
                                return nextPartnerTest();
                            });
                        }else{ 
                            var partnerServiceParse = ModelPartnerService(partnerservice);
                            partnerServiceParse.save(function(e, saveResult){
                                
                                datastatus = ["New"];
                                datastatus = datastatus.concat(logResult.data[partnerServiceIndex-1]);
                                logResult.data[partnerServiceIndex-1] = datastatus;
                                return nextPartnerTest();
                            });
                        };
                    });
                });
            }, function(e){
                logResult.status = "Completed";
                ImportLog.update({ _id: logResult._id }, { $set: logResult }, function(e, logCount){
                    if (e) {
                        console.log("Error while update log");
                        console.log(e);
                    };

                    console.log("Competed");
                });
            });
        });
    };

    function addPartnerTest_old(partnerObj, req, finalCallback) {
        console.log("*******************Start*******************");
        if (!req.user.provider_id._id) return finalCallback(new Error("No Provider"));
        var loggedinuser = req.user;
        var provider_id = req.user.provider_id._id
        var errorLogs = []
        var partnertestCounter = 0;
        var errorDate = new Date();
        var search = {};
        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        };
        var log = {};
        var columns = {};
        var tempcolumns = [
            'partner',
            'code', //code change to ServiceCodes
            'category', //category change to MainGroup
            'name', //name change to servicedescription
            'mastertestname',
            'tube', //tube to collection tubes
            'department', //department change to subgroup
            'specialinstruction', //specialinstruction change to Special Requirements
            'customerinstruction', //customerinstrucition change to CustomerInstruction
            'description',
            'sellingprice',
            'mrp',
            'b2bpurchase',
            'b2cpurchase',
            'B2B',
            'B2C',
            'sechedule', //new attrbibute added
            'tat', //new attribute added into excel and in model to
            'specialtest', //new attribute added into excel and in model to
            'postsample', //new attribute added into excel and in model to
            'sampletype', //new attribute added into excel and in model to
            'collection' //new attribute added into excel and in model to
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        finalCallback(null, "Import Started");

        async.eachSeries(partnerObj, function(obj, nextrow) {
            log = {
                status: "", 
                provider_id: provider_id,
                user_id: loggedinuser,
                file: req.files.file.originalname,  
                collectionname: "PartnerService",
                error: "",
                data: obj,
                result: "",
                datetime: new Date()
            };
                var collectiontubes = []
                var finalTubes = [];
                partnertestCounter++
                if (partnertestCounter == 1) {
                    //Toshan
                    log.rownumber = partnertestCounter;
                    log.status = "Inprogress"; 
                    log.error += "";
                    log.result += "First row";
                    saveLog(log, function(e, logresult){
                        if (e) return nextrow(e);

                        return nextrow();
                    });
                    //return nextrow();
                    //End
                }else{

                    console.log("Test:" + obj[columns.code]);
                    async.waterfall([
                        /** [searchPartner by name and pass partner to another function]*/
                        function(nextfun) {
                            console.log("Basic check");
                            search = {}
                            search["info.name"] = obj[columns.partner];
                            if (obj[columns.partner].length < 0) {
                                // console.log(partnertestCounter + "partner not found");
                                errorLogs.push(req.files.file.originalname + " => " +
                                    partnertestCounter + " => " + " Partner Not Present")
                                counterObj.errorCount++;
                                
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed"; 
                                log.error += "Partner Not Present, ";
                                log.result += "No result";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            }
                            if (obj[columns.department].length < 0) {
                                // console.log(partnertestCounter + "department not found");
                                errorLogs.push(req.files.file.originalname + " => " +
                                    partnertestCounter + " => " + "Department Not Present")
                                counterObj.errorCount++;
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed"; 
                                log.error += "Department Not Present, ";
                                log.result += "No result";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };

                            if (obj[columns.category].length < 0) {
                                // console.log(partnertestCounter + "category not found");
                                errorLogs.push(req.files.file.originalname + " => " +
                                    partnertestCounter + partnertestCounter + " => " + "Category Not Present")
                                counterObj.errorCount++;
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed"; 
                                log.error += "Category Not Present, ";
                                log.result += "No result";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };

                            if (obj[columns.code].length < 0) {
                                // console.log(partnertestCounter + "code not found");
                                errorLogs.push(req.files.file.originalname + " => " +
                                    partnertestCounter + " => " + " test code Not Present")
                                counterObj.errorCount++;
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed"; 
                                log.error += "Test Code Not Present, ";
                                log.result += "No result";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };

                            ModelPartner.findOne(search, function(error, partner) {
                                if (error) {
                                    console.log("Error while finding partner" + partnertestCounter + error);
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        partnertestCounter + " => " + error)
                                    counterObj.errorCount++;
                                    //Toshan
                                    log.rownumber = partnertestCounter;
                                    log.status = "Failed";
                                    if (error && error.message) log.error += error.message+", ";
                                    log.result += "No result";
                                    saveLog(log, function(e, logresult){
                                        if (e) return nextrow(e);

                                        return nextrow();
                                    });
                                    //return nextrow();
                                    //End
                                }
                                if (!partner) {
                                    // console.log(partnertestCounter + "partner not found");
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        partnertestCounter + " => " + "Partner Not Present")
                                    counterObj.errorCount++;
                                    //Toshan
                                    log.rownumber = partnertestCounter;
                                    log.status = "Failed";
                                    log.error += "Partner Not Found, ";
                                    log.result += "No result";
                                    saveLog(log, function(e, logresult){
                                        if (e) return nextrow(e);

                                        return nextrow();
                                    });
                                    //return nextrow();
                                    //End
                                } else {
                                    //Toshan
                                    log.status = "Inprogress";
                                    log.error += "";
                                    log.result += "Found Partner";
                                    return nextfun(null, partner);
                                    //End
                                }
                            });
                        },
                        /*** [masterService by name if ! pass null]*/
                        function(partner, nextfun) {
                            console.log("master service check");
                            var search = {}
                            search['name'] = obj[columns.mastertestname]
                            search['provider_id'] = req.user.provider_id._id
                            if (!obj[columns.mastertestname]) {
                                //Toshan
                                log.status = "Inprogress";    
                                log.error += "";
                                log.result += "Found master service, ";
                                return nextfun(null, partner, null);
                                //End
                            } else {
                                ModelTest.findOne(search, function(error, result) {
                                    if (error) {
                                        // console.log(error);
                                        errorLogs.push(req.files.file.originalname + " => " + errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                        counterObj.errorCount++;
                                        //Toshan
                                        log.rownumber = partnertestCounter;
                                        log.status = "Failed";
                                        if (error && error.message) {
                                            log.error += error.message;
                                        };
                                        log.result += "";
                                        saveLog(log, function(e, logresult){
                                            if (e) return nextrow(e);

                                            return nextrow();
                                        });
                                        //return nextrow();
                                        //End
                                    };
                                    if (result) {
                                        //Toshan
                                        log.status = "Inprogress";
                                        log.error += "";
                                        log.result += "Pass result, ";
                                        return nextfun(null, partner, result);
                                        //End
                                    } else {
                                        //Toshan
                                        log.status = "Inprogress";
                                        log.error += "";
                                        log.result += "Pass result with null value, ";
                                        return nextfun(null, partner, null);
                                        //End
                                    }
                                })
                            }
                        },
                        /** [searchTube by obj if ! add tube ]*/
                        function(partner, service, nextfun) {
                            console.log("tube search");
                            var TubeOne = false;
                            var multipletube = obj[columns.tube].split("&")
                            if (multipletube.length == 1) {
                                if (multipletube[0].indexOf('|') > 0) {
                                    TubeOne = false
                                        // console.log("one with multipl");
                                } else {
                                    TubeOne = true
                                }
                            }
                            //if no tubes return to nextrow() 
                            //as its said by talat sir if no tube dont make any entry into database
                            if (multipletube[0][0] == null) {
                                errorLogs.push(req.files.file.originalname + " => " +
                                    errorDate.toDateString() + " =>" + partnertestCounter + " => Tube Not Present")
                                counterObj.errorCount++
                                    
                                    //Toshan
                                    log.rownumber = partnertestCounter;
                                    log.status = "Failed";
                                    log.error += "";
                                    log.result += "Tube Not Present, ";
                                    saveLog(log, function(e, logresult){
                                        if (e) return nextrow(e);

                                        return nextrow();
                                    });
                                    //return nextrow();
                                    //End
                            };
                            //if no tubes return to nextrow() 
                            //before its allowed to add partnertest if no tubes present
                            //as its said by talat sir if no tube present dont make any entry into database
                            if (multipletube[0] == null) {
                                errorLogs.push(req.files.file.originalname + " => " +
                                    errorDate.toDateString() + " =>" + partnertestCounter + " => Tube Not Present")
                                counterObj.errorCount++
                                    //Toshan
                                    log.rownumber = partnertestCounter;
                                    log.status = "Failed";
                                    log.error += "";
                                    log.result += "Tube Not Present, ";
                                    saveLog(log, function(e, logresult){
                                        if (e) return nextrow(e);

                                        return nextrow();
                                    });
                                    //return nextrow(); // return nextfun(null, partner, service, null);
                                    //End
                                        
                            } else {
                                if (!TubeOne) {
                                    console.log("Tube found")
                                    if (multipletube[0][0].search("|") >= 0) {
                                        for (var tubecount = 0; tubecount < multipletube.length; tubecount++) {
                                            var split = multipletube[tubecount].split('|')
                                            collectiontubes.push(split)
                                        }
                                    }
                                }
                                var tubesAdded = -1
                                if (TubeOne) {
                                    //@abs [if singal string return to nextrow() not need to add] 
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => Tube Not Present")
                                    counterObj.errorCount++
                                        //Toshan
                                        log.rownumber = partnertestCounter;
                                        log.status = "Failed";
                                        log.error += "";
                                        log.result += "Tube Not Present, ";
                                        saveLog(log, function(e, logresult){
                                            if (e) return nextrow(e);

                                            return nextrow();
                                        });
                                        //return nextrow(); // return nextfun(null, partner, service, null);
                                        //End
                                            // var search = {}
                                            // search["type"] = multipletube[0]
                                            // search.provider_id = req.user.provider_id._id
                                            // ModelTube.findOne(search, function(error, result) {
                                            //     if (error) {
                                            //         console.log(error);
                                            //         counterObj.errorCount++
                                            //             errorLogs.push(req.file + " => " +
                                            //                 errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                            //         return next(error)
                                            //     }
                                            //     if (result) {
                                            //         finalTubes.push(result)
                                            //         return nextfun(null, partner, service, finalTubes);
                                            //     } else {
                                            //         var tube = {}
                                            //         tube.type = multipletube[0]
                                            //         tube.provider_id = req.user.provider_id._id
                                            //         var addTube = new ModelTube(tube)
                                            //         addTube.save(function(error, result) {
                                            //             if (error) {
                                            //                 console.log("Type " + partnertestCounter + " " + error);
                                            //                 counterObj.errorCount++
                                            //                     errorLogs.push(req.file + " => " +
                                            //                         errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                            //                 return nextrow()
                                            //             }
                                            //             return nextfun(null, partner, service, result);
                                            //         })
                                            //     }
                                            // })
                                } else {
                                    console.log(multipletube)
                                    async.eachSeries(multipletube, function(obj, nextTube) {
                                            tubesAdded++
                                            var search = {}
                                            if (collectiontubes[tubesAdded].length > 2) {
                                                // search["type"] = collectiontubes[tubesAdded][0].trim()
                                                // search["company"] = collectiontubes[tubesAdded][1].trim()
                                                // search["size"] = collectiontubes[tubesAdded][2].trim()
                                                search["type"] =  new RegExp(collectiontubes[tubesAdded][0].trim(), "i");
                                                search["company"] = new RegExp(collectiontubes[tubesAdded][1].trim(), "i");
                                                search["size"] = new RegExp(collectiontubes[tubesAdded][2].trim(), "i");
                                                search["provider_id"] = req.user.provider_id._id
                                                console.log(search)
                                                ModelTube.findOne(search, function(error, tube) {
                                                    if (error) {
                                                        // console.log("Tube Not Found " + partnertestCounter + " " + error);
                                                        errorLogs.push(req.files.file.originalname + " => " +
                                                            errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                                        counterObj.errorCount++;
                                                        //Toshan
                                                        log.rownumber = partnertestCounter;
                                                        log.rownumber = partnertestCounter;
                                                        log.status = "Failed";
                                                        if (error && error.message) {
                                                            log.error += error.message;    
                                                        };
                                                        log.result += "";
                                                        saveLog(log, function(e, logresult){
                                                            if (e) return nextrow(e);

                                                            return nextrow();
                                                        });
                                                        //return nextrow(); // return nextfun(null, partner, service, null);
                                                        //End
                                                    }
                                                    if (tube) {
                                                        finalTubes.push(tube)
                                                        return nextTube()
                                                    } else {
                                                        console.log("else")
                                                        return nextTube()
                                                            // var tubeObj = {}
                                                            // tubeObj["type"] = search.type
                                                            // tubeObj["provider_id"] = provider_id
                                                            // tubeObj["company"] = search.company
                                                            // tubeObj["size"] = search.size
                                                            //     // console.log(tubeObj);
                                                            // var addTube = new ModelTube(tubeObj)
                                                            // addTube.save(function(error, newtube) {
                                                            //     errorLogs.push(error)
                                                            //     finalTubes.push(newtube)
                                                            //     return nextTube()
                                                            // })
                                                    }
                                                });
                                            } else {

                                                return nextTube()
                                            }
                                        },
                                        function(error) {
                                            if (error) {
                                                // console.log("error in callback " + partnertestCounter + " " + error);
                                                errorLogs.push(req.files.file.originalname + " => " +
                                                    errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                                counterObj.errorCount++
                                                    //Toshan
                                                    log.rownumber = partnertestCounter;
                                                    log.status = "Failed";
                                                    if (error && error.message) {
                                                        log.error += error.message;
                                                    };
                                                    log.result += "";
                                                    saveLog(log, function(e, logresult){
                                                        if (e) return nextrow(e);

                                                        return nextrow();
                                                    });
                                                    //return nextrow();
                                                    //End
                                            }
                                            if (finalTubes) {
                                                if (finalTubes.length > 0) {
                                                    return nextfun(null, partner, service, finalTubes);
                                                } else
                                                    return nextrow()
                                            } else
                                                return nextrow()
                                        })
                                }
                            }
                        },
                        /** [searchDepartment if ! add department]*/
                        function(partner, service, tube, nextfun) {
                            console.log("department search");
                            var search = {};
                            search['name'] = obj[columns.department].trim()
                            search['provider_id'] = req.user.provider_id._id
                            // console.log(search);
                            ModelDepartment.findOne(search, function(error, department) {
                                if (error) {
                                    // console.log("Department " + partnertestCounter + " " + error);
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                                    counterObj.errorCount++;
                                    //Toshan
                                    log.rownumber = partnertestCounter;
                                    log.status = "Failed";
                                    if (error && error.message) {
                                        log.error += error.message;
                                    };
                                    log.result += "";
                                    saveLog(log, function(e, logresult){
                                        if (e) return nextrow(e);

                                        return nextrow();
                                    });
                                    //return nextrow();
                                    //End
                                }
                                if (department) {
                                    return nextfun(null, partner, service, tube, department)
                                } else {
                                    // console.log("department not found");
                                    return nextfun(null, partner, service, tube, null)
                                        // return nextrow()
                                        // var department = {};
                                        // department["name"] = obj[columns.department]
                                        // department['provider_id'] = req.user.provider_id._id
                                        // var addDepartment = new ModelDepartment(department)
                                        // if (error) {
                                        //     errorLogs.push(error)
                                        //     counterObj.errorCount++
                                        //         return nextrow()
                                        // }
                                        // addDepartment.save(function(error, newdepartment) {
                                        //     if (error) {
                                        //         errorLogs.push(error)
                                        //         counterObj.errorCount++
                                        //             return nextrow()
                                        //     }
                                        //     return nextfun(null, partner, service, tube, newdepartment)
                                        // })
                                }
                            })
                        },
                        /** [addPartnerTest add partner with all ref id from function ]*/
                        function(partner, service, tube, department, nextfun) {
                            if (department == null) {
                                // console.log("Department " + partnertestCounter);
                                counterObj.errorCount++
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + "Department Missing")
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed";
                                log.error += "Department Missing";
                                log.result += "";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };
                            // console.log("category not fount")
                            if (obj[columns.category] == null) {
                                console.log("Category " + partnertestCounter);
                                counterObj.errorCount++
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + "Category Missing")
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed";
                                log.error += "Category Missing";
                                log.result += "";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };
                            // console.log("code not fount")
                            if (obj[columns.code] == null) {
                                console.log("Code " + partnertestCounter);
                                counterObj.errorCount++
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + "Code Missing")
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed";
                                log.error += "Code Missing";
                                log.result += "";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            };
                            // console.log("tube not fount")
                            if (tube == null) {
                                console.log("Tube " + partnertestCounter);
                                counterObj.errorCount++
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + "Tube Missing")
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed";
                                log.error += "Tube Missing";
                                log.result += "";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            }
                            // console.log("partner not fount")
                            if (partner == null) {
                                console.log("Partner " + partnertestCounter);
                                counterObj.errorCount++
                                    errorLogs.push(req.files.file.originalname + " => " +
                                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + "Missing Partner Or Department Or Category Or Code")
                                //Toshan
                                log.rownumber = partnertestCounter;
                                log.status = "Failed";
                                log.error += "Missing Partner Or Department Or Category Or Code, ";
                                log.result += "";
                                saveLog(log, function(e, logresult){
                                    if (e) return nextrow(e);

                                    return nextrow();
                                });
                                //return nextrow();
                                //End
                            } else {
                                var partnertestObj = {}
                                var masterservice = {}
                                masterservice.tubes = []
                                partnertestObj.masterservice = {}
                                partnertestObj.masterservice.tubes = []
                                if (req.user.provider_id) {
                                    partnertestObj['provider_id'] = req.user.provider_id._id
                                }
                                // [ regex to avoid " from description and accepted columns]
                                var regex = /"/gi;
                                partnertestObj['name'] = obj[columns.name].replace(regex, "")
                                partnertestObj['alias'] = []
                                partnertestObj['alias'].push(obj[columns.name])
                                partnertestObj['code'] = obj[columns.code];
                                partnertestObj['partner_id'] = partner._id;
                                partnertestObj['category'] = obj[columns.category]
                                partnertestObj['price'] = {}
                                partnertestObj['price'].selling = obj[columns.sellingprice].replace(/\,/g, '')
                                partnertestObj['price'].mrp = obj[columns.mrp].replace(/\,/g, '')
                                partnertestObj['price'].b2bpurchase = obj[columns.b2bpurchase].replace(/\,/g, '')
                                partnertestObj['price'].b2cpurchase = obj[columns.b2cpurchase].replace(/\,/g, '')
                                partnertestObj['customerinstruction'] = obj[columns.customerinstruction].replace(regex, "")
                                partnertestObj['specialinstruction'] = obj[columns.specialinstruction].replace(regex, "")
                                partnertestObj['description'] = obj[columns.description].replace(regex, "")
                                partnertestObj['B2B'] = obj[columns.B2B]
                                partnertestObj['B2C'] = obj[columns.B2C]
                                partnertestObj['sechedule'] = obj[columns.sechedule]
                                partnertestObj['tat'] = obj[columns.tat]
                                partnertestObj['specialtest'] = obj[columns.specialtest]
                                partnertestObj['postsample'] = obj[columns.postsample]
                                partnertestObj['sampletype'] = obj[columns.sampletype]
                                partnertestObj['collectionprocedure'] = obj[columns.collection]
                                // partnertestObj['errorLogs'] = errorLogs

                                async.waterfall([
                                    function(nextfun) {
                                        if (partnertestObj['category'] == "TEST" || partnertestObj['category'] == "Test" || partnertestObj['category'] == "test") {
                                            if (service) {
                                                partnertestObj.masterservice.service_id = service._id;
                                            }
                                            if (department) {
                                                partnertestObj.masterservice.department_id = department._id
                                            };
                                            if (tube) {
                                                if (tube.length > 0) {
                                                    for (var tubeCount = 0; tubeCount < tube.length; tubeCount++) {
                                                        partnertestObj.masterservice.tubes.push(tube[tubeCount])
                                                    }
                                                };

                                            };
                                            return nextfun(null)
                                        } else return nextfun(null)
                                    },
                                    function(nextfun) {
                                        if (partnertestObj['category'] == "PROFILE" || partnertestObj['category'] == "profile" || partnertestObj['category'] == "Profile") {
                                            if (service) {
                                                partnertestObj.masterservice.service_id = service._id
                                            }
                                            if (department) {
                                                partnertestObj.masterservice.department_id = department._id
                                            }
                                            if (tube) {
                                                if (tube.length > 0) {
                                                    for (var tubeCount = 0; tubeCount < tube.length; tubeCount++) {
                                                        partnertestObj.masterservice.tubes.push(tube[tubeCount])
                                                    }
                                                };
                                            };
                                            return nextfun(null)
                                        } else return nextfun(null)
                                    },
                                ], function(error) {    
                                    //[ key to find from database if present update else add]
                                    console.log("final add");
                                    // console.log(partnertestObj);
                                    var search = {}
                                    search['code'] = partnertestObj['code']
                                    search['provider_id'] = provider_id

                                    ModelPartnerService.findOne(search, function(error, partnerTestServices) {
                                        if (error) {
                                            // console.log("partner " + partnertestCounter + " " + error);
                                            counterObj.errorCount++;
                                            errorLogs.push(req.files.file.originalname + " => " +
                                                errorDate.toDateString() + " =>" + error)
                                            //Toshan
                                            log.rownumber = partnertestCounter;
                                            log.status = "Failed";
                                            if (error && error.message) {
                                                log.error += error.message;
                                            };
                                            log.result += "";
                                            saveLog(log, function(e, logresult){
                                                if (e) return nextrow(e);

                                                return nextrow();
                                            });
                                            //return nextrow();
                                            //End
                                        }
                                        if (!partnerTestServices) {
                                            var addPartnerTest = new ModelPartnerService(partnertestObj)
                                            addPartnerTest.save(function(error, newPartnerTest) {
                                                if (error) {
                                                    // console.log("partner Saving Error" + partnertestCounter + " " + error);
                                                    counterObj.errorCount++;
                                                    errorLogs.push(req.files.file.originalname + " => " +
                                                        errorDate.toDateString() + " =>" + error)
                                                    //Toshan
                                                    log.rownumber = partnertestCounter;
                                                    log.status = "Failed";
                                                    if (error && error.message) {
                                                        log.error += error.message;
                                                    };
                                                    log.result += "";
                                                    saveLog(log, function(e, logresult){
                                                        if (e) return nextrow(e);

                                                        return nextrow();
                                                    });
                                                    //return nextrow();
                                                    //End
                                                }
                                                console.log("Insert" + partnertestCounter);
                                                counterObj.insertCount++;
                                                return nextfun(null, partner, service, tube, department, newPartnerTest)
                                            })
                                        } else {
                                            console.log("Update " + partnertestCounter);
                                            for (var key in partnertestObj) {
                                                if (typeof partnerTestServices[key] !== "function") {
                                                    partnerTestServices[key] = partnertestObj[key];
                                                };
                                            }
                                            partnerTestServices.save(function(error, result) {
                                                if (error) {
                                                    // console.log("partner Update Error" + partnertestCounter + " " + error);
                                                    errorLogs.push(req.files.file.originalname + " => " +
                                                        errorDate.toDateString() + " =>" + error)
                                                    counterObj.errorCount++;
                                                    //Toshan
                                                    log.rownumber = partnertestCounter;
                                                    log.status = "Failed";
                                                    if (error && error.message) {
                                                        log.error += error.message;
                                                    };
                                                    log.result += "";
                                                    saveLog(log, function(e, logresult){
                                                        if (e) return nextrow(e);

                                                        return nextrow();
                                                    });
                                                    //return nextrow();
                                                    //End
                                                }
                                                counterObj.updateCount++;
                                                return nextfun(null, partner, service, tube, department, result)
                                            })
                                        }
                                    })
                                })
                            }
                        }

                    ], function(error, partner, service, tube, department, newPartnerTest) {
                        if (error) {
                            // console.log("final waterfall error" + partnertestCounter + " " + error);

                            errorLogs.push(req.files.file.originalname + " => " +
                                errorDate.toDateString() + " =>" + prtnertestCounter + " => " + error)
                            counterObj.errorCount++
                        }
                        return nextrow()
                    });
                }   

            },
            function(error) {
                if (error) {
                    // console.log("finalCallback Error " + partnertestCounter + " " + error);

                    errorLogs.push(req.files.file.originalname + " => " +
                        errorDate.toDateString() + " =>" + partnertestCounter + " => " + error)
                    counterObj.errorCount++
                        //return finalCallback(error); //Toshan
                }
                // console.log(errorLogs);
                // return finalCallback(null, counterObj)
            });
    }

    function addOptionMaster(datas, parentName, req, next) {
        if (!parentName) return next(new Error("Parent name not found"));
        if (!req || !req.user || !req.user.provider_id || !req.user.provider_id._id) return next(new Error("Provider Id not found"));

        var searchObj = {};
        async.waterfall([
            function(nextfunc) {
                searchObj = {};
                searchObj["provider_id"] = req.user.provider_id._id;
                searchObj["name"] = parentName;

                ModelOptionMaster.findOne(searchObj, function(e, parentData) {
                    if (e) return next(e);

                    if (parentData) return nextfunc(null, parentData);

                    var optionMasterData = {};
                    optionMasterData.provider_id = req.user.provider_id._id;
                    optionMasterData.name = parentName;
                    optionMasterData.displayname = parentName;
                    optionMasterData.isParent = true;
                    optionMasterData.isEditable = true;
                    var optionMasterObj = new ModelOptionMaster(optionMasterData);

                    optionMasterObj.save(function(e, parentData) {
                        if (e) return next(e);

                        return nextfunc(null, parentData);
                    });
                });
            }
        ], function(e, parentData) {
            var testCouter = 0;
            var counterObj = {
                insertCount: 0,
                updateCount: 0,
                errorCount: 0
            }
            var columns = {
                master_id: 0,
                master_code: 1,
                master_name: 2,
                master_desc: 3
            }
            async.each(datas, function(dataObj, cb) {
                testCouter++;

                if (testCouter == 1) return cb();

                searchObj = {};
                searchObj["provider_id"] = req.user.provider_id._id;
                searchObj["parent_id"] = parentData._id;
                searchObj["code"] = dataObj[columns.master_id];
                searchObj["name"] = dataObj[columns.master_code];
                ModelOptionMaster.find(searchObj, function(e, result) {
                    if (e) {
                        counterObj.errorCount++;
                        return cb();
                    };

                    if (result.length) {
                        counterObj.updateCount++;
                        return cb();
                    };

                    if (dataObj[columns.master_id]) {
                        var optionMasterData = {};
                        optionMasterData.provider_id = req.user.provider_id._id;
                        optionMasterData.code = dataObj[columns.master_id];
                        optionMasterData.name = dataObj[columns.master_code];
                        optionMasterData.displayname = dataObj[columns.master_name];
                        if (dataObj[columns.master_desc] && dataObj[columns.master_desc].toUpperCase() != "NULL")
                            optionMasterData.description = dataObj[columns.master_desc];
                        optionMasterData.parent_id = parentData._id;
                        optionMasterData.isParent = false;
                        optionMasterData.isEditable = true;
                        var optionMasterObj = new ModelOptionMaster(optionMasterData);

                        optionMasterObj.save(function(e, r) {
                            if (e) return next(e);

                            /*console.log("parentData");
                            console.log(r._id);*/

                            counterObj.insertCount++;
                            return cb();
                        });
                    };
                });
            }, function(error) {
                if (error) return next(error);

                return next(null, counterObj);
            });
        });
    };

    function addMajorArea(data, req, next, callback) {
        if (req.user.provider_id) {
            if (!req.user.provider_id._id) return next(new Error("Provider Not Assigned"))
        };
        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        }
        var majorAreaCounter = 0;
        var columns = {
            city: 0,
            majorarea: 1,
            description: 2,
            pincodes: 3,
        }
        var searchObj = {};
        async.eachSeries(data, function(obj, nextrow) {
            majorAreaCounter++;
            if (majorAreaCounter == 1) return nextrow();
            async.waterfall([
                // [ find city if present pass to another function] 
                function(nextfun) {
                    searchObj = {}
                    searchObj["name"] = obj[columns.city].trim()
                    searchObj["provider_id"] = req.user.provider_id._id
                    ModelCity.findOne(searchObj, function(error, result) {
                        if (error) {
                            counterObj.errorCount++;
                            return nextrow();
                        }
                        if (result) {
                            return nextfun(null, result)

                            // not decided if not city present need to update
                            // result.name = obj[columns.city].trim()
                            // result.provider_id = req.user.provider_id._id
                            // result.shortname = obj[columns.city].trim()
                            // result.save(function(error, saveResult) {
                            //     if (error) return nextrow()
                            //     return nextfun(null, result)
                            // })
                        } else {
                            var Obj = {};
                            Obj["name"] = obj[columns.city].trim()
                            Obj["provider_id"] = req.user.provider_id._id
                            Obj["shortname"] = obj[columns.city].trim()
                            var addObj = {};
                            addObj = new ModelCity(Obj)
                            addObj.save(function(error, result) {
                                if (error) {
                                    counterObj.errorCount++
                                        return nextrow();
                                }
                                if (result.length) {
                                    return nextfun(null, result)
                                };
                            })
                        }
                    })
                },
                // [ find area if present update] 
                function(city, nextfun) {
                    searchObj = {};
                    searchObj["name"] = obj[columns.majorarea].trim()
                    searchObj["provider_id"] = req.user.provider_id._id
                    searchObj["city_id"] = city._id
                    ModelMajorArea.findOne(searchObj, function(error, result) {
                        if (error) {
                            counterObj.errorCount++;
                            return nextrow();
                        }
                        if (result) {
                            console.log("sublocation found");
                            result.name = obj[columns.majorarea]
                            result.provider_id = req.user.provider_id._id
                            result.city = city._id
                            result.description = obj[columns.description]
                            result.pincodes = obj[columns.pincodes].split(',')
                            result.save(function(error, result) {
                                if (error) return nextrow();
                                return nextrow();
                            })
                        } else {
                            console.log("add sublocation");
                            var Obj = {};
                            Obj["name"] = obj[columns.majorarea]
                            Obj["provider_id"] = req.user.provider_id._id
                            Obj["city_id"] = city._id
                            Obj["description"] = obj[columns.description]
                            Obj["pincodes"] = obj[columns.pincodes].split(',')
                            Obj["type"] = "MA"
                            var addObj = new ModelMajorArea(Obj);
                            addObj.save(function(error, result) {
                                if (error) {
                                    console.log(error);
                                    counterObj.errorCount++;
                                    return nextrow();
                                }
                                if (result) {
                                    counterObj.insertCount++
                                        return nextfun(null)
                                };
                            })
                        }
                    })
                }
            ], function(error) {
                if (error) return next(error)
                return nextrow()
            })
        }, function(error) {
            if (error) return next(error)
            return callback(null, counterObj)
        })
    }

    function addSublocation(sublocationData, finalCallback) {
        if (!loggedinuser) return finalCallback(new Error("User not found"));
        if (!provider_id) return finalCallback(new Error("Provider not found"));
        if (!provider_id._id) return finalCallback(new Error("Provider ID not found"));
        if (!sublocationData) return finalCallback(new Error("Data not found"));
        if (!sublocationData.length) return finalCallback(new Error("Data is empty"));

        console.log("Start")
        var log = {};
        log = {
            status: "Inprogress", 
            provider_id: provider_id._id,
            user_id: loggedinuser._id,
            file: fileOriginalname,  
            collectionname: "Sublocation",
            error: [],
            data: [],
            result: [],
            datetime: new Date()
        };

        var columns = {};
        var tempcolumns = [
            'majorarea',
            'sublocation',
            'description',
            'pincode',
            'lat',
            'lon'
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        //Finding # of columns
        if (sublocationData && sublocationData[0]) {
            var tempData = sublocationData[0];
            var tempDataIndex = 0;
            tempData.forEach(function(o){
                if (o && o.length) {
                    tempDataIndex += 1;
                };
            });
            if (tempcolumns.length != tempDataIndex) {
                return finalCallback(new Error("Columns are missing"));
            };
        }else{
            return finalCallback(new Error("Columns are missing"));
        };

        finalCallback(null, "Import Started");

        saveLog(log, function(e, logResult){
            if (e) {
                console.log("Error in log");
                console.log(e);
            };

            var sublocationIndex = 0;
            var datastatus = [];
            var searchObj = {};

            var sublocation = {};
            var name_string = "";
            var areaObj = {};
            var newSublocationObj = {};

            async.eachSeries(sublocationData, function(sublocationDataObj, nextSublocation){
                logResult.data.push(sublocationDataObj);
                sublocationIndex += 1;
                //Checking, is this first row of excel sheet, if yes then return for the next row of excel sheet
                if (sublocationIndex == 1) {
                    datastatus = ["Status"];
                    datastatus = datastatus.concat(logResult.data[sublocationIndex-1]);
                    logResult.data[sublocationIndex-1] = datastatus;
                    return nextSublocation();
                };

                sublocation = {};
                name_string = "";

                async.waterfall([
                    function(nextfun){
                        if (!sublocationDataObj[columns.majorarea]) return nextfun({message:"Major area not found at row number "+sublocationIndex});
                        if (!sublocationDataObj[columns.majorarea].length) return nextfun({message:"Major area not found at row number "+sublocationIndex});
                        
                        if (!sublocationDataObj[columns.sublocation]) return nextfun({message:"Sublocation not found at row number "+sublocationIndex});
                        if (!sublocationDataObj[columns.sublocation].length) return nextfun({message:"Sublocation not found at row number "+sublocationIndex});
                        
                        if (!sublocationDataObj[columns.pincode]) return nextfun({message:"Pincode not found at row number "+sublocationIndex});
                        if (!sublocationDataObj[columns.pincode].length) return nextfun({message:"Pincode not found at row number "+sublocationIndex});
                        
                        if (!sublocationDataObj[columns.lat]) return nextfun({message:"Latitude not found at row number "+sublocationIndex});
                        if (!sublocationDataObj[columns.lat].length) return nextfun({message:"Latitude not found at row number "+sublocationIndex});
                        
                        if (!sublocationDataObj[columns.lon]) return nextfun({message:"Longitude not found at row number "+sublocationIndex});
                        if (!sublocationDataObj[columns.lon].length) return nextfun({message:"Longitude not found at row number "+sublocationIndex});
                        
                        return nextfun();
                    },
                    //Get Major area from db by name
                    function(nextfun){ 
                        searchObj = {};
                        searchObj["name"] = sublocationDataObj[columns.majorarea].trim();
                        searchObj["type"] = "MA";
                        searchObj["provider_id"] = provider_id._id;

                        ModelMajorArea.findOne(searchObj, function(e, majorAreaResult){
                            if (e) return nextfun(e);
                            if (!majorAreaResult) return nextfun({message:"Major area ("+ sublocationDataObj[columns.majorarea].trim() +") not found at row number "+sublocationIndex});
                            if (!majorAreaResult.city_id) return nextfun({message:"Major area city ("+ sublocationDataObj[columns.majorarea].trim() +") not found at row number "+sublocationIndex});
                            
                            return nextfun(null, majorAreaResult);
                        });
                    },
                    function(majorAreaResult, nextfun){
                        name_string = "";
                        name_string = sublocationDataObj[columns.sublocation].trim();
                        name_string = name_string.replace(/[(]/g,"\\(");
                        name_string = name_string.replace(/[)]/g,"\\)");
                        name_string = name_string.replace(/[&]/g,"\\&");
                        
                        searchObj = {};
                        searchObj["name"] = { "$regex" : name_string, "$options" : "iu"};
                        searchObj["type"] = "SL";
                        searchObj["parent_areas.area_id"] = majorAreaResult._id;
                        searchObj["pincodes"] = sublocationDataObj[columns.pincode].trim();
                        searchObj["provider_id"] = provider_id._id;

                        ModelMajorArea.findOne(searchObj, null, { lean: true }, function(e, sublocationResult) {
                            if (e) return nextfun({message: e.message + " at row number "+sublocationIndex});

                            if (sublocationResult) { 
                                sublocationResult.city_id = (typeof majorAreaResult.city_id == 'object')?majorAreaResult.city_id._id:majorAreaResult.city_id;
                                
                                if (!sublocationResult.parent_areas) 
                                    sublocationResult.parent_areas = [];
                                areaObj = {};
                                areaObj.area_id = majorAreaResult._id;
                                sublocationResult.parent_areas.push(areaObj);

                                sublocationResult.pincodes = [];
                                sublocationResult.pincodes.push(sublocationDataObj[columns.pincode].trim())
                                sublocationResult.name = sublocationDataObj[columns.sublocation].trim();
                                sublocationResult.provider_id = provider_id._id;
                                sublocationResult.description = sublocationDataObj[columns.description].trim();
                                sublocationResult.type = "SL";
                                sublocationResult.coordinates = {};
                                sublocationResult.coordinates.lat = sublocationDataObj[columns.lat].trim();
                                sublocationResult.coordinates.long = sublocationDataObj[columns.lon].trim();
                                
                               ModelMajorArea.update({ _id: sublocationResult._id}, { $set: sublocationResult}, function(e, updateSublocation){
                                   if (e) return nextfun({message: e.message + " at row number "+sublocationIndex});
                                    
                                    datastatus = ["Update"];
                                    datastatus = datastatus.concat(logResult.data[sublocationIndex-1]);
                                    logResult.data[sublocationIndex-1] = datastatus;
                                    return nextfun();                                    
                               });
                            } else {
                                newSublocationObj = {};
                                newSublocationObj.city_id = (typeof majorAreaResult.city_id == 'object')?majorAreaResult.city_id._id:majorAreaResult.city_id;
                                
                                newSublocationObj.parent_areas = [];
                                areaObj = {};
                                areaObj.area_id = majorAreaResult._id;
                                newSublocationObj.parent_areas.push(areaObj);

                                newSublocationObj.pincodes = [];
                                newSublocationObj.pincodes.push(sublocationDataObj[columns.pincode].trim())
                                newSublocationObj.name = sublocationDataObj[columns.sublocation].trim();
                                newSublocationObj.provider_id = provider_id._id;
                                newSublocationObj.description = sublocationDataObj[columns.description].trim();
                                newSublocationObj.type = "SL";
                                newSublocationObj.coordinates = {};
                                newSublocationObj.coordinates.lat = sublocationDataObj[columns.lat].trim();
                                newSublocationObj.coordinates.long = sublocationDataObj[columns.lon].trim();

                                var addSublocationObj = new ModelMajorArea(newSublocationObj)
                                addSublocationObj.save(function(e, addSublocationResult) {
                                   if (e) return nextfun({message: e.message + " at row number "+sublocationIndex});

                                    datastatus = ["New"];
                                    datastatus = datastatus.concat(logResult.data[sublocationIndex-1]);
                                    logResult.data[sublocationIndex-1] = datastatus;
                                    return nextfun();
                               });
                            };
                        });
                    }
                ], function(e){
                    if (e) {
                        logResult.error.push(e);
                        datastatus = ["Error"];
                        datastatus = datastatus.concat(logResult.data[sublocationIndex-1]);
                        logResult.data[sublocationIndex-1] = datastatus;
                        return nextSublocation();
                    };

                    return nextSublocation();
                });
            }, function(e){ 
                logResult.status = "Completed";
                ImportLog.update({ _id: logResult._id }, { $set: logResult }, function(e, logCount){
                    if (e) {
                        console.log("Error while update log");
                        console.log(e);
                    };

                    console.log("Competed");
                });
            });
        });
    };

    function addSublocation_old_will_Delete(data, req, next, callback) {
        if (req.user.provider_id) {
            if (!req.user.provider_id._id) return next(new Error("Provider Not Assigned"))
        };
        var errorLog = [];
        var date = new Date();

        var counterObj = {
            insertCount: 0,
            updateCount: 0,
            errorCount: 0
        }
        var sublocationCounter = 0;
        var columns = {
                majorarea: 0,
                sublocation: 1,
                description: 2,
                pincode: 3,
                lat: 4,
                lon: 5
            }
            // pass callback 
        callback(null, "Import starts")
        var searchObj = {};
        // console.log(data);
        async.eachSeries(data, function(obj, nextrow) {
            sublocationCounter++;
            if (sublocationCounter == 1) return nextrow()
            async.waterfall([
                // [ find majorarea]
                function(nextfun) {
                    console.log("majorarea")
                    searchObj = {}
                    searchObj["name"] = obj[columns.majorarea]
                    searchObj["provider_id"] = req.user.provider_id._id
                    ModelMajorArea.findOne(searchObj, function(error, result) {
                        if (error) {
                            errorLog.push("Error While Finding Record " + error + "Line " + sublocationCounter + " Date" + date.toDateString())
                            counterObj.errorCount++;
                            return nextrow();
                        }
                        if (result) {
                            return nextfun(null, result)
                        } else {
                            errorLog.push("MajorArea Not Found " + " " + "Line " + sublocationCounter + " Date" + date.toDateString())
                            counterObj.errorCount++;
                            return nextrow()
                        }

                    })
                },
                // [ add sublocation] 
                function(majorarea, nextfun) {
                    // pincode mandatory 
                    console.log("sublocation")
                    if (obj[columns.pincode].length == 0) {
                        errorLog.push("Pincode Not Presnet  " + " " + "Line " + sublocationCounter + " Date" + date.toDateString())
                        counterObj.errorCount++;
                        return nextrow();
                    };
                    if (obj[columns.lat].length == 0 || obj[columns.lon].length == 0) {
                        errorLog.push("Lat Or Long Not Present " + " " + "Line " + sublocationCounter + " Date" + date.toDateString())
                        counterObj.errorCount++;
                        return nextrow();
                    };
                    searchObj = {}
                    searchObj["name"] = obj[columns.sublocation]
                    searchObj["provider_id"] = req.user.provider_id._id
                    searchObj["type"] = "SL"
                    ModelMajorArea.findOne(searchObj, function(error, result) {
                        if (error) {
                            errorLog.push("Error While Sublocation Record " + error + "Line " + sublocationCounter + " Date" + date.toDateString())
                            counterObj.errorCount++;
                            return nextrow();
                        }
                        if (result) {
                            console.log("Update " + sublocationCounter)
                            result.city_id = majorarea.city_id._id
                            var areaObj = {
                                area_id: majorarea._id
                            };
                            result.parent_areas = areaObj;
                            result.pincodes = obj[columns.pincode]
                            result.name = obj[columns.sublocation]
                            result.provider_id = req.user.provider_id._id
                            result.description = obj[columns.description]
                            result.type = "SL"
                            result.coordinates.lat = obj[columns.lat]
                            result.coordinates.long = obj[columns.lon]
                            result.save(function(error, result) {
                                if (error) return nextrow();
                                console.log("update successfully");
                                counterObj.updateCount++;
                                return nextfun(null)
                            })
                        } else {
                            console.log("Add " + sublocationCounter);
                            var Obj = {}
                            searchObj["provider_id"] = req.user.provider_id._id
                            Obj["city_id"] = majorarea.city_id._id
                            Obj["parent_areas"] = [];
                            var areaObj = {
                                area_id: majorarea._id
                            };
                            Obj.parent_areas.push(areaObj)
                            Obj.pincodes = [];
                            Obj.pincodes.push(obj[columns.pincode])
                            Obj["name"] = obj[columns.sublocation]
                            Obj["provider_id"] = req.user.provider_id._id
                            Obj["description"] = obj[columns.description]
                            Obj["type"] = "SL"
                            Obj.coordinates = {}
                            Obj.coordinates["lat"] = obj[columns.lat]
                            Obj.coordinates["long"] = obj[columns.lon]
                            var addObj = new ModelMajorArea(Obj)
                            addObj.save(function(error, result) {
                                if (error) {
                                    counterObj.errorCount++;
                                    return nextrow();
                                }
                                if (result) {
                                    counterObj.insertCount++;
                                    return nextfun(null)
                                }
                            })
                        }
                    })

                }
            ], function(error) {
                if (error) {
                    errorLog.push("Error In Each" + error + "Line " + sublocationCounter + " Date" + date.toDateString())
                };
                return nextrow()
            })
        }, function(error) {
            if (error) return next(error)
                // console.log(errorLog);
                // return callback(null, counterObj)
        })
    }

    function importSublocation_not_in_use_will_Delete (data, req, next, callback) {
        try {
                if (req.user.provider_id) 
                    if (!req.user.provider_id._id) return next(new Error("Provider Not Present"))

                // var errorLog = [];
                
                var counterObj = {
                    insertCount: 0,
                    updateCount: 0,
                    errorCount: 0
                }

                var rowObj = {
                    rowCounter:0
                }
                
                var columns = {
                    majorarea: 0,
                    area: 1,
                    sublocation: 2,
                    description: 3,
                    pincode: 4,
                    lat: 5,
                    lon: 6
                }
                // pass callback 
                callback(null, "Import starts")

                async.eachSeries(data, function(obj, nextrow) {
                    console.log("----------BEFORE------------")
                    console.log(rowObj)
                    if (rowObj.action) delete rowObj.action;
                    if (rowObj.error) delete rowObj.error;                        
                    
                    rowObj.rowCounter++;
                    rowObj.rowData = obj;
                    console.log("+++++++++++AFTER++++++++++++")
                    console.log(rowObj)
                    if (rowObj.rowCounter == 1) return nextrow() //Header row
                    // pincode mandatory 
                    if (obj[columns.pincode].length == 0) {
                        // errorLog.push("Pincode Not Presnet  " + "Line: " + rowObj.rowCounter)
                        counterObj.errorCount++;
                        rowObj.action = "Failed";
                        rowObj.error = "Pincode Not Presnet  " + "Line: " + rowObj.rowCounter;
                        return nextrow();
                    };
                    // lat long mandatory 
                    if (obj[columns.lat].length == 0 || obj[columns.lon].length == 0) {
                        // errorLog.push("Lat Or Long Not Present " + "Line: " + rowObj.rowCounter)
                        counterObj.errorCount++;
                        rowObj.action = "Failed";
                        rowObj.error = "Lat Or Long Not Present " + "Line: " + rowObj.rowCounter;
                        return nextrow();
                    };

                    async.waterfall([
                        // [ find majorarea]
                        function(areaNextfun) {
                            searchObj = {}
                            searchObj["name"] = obj[columns.majorarea]
                            searchObj["provider_id"] = req.user.provider_id._id
                            console.log(searchObj)
                            ModelMajorArea.findOne(searchObj, function(error, result) {
                                if (error) {
                                    // errorLog.push("Error While Finding Record " + error + "Line: " + rowObj.rowCounter)
                                    counterObj.errorCount++;
                                    rowObj.action = "Failed";
                                    rowObj.error = "Error While Finding MajorArea " + error + "Line: " + rowObj.rowCounter;
                                    return nextrow();
                                }
                                if (result) {
                                    return areaNextfun(null, result)
                                } else {
                                    // errorLog.push("MajorArea Not Found " + " " + "Line: " + rowObj.rowCounter)
                                    counterObj.errorCount++;
                                    rowObj.action = "Failed";
                                    rowObj.error = "MajorArea Not Found " + " " + "Line: " + rowObj.rowCounter;
                                    return nextrow()
                                }

                            })
                        },
                        // [ add sublocation] 
                        function(majorarea, subLocationNextfun) {
                            searchObj = {}
                            searchObj["name"] = obj[columns.sublocation]
                            searchObj["provider_id"] = req.user.provider_id._id
                            searchObj["type"] = "SL"
                            ModelMajorArea.findOne(searchObj, function(error, result) {
                                if (error) {
                                    counterObj.errorCount++;
                                    rowObj.error = "Error While Finding Sublocation Record " + error + "Line: " + rowObj.rowCounter;
                                    rowObj.action = "Failed";
                                    return nextrow();
                                }
                                if (result) {
                                    result.city_id = majorarea.city_id._id
                                    var areaObj = {
                                        area_id: majorarea._id
                                    };
                                    result.parent_areas = areaObj;
                                    result.pincodes = obj[columns.pincode]
                                    result.name = obj[columns.sublocation]
                                    result.provider_id = req.user.provider_id._id
                                    result.description = obj[columns.description]
                                    result.coordinates.lat = obj[columns.lat]
                                    result.coordinates.long = obj[columns.lon]
                                    // result.save(function(error, result) {
                                    //     if (error) return nextrow();
                                    //     //console.log("update successfully");
                                    //     rowObj.action = "Update"
                                    //     counterObj.updateCount++;
                                    //     return subLocationNextfun(null)
                                    // })
                                } else {
                                    console.log("Add " + sublocationCounter);
                                    var Obj = {}
                                    searchObj["provider_id"] = req.user.provider_id._id
                                    Obj["city_id"] = majorarea.city_id._id
                                    Obj["parent_areas"] = [];
                                    var areaObj = {
                                        area_id: majorarea._id
                                    };
                                    Obj.parent_areas.push(areaObj)
                                    Obj.pincodes = [];
                                    Obj.pincodes.push(obj[columns.pincode])
                                    Obj["name"] = obj[columns.sublocation]
                                    Obj["provider_id"] = req.user.provider_id._id
                                    Obj["description"] = obj[columns.description]
                                    Obj["type"] = "SL"
                                    Obj.coordinates = {}
                                    Obj.coordinates["lat"] = obj[columns.lat]
                                    Obj.coordinates["long"] = obj[columns.lon]
                                    var addObj = new ModelMajorArea(Obj)
                                    // addObj.save(function(error, result) {
                                    //     if (error) {
                                    //         counterObj.errorCount++;
                                    //         rowObj.error = "Error While Saving New Sublocation Record " + error + "Line: " + rowObj.rowCounter;
                                    //         rowObj.action = "Failed";
                                    //         return nextrow();
                                    //     }
                                    //     if (result) {
                                    //         counterObj.insertCount++;
                                    //         rowObj.action = "Insert";
                                    //         return subLocationNextfun(null)
                                    //     }
                                    // })
                                }
                            })
                        }
                    ], function(error) {
                        if (error) {
                            rowObj.error = "Error In eachSeries: " + error + " Line: " + rowObj.rowCounter;
                        };
                        return nextrow()
                    })
                }, function(error) {
                    if (error) return next(error)
                        console.log("Next row");
                        // return callback(null, counterObj)
                })
        
        }
        catch(err) {
            // Block of code to handle errors
        }
    }

    function addClient(clientData, finalCallback) {
        if (!loggedinuser) return finalCallback(new Error("User not found"));
        if (!provider_id) return finalCallback(new Error("Provider not found"));
        if (!clientData) return finalCallback(new Error("Data not found"));
        if (!clientData.length) return finalCallback(new Error("Data is empty"));

        var partnerclient = {};
        var partnerclientaddress = {};
        var salutationoptions = [];
        var addresstypeoptions = [];
        var salutationFound = -1;
        var addressFound = -1;
        var tempalternetnumber = [];
        var name_string = "";
        var searchObj = {};
        
        var log = {};
        var searchtube = {};
        log = {
            status: "Inprogress", 
            provider_id: provider_id._id,
            user_id: loggedinuser._id,
            file: fileOriginalname,  
            collectionname: "Patient Collection",
            error: [],
            data: [],
            result: [],
            datetime: new Date()
        };

        var columns = {};
        var tempcolumns = [
            'uhid',
            'partnername',
            'salutation',
            'firstname',
            'middlename',
            'lastname',
            'gender',
            'dob',
            'age',
            'agetype',
            'mobilenumber',
            'alternetnumber',
            'email',
            'addresstype',
            'slotarea',
            'sublocation',
            'wing', 
            'flatno',
            'floor',
            'plotno',
            'sectorno',
            'building_bunglow',
            'street',
            'landmark'
        ];
        tempcolumns.forEach(function(o, index){
            columns[o] = index;
        });

        //Finding # of columns
        if (clientData && clientData[0]) {
            var tempclientData = clientData[0];
            var tempclientDataIndex = 0;
            tempclientData.forEach(function(o){
                if (o && o.length) {
                    tempclientDataIndex += 1;
                };
            });
            if (tempcolumns.length != tempclientDataIndex) {
                return finalCallback(new Error("Columns are missing"));
            };
        }else{
            return finalCallback(new Error("Columns are missing"));
        };

        finalCallback(null, "Import Started");

        async.waterfall([
            //Finding Salutaion Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "Salutations" }, null, { lean: true }, function(e, salutationoption){
                    if (e) return outerfun(e);
                    if (!salutationoption) return outerfun(new Error("Salutation not found"));
                    if (!salutationoption._id) return outerfun(new Error("Salutation ID not found"));

                    return outerfun(null, salutationoption);
                });
            },
            //Finding Salutaion List
            function(salutationoption, outerfun){
                ModelOptionMaster.find({ "parent_id": salutationoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, salutationList){
                    if (e) return outerfun(e);
                    if (!salutationList) return outerfun(new Error("Salutations not found"));
                    if (!salutationList.length) return outerfun(new Error("Salutations not found"));

                    salutationoptions = salutationList;

                    return outerfun();
                });
            },
            //Finding AddressType Master
            function(outerfun){
                ModelOptionMaster.findOne({ name: "AddressType" }, null, { lean: true }, function(e, addresstypeoption){
                    if (e) return outerfun(e);
                    if (!addresstypeoption) return outerfun(new Error("Address type not found"));
                    if (!addresstypeoption._id) return outerfun(new Error("Address type ID not found"));

                    return outerfun(null, addresstypeoption);
                });
            },
            //Finding AddressType List
            function(addresstypeoption, outerfun){
                ModelOptionMaster.find({ "parent_id": addresstypeoption._id, _Deleted: false }, { "displayname": 1 }, { lean: true }, function(e, addresstypeList){
                    if (e) return outerfun(e);
                    if (!addresstypeList) return outerfun(new Error("Address type list not found"));
                    if (!addresstypeList.length) return outerfun(new Error("Address type list not found"));

                    addresstypeoptions = addresstypeList;

                    return outerfun();
                });
            },
        ], function(e){
            if (e) return false;

            saveLog(log, function(e, logResult){
                if (e) {
                    console.log("Error in log");
                    console.log(e);
                };

                var clientIndex = 0;
                var datastatus = [];
                async.eachSeries(clientData, function(clientDataObj, nextClient){
                    logResult.data.push(clientDataObj);
                    clientIndex += 1;
                    //Checking, is this first row of excel sheet, if yes then return for the next row of excel sheet
                    if (clientIndex == 1) {
                        datastatus = ["Status"];
                        datastatus = datastatus.concat(logResult.data[clientIndex-1]);
                        logResult.data[clientIndex-1] = datastatus;
                        return nextClient();
                    }

                    partnerclient = {};
                    partnerclient.demography = {};
                    partnerclient.demography.addresses = [];
                    partnerclientaddress = {};
                    salutationFound = -1;
                    tempalternetnumber = [];

                    async.waterfall([
                        function(nextfun){ 
                            if (!clientDataObj[columns.partnername]) return nextfun({message:"Partnername not found at row number "+clientIndex});
                            if (!clientDataObj[columns.partnername].length) return nextfun({message:"Partnername not found at row number "+clientIndex});
                            
                            if (!clientDataObj[columns.salutation]) return nextfun({message:"Salutation not found at row number "+clientIndex});
                            if (!clientDataObj[columns.salutation].length) return nextfun({message:"Salutation not found at row number "+clientIndex});
                            
                            if (!clientDataObj[columns.firstname]) return nextfun({message:"First name not found at row number "+clientIndex});
                            if (!clientDataObj[columns.firstname].length) return nextfun({message:"First name not found at row number "+clientIndex});
                            
                            if (!clientDataObj[columns.lastname]) return nextfun({message:"Last name not found at row number "+clientIndex});
                            if (!clientDataObj[columns.lastname].length) return nextfun({message:"Last name not found at row number "+clientIndex});
                            
                            if (!clientDataObj[columns.age]) return nextfun({message:"Age not found at row number "+clientIndex});
                            if (!clientDataObj[columns.age].length) return nextfun({message:"Age not found at row number "+clientIndex});
                            
                            if (!clientDataObj[columns.agetype]) return nextfun({message:"Age type not found at row number "+clientIndex});
                            if (!clientDataObj[columns.agetype].length) return nextfun({message:"Age type not found at row number "+clientIndex});

                            if (!clientDataObj[columns.mobilenumber]) return nextfun({message:"Mobile number not found at row number "+clientIndex});
                            if (!clientDataObj[columns.mobilenumber].length) return nextfun({message:"Mobile number not found at row number "+clientIndex});

                            if (!clientDataObj[columns.gender]) return nextfun({message:"Gender not found at row number "+clientIndex});
                            if (!clientDataObj[columns.gender].length) return nextfun({message:"Gender not found at row number "+clientIndex});
                             
                            //Get salutation from salutationoptions list by name
                            salutationFound = _.find(salutationoptions, function(o) { return o.displayname.toUpperCase() == clientDataObj[columns.salutation].trim().toUpperCase(); });
                            if (!salutationFound) return nextfun({message:"Salutation ("+ clientDataObj[columns.salutation].trim() +") not found at row number "+clientIndex});
                            partnerclient.demography.salutation = salutationFound.displayname;

                            if (!clientDataObj[columns.addresstype]) return nextfun({message:"Address type not found at row number "+clientIndex});
                            if (!clientDataObj[columns.addresstype].length) return nextfun({message:"Address type not found at row number "+clientIndex});

                            //Get addresstype from addresstypeoptions list by name
                            addressFound = _.find(addresstypeoptions, function(o) { return o.displayname.toUpperCase() == clientDataObj[columns.addresstype].trim().toUpperCase(); });
                            if (!addressFound) return nextfun({message:"Address type ("+ clientDataObj[columns.addresstype].trim() +") not found at row number "+clientIndex});
                            partnerclientaddress.title = addressFound.displayname;

                            if (!clientDataObj[columns.slotarea]) return nextfun({message:"Slot area not found at row number "+clientIndex});
                            if (!clientDataObj[columns.slotarea].length) return nextfun({message:"Slot area not found at row number "+clientIndex});

                            if (!clientDataObj[columns.building_bunglow]) return nextfun({message:"Building bunglow not found at row number "+clientIndex});
                            if (!clientDataObj[columns.building_bunglow].length) return nextfun({message:"Building bunglow not found at row number "+clientIndex});

                            if (!clientDataObj[columns.landmark]) return nextfun({message:"Landmark not found at row number "+clientIndex});
                            if (!clientDataObj[columns.landmark].length) return nextfun({message:"Landmark not found at row number "+clientIndex});

                            return nextfun();
                        },
                        //Get partner from db by name
                        function(nextfun){ 
                            ModelPartner.findOne({ "info.name": new RegExp(clientDataObj[columns.partnername].trim(),'i') }, null, { lean: true }, function(e, partnerResult){
                                if (e) return nextfun(e);
                                if (!partnerResult) return nextfun({message:"Partner ("+ clientDataObj[columns.partnername].trim() +") not found at row number "+clientIndex});
                                if (!partnerResult._id) return nextfun({message:"Partner ID for ("+ clientDataObj[columns.partnername].trim() +") not found at row number "+clientIndex});
                                if (!partnerResult.provider_id) return nextfun({message:"Provider ID for patient ("+ clientDataObj[columns.partnername].trim() +") not found at row number "+clientIndex});

                                partnerclient.partner_id = partnerResult._id;
                                partnerclient.provider_id = partnerResult.provider_id;
                                return nextfun();
                            });
                        },
                        /*function(nextfun){
                            //Get salutation list from db by name
                            salutationFound = _.find(salutationoptions, ['displayname', clientDataObj[columns.salutation].trim() ] );

                            if (salutationFound < 0) return nextfun({message:"Salutation ("+ clientDataObj[columns.salutation].trim() +") not found at row number "+clientIndex});
                            return nextfun();
                        },
                        */
                        //split alternet number
                        function(nextfun){
                            clientDataObj[columns.alternetnumber] = clientDataObj[columns.alternetnumber].toString();
                            if (!clientDataObj[columns.alternetnumber]) return nextfun();
                            if (!clientDataObj[columns.alternetnumber].length) return nextfun();

                            tempalternetnumber = clientDataObj[columns.alternetnumber].split("|");
                            if (!tempalternetnumber.length) return nextfun();
                            
                            partnerclient.demography.altnumber = tempalternetnumber
                            return nextfun();
                        },
                        //Age type
                        function(nextfun){
                            if (clientDataObj[columns.agetype].toUpperCase() == "YEARS") {
                                partnerclient.demography.agetype = clientDataObj[columns.agetype].toUpperCase();
                                return nextfun();
                            }else if (clientDataObj[columns.agetype].toUpperCase() == "MONTHS") { 
                                if (parseInt(clientDataObj[columns.age]) < 12) {
                                    partnerclient.demography.agetype = clientDataObj[columns.agetype].toUpperCase();
                                    return nextfun();
                                }else{
                                    return nextfun({message:"Age type is MONTHS, age should be less than or equal to 12. Error found at row number "+clientIndex});
                                };
                            }else if (clientDataObj[columns.agetype].toUpperCase() == "DAYS") {
                                if (parseInt(clientDataObj[columns.age]) < 31) {
                                    partnerclient.demography.agetype = clientDataObj[columns.agetype].toUpperCase();
                                    return nextfun();
                                }else{
                                    return nextfun({message:"Age type is DAYS, age should be less than or equal to 31. Error found at row number "+clientIndex});
                                };
                            }else{ 
                                return nextfun({message:"Age type ("+ clientDataObj[columns.agetype].trim() +") not found at row number "+clientIndex});
                            };
                        },
                        //Gender
                        function(nextfun){
                            partnerclient.demography.gender = "";
                            if (clientDataObj[columns.gender].toUpperCase() == "MALE") {
                                partnerclient.demography.gender = clientDataObj[columns.gender].toLocaleLowerCase();
                            };
                            if (clientDataObj[columns.gender].toUpperCase() == "FEMALE") {
                                partnerclient.demography.gender = clientDataObj[columns.gender].toLocaleLowerCase();
                            };
                            if (clientDataObj[columns.gender].toUpperCase() == "THIRDGENDER") {
                                partnerclient.demography.gender = clientDataObj[columns.gender].toLocaleLowerCase();
                            };

                            if (!partnerclient.demography.gender.length) {
                                return nextfun({message:"Gender ("+ clientDataObj[columns.gender].trim() +") not found at row number "+clientIndex});
                            }else{
                                return nextfun();
                            };
                        },
                        //Get slot area from db by name
                        function(nextfun){
                            name_string = "";
                            name_string = clientDataObj[columns.slotarea].trim();
                            name_string = name_string.replace(/[(]/g,"\\(");
                            name_string = name_string.replace(/[)]/g,"\\)");
                            name_string = name_string.replace(/[&]/g,"\\&");
                            
                            searchObj = {};
                            searchObj["name"] = { "$regex" : name_string, "$options" : "iu"};
                            searchObj["type"] = "MA";
                            
                            ModelMajorArea.findOne(searchObj, null, { lean: true }, function(e, slotareaResult){
                                if (e) return nextfun(e);

                                if (!slotareaResult) return nextfun({message:"Slot area ("+ clientDataObj[columns.slotarea].trim() +") not found at row number "+clientIndex});
                                if (!slotareaResult._id) return nextfun({message:"Slot area ID for ("+ clientDataObj[columns.slotarea].trim() +") not found at row number "+clientIndex});
                                
                                partnerclientaddress.area_id = slotareaResult._id;
                                return nextfun();
                            });
                        },
                        //Get sublocation from db by name
                        function(nextfun){
                            name_string = "";
                            name_string = clientDataObj[columns.sublocation].trim();
                            name_string = name_string.replace(/[(]/g,"\\(");
                            name_string = name_string.replace(/[)]/g,"\\)");
                            name_string = name_string.replace(/[&]/g,"\\&");
                            
                            searchObj = {};
                            searchObj["name"] = { "$regex" : name_string, "$options" : "iu"};
                            searchObj["type"] = "SL";

                            ModelMajorArea.findOne(searchObj, null, { lean: true }, function(e, sublocationResult){
                                if (e) return nextfun(e);
                                if (!sublocationResult) return nextfun({message:"Sub location ("+ clientDataObj[columns.sublocation].trim() +") not found at row number "+clientIndex});
                                if (!sublocationResult._id) return nextfun({message:"Sub location ID for ("+ clientDataObj[columns.sublocation].trim() +") not found at row number "+clientIndex});
                                if (!sublocationResult.pincodes) return nextfun({message:"Sub location pincodes for ("+ clientDataObj[columns.sublocation].trim() +") not found at row number "+clientIndex});
                                if (!sublocationResult.pincodes.length) return nextfun({message:"Sub location pincodes for ("+ clientDataObj[columns.sublocation].trim() +") not found at row number "+clientIndex});
                                if (!sublocationResult.city_id) return nextfun({message:"Sub location city for ("+ clientDataObj[columns.sublocation].trim() +") not found at row number "+clientIndex});
                                
                                partnerclientaddress.sublocation_id = sublocationResult._id;
                                partnerclientaddress.pincode = sublocationResult.pincodes[0];
                                partnerclientaddress.city_id = (typeof sublocationResult.city_id == 'object')?sublocationResult.city_id._id:sublocationResult.city_id;
                                return nextfun();
                            });
                        },
                        function(nextfun){ 
                            partnerclient.demography.firstname = clientDataObj[columns.firstname].trim();
                            partnerclient.demography.middlename = clientDataObj[columns.middlename].trim();
                            partnerclient.demography.lastname = clientDataObj[columns.lastname].trim();

                            partnerclient.demography.fullname = "";
                            partnerclient.demography.fullname += partnerclient.demography.firstname.trim() + " ";
                            if (partnerclient.demography.middlename & partnerclient.demography.middlename.length) {
                                partnerclient.demography.fullname += partnerclient.demography.middlename.trim() + " ";
                            };
                            partnerclient.demography.fullname += partnerclient.demography.lastname.trim();

                            partnerclient.demography.age = clientDataObj[columns.age].trim();

                            if (clientDataObj[columns.dob] && clientDataObj[columns.dob].length) {
                                partnerclient.demography.assumeddob = false;
                                partnerclient.demography.dob = new Date(clientDataObj[columns.dob].trim());

                                if (partnerclient.demography.dob == "Invalid Date") {
                                    return nextfun({message:"DOB ("+ clientDataObj[columns.dob].trim() +") is in-valid date format at row number "+clientIndex});
                                };
                            }else{
                                partnerclient.demography.assumeddob = true;

                                if (partnerclient.demography.agetype == "YEARS") {
                                    var tempDOB = moment().subtract(partnerclient.demography.age, 'years');
                                    tempDOB = tempDOB.startOf('year');    
                                }else if (partnerclient.demography.agetype == "MONTHS") { 
                                    var tempDOB = moment().subtract(partnerclient.demography.age, 'month');
                                    tempDOB = tempDOB.startOf('month');
                                }else if (partnerclient.demography.agetype == "DAYS") {
                                    var tempDOB = moment().subtract(partnerclient.demography.age, 'day');
                                    tempDOB = tempDOB.startOf('day');
                                };

                                partnerclient.demography.dob = new Date(tempDOB);

                                if (partnerclient.demography.dob == "Invalid Date") {
                                    return nextfun({message:"Calculated DOB is in-valid date format at row number "+clientIndex});
                                };
                            };
                            
                            if (clientDataObj[columns.mobilenumber])
                                partnerclient.demography.mobilenumber = clientDataObj[columns.mobilenumber].trim();
                            if (clientDataObj[columns.email])
                                partnerclient.demography.email = clientDataObj[columns.email].trim();
                            if (clientDataObj[columns.uhid])
                                partnerclient.externalId = clientDataObj[columns.uhid].trim();
                            
                            if (clientDataObj[columns.wing])
                                partnerclientaddress.wing = clientDataObj[columns.wing].trim();
                            if (clientDataObj[columns.flatno])
                                partnerclientaddress.flatno = clientDataObj[columns.flatno].trim();
                            if (clientDataObj[columns.floor])
                                partnerclientaddress.floor = clientDataObj[columns.floor].trim();
                            if (clientDataObj[columns.plotno])
                                partnerclientaddress.plotno = clientDataObj[columns.plotno].trim();
                            if (clientDataObj[columns.sectorno])
                                partnerclientaddress.sectorno = clientDataObj[columns.sectorno].trim();
                            if (clientDataObj[columns.building_bunglow])
                                partnerclientaddress.building = clientDataObj[columns.building_bunglow].trim();
                            if (clientDataObj[columns.street])
                                partnerclientaddress.streetname = clientDataObj[columns.street].trim();
                            if (clientDataObj[columns.landmark])
                                partnerclientaddress.landmark = clientDataObj[columns.landmark].trim();

                            //Building address string
                            partnerclientaddress.address = "";
                            if(partnerclientaddress.wing)
                              partnerclientaddress.address = partnerclientaddress.wing;

                            if(partnerclientaddress.flatno){
                              if(partnerclientaddress.wing)
                                partnerclientaddress.address += ", "+ partnerclientaddress.flatno;
                              else
                                partnerclientaddress.address = partnerclientaddress.flatno;
                            }

                            if(partnerclientaddress.floor){
                              if(partnerclientaddress.flatno || partnerclientaddress.wing)
                                    partnerclientaddress.address += ", FLOOR NO. " + partnerclientaddress.floor;
                              else
                                partnerclientaddress.address = "FLOOR NO. " + partnerclientaddress.floor;
                            };

                            if(partnerclientaddress.building){  
                              if(partnerclientaddress.flatno || partnerclientaddress.wing || partnerclientaddress.floor)
                                    partnerclientaddress.address += ", "+ partnerclientaddress.building;
                              else
                                partnerclientaddress.address = partnerclientaddress.building;
                            };

                            if(partnerclientaddress.plotno)
                              partnerclientaddress.address += ", PLOT NO. " + partnerclientaddress.plotno;
                            if(partnerclientaddress.sectorno)
                              partnerclientaddress.address += ", SECTOR NO. " + partnerclientaddress.sectorno;
                            if(partnerclientaddress.streetname)
                              partnerclientaddress.address += ", " + partnerclientaddress.streetname;
                            if(partnerclientaddress.landmark)
                              partnerclientaddress.address += ", " + partnerclientaddress.landmark;

                            partnerclient.demography.addresses = [];
                            partnerclient.demography.addresses.push(partnerclientaddress);

                            return nextfun();
                        }
                    ], function(e){
                        if (e) {
                            logResult.error.push(e);
                            datastatus = ["Error"];
                            datastatus = datastatus.concat(logResult.data[clientIndex-1]);
                            logResult.data[clientIndex-1] = datastatus;
                            return nextClient();
                        };
                        //Get Client by name

                        searchObj = {}
                        searchObj["demography.firstname"] = partnerclient.demography.firstname;
                        searchObj["demography.lastname"] = partnerclient.demography.lastname;
                        searchObj["provider_id"] = partnerclient.provider_id;
                        searchObj["partner_id"] = partnerclient.partner_id;

                        ModelClient.findOne(searchObj, null, { lean: true }, function(e, clientResult){
                            if (e) return nextClient(e);
                            
                            if (clientResult) {
                                //Update record 
                                ModelClient.update({ _id: clientResult._id}, { $set: clientResult }, function(e, partnerCount){ 
                                    
                                    datastatus = ["Update"];
                                    datastatus = datastatus.concat(logResult.data[clientIndex-1]);
                                    logResult.data[clientIndex-1] = datastatus;
                                    return nextClient();
                                });
                            }else{ 
                                var partnerclientParse = ModelClient(partnerclient);
                                partnerclientParse.save(function(e, saveResult){
                                    
                                    datastatus = ["New"];
                                    datastatus = datastatus.concat(logResult.data[clientIndex-1]);
                                    logResult.data[clientIndex-1] = datastatus;
                                    return nextClient();
                                });
                            };
                        });
                    });
                }, function(e){ 
                    logResult.status = "Completed";
                    ImportLog.update({ _id: logResult._id }, { $set: logResult }, function(e, logCount){
                        if (e) {
                            console.log("Error while update log");
                            console.log(e);
                        };

                        console.log("Competed");
                    });
                });
            });
        });
    };
