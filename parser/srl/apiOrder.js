var mongoose = require('mongoose');
var Model = require('../../models/Order');
var ModelClient = require('../../models/Client');
var ModelMasterTest = require('../../models/Service');
var ModelTube = require('../../models/Tube');
var async = require('async');
var moment = require("moment");

// method to add order from open API
exports.apiAdd = function(req, res, next) {
    var data = req.body;
    var masterservices, tubes, orderObj = {}, client_id, addresses = [],
        addressObj = {}, provider_id = req.user.provider_id;

    if (!data.MOBILE) return res.status(411).json({
        error: "please send MOBILE"
    });
    if (!data.PTNT_CD) return res.status(411).json({
        error: "please send PTNT_CD"
    });

    if (data.TEST_LIST) masterservices = data.TEST_LIST.split(',');
    if (data.SPECIMENS) tubes = data.SPECIMENS.split(',');

    async.waterfall([
            // //function for patient details
            function(nextfunc) {
                var searchClient = {
                    clientcode: data.PTNT_CD,
                    provider_id: provider_id
                }

                ModelClient.findOne(searchClient, function(err, resultClient) {
                    if (err) return res.status(420).json({
                        error: "error while finding patient"
                    });                    

                    if (!resultClient) {
                        resultClient = {};
                        resultClient["clientcode"] = data.PTNT_CD;
                        resultClient["provider_id"] = provider_id;
                        resultClient["demography.salutation"] = data.PTNT_TITLE;
                        resultClient["demography.fullname"] = data.FIRST_NAME + " " + data.LAST_NAME;
                        resultClient["demography.mobilenumber"] = data.MOBILE; //ToDo need to check with SRL
                        
                        if (data.PTNT_GNDR == "F")
                            resultClient["demography.gender"] = "female";

                        else if (data.PTNT_GNDR == "M")
                            resultClient["demography.gender"] = "male";

                        //var city_id = data.CITY //get it from DB city external ID
                        // addresses.push(addressObj);
                        // resultClient["demography.addresses"] = addresses;

                        //Adding new client
                        var mongooseClientObj = new ModelClient(resultClient)
                        mongooseClientObj.save(function(err, result) {
                            if (err) return res.status(420).json({
                                error: "error while saving patient"
                            });

                            console.log(result._id);    
                            client_id = result._id
                            return nextfunc(null);
                        });
                    } else {
                        resultClient.demography.salutation = data.PTNT_TITLE;
                        resultClient.demography.fullname = data.FIRST_NAME + " " + data.LAST_NAME;
                        resultClient.demography.mobilenumber = data.MOBILE; //ToDo need to check with SRL

                        if (data.PTNT_GNDR == "F")
                            resultClient.demography.gender = "female";

                        else if (data.PTNT_GNDR == "M")
                            resultClient.demography.gender = "male";

                        //var city_id = data.CITY //get it from DB city external ID

                        addressObj = {
                            type: "Home",
                            address: data.ADDRESS1 + data.ADDRESS2,
                            landmark: data.LAND_MARK,
                            address2: "City: " + data.CITY + " State: " + data.STATE + " Country: " + data.COUNTRY,
                            pincode: data.ZIP
                        }

                        //addresses.push(addressObj);
                        resultClient.demography.addresses.push(addressObj);

                        console.log("updating");
                        console.log(resultClient);
                        //Updating existing client
                        resultClient.save(function(err, result) {
                            if (err) return res.status(420).json({
                                error: "error while saving patient"
                            });

                            console.log(result._id);    
                            client_id = result._id
                            return nextfunc(null);
                        });
                    }                   
                    
                });                
            },
            //function to find tube ids
            function(nextfunc) {
                console.log(tubes);
                if(tubes){
                    var searchTube = {
                        externalId: {$in: tubes}
                    }
                    ModelTube.find(searchTube, {lean: true},function(err, resulttubes) {
                        if (err) return res.status(420).json({
                            error: "error while getting tubes" + err
                        });

                        if (resulttubes) {
                            orderObj.tubes = [];
                            resulttubes.forEach(function(tubeObj) {
                                orderObj.tubes.push(tubeObj._id);
                            });
                            return nextfunc(null);                            
                        }

                    });    
                }
            },

            // function to find test ids
            function(nextfunc) {
                if (masterservices) {
                    var searchTest = {                        
                        externalId: {$in: masterservices}
                    }

                    ModelMasterTest.find(searchTest, {lean: true},function(err, resulttests) {
                        if (err) return res.status(420).json({
                            error: "error while getting tests"
                        });

                        if (resulttests) {
                            orderObj.masterservices = [];
                            resulttests.forEach(function(testObj) {
                                var tempObj = {
                                    service_id: testObj._id
                                }
                                orderObj.masterservices.push(tempObj);
                            });
                            return nextfunc(null);
                        }
                    });  
                };                
            },

            //function to make order object
            function(nextfunc) {
                //console.log(req.user)
                orderObj["provider_id"] = provider_id;
                orderObj["externalId"] = data.ORDER_NO;

                orderObj["client_id"] = client_id;
                orderObj["status"] = "Unassigned";
                orderObj["fromdate"] = data.COLL_DATE_FROM;
                orderObj["todate"] = data.COLL_DATE_FROM;
                
                //Time calculation
                var hourMinutes = parseInt(moment(data.COLL_DATE_FROM).get('hour'))*60;
                var minutes = parseInt(moment(data.COLL_DATE_FROM).get('minute'));
                if (minutes > 15 && minutes <=45)  hourMinutes = hourMinutes + 30;
                if (minutes > 45)  hourMinutes = hourMinutes + 60;
                orderObj["fromtime"] = hourMinutes;
                

                //payment details
                orderObj["paymentdetails"] = {};
                orderObj["paymentdetails"].amount = data.GROSS_AMT;
                orderObj["paymentdetails"].discount = data.DISCOUNT;
                orderObj["paymentdetails"].promocode = data.PROMOCODE;
                
                orderObj["paymentdetails"].paid = false;
                if (data.PAYMENT_MADE == "Y")
                    orderObj["paymentdetails"].paid = true;

                orderObj["comments"] = [];
                orderObj["comments"].push(data.REMARKS);

                //Adding address in Comments
                addressObj = "Address1: "+ data.ADDRESS1 + "\n Address2: "+ data.ADDRESS2 + "\n Landmark: "+ data.LAND_MARK + "\n City: " + data.CITY +  " ZIP: "+ data.ZIP + " State: " + data.STATE + " Country: " + data.COUNTRY;
                orderObj["comments"].push(addressObj);

                mongooseOrderObj = new Model(orderObj);
                mongooseOrderObj.save(function (err, result) {
                    if (err) return res.status(411).json({error:"Something went wrong while creating order"});
                    orderObj["_id"] = result._id;
                    return nextfunc(null);   
                });
            }
        ],
        function(e) {
            if (e) return res.status(411).json({
                error:"Something went wrong: " + e
            })

            return res.json({
                order: orderObj
            })
        });   
}
