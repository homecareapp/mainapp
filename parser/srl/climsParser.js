var ModelOrder = require('../../models/Order');
var async = require('async')
var moment = require('moment-timezone');
var request = require('request');
var climsUrl = require('../../config/secrets.js');
var ModelhooksLogs = require('../../models/HooksLog')
var hooksLogs = require('../../controllers/hookslogs')
var http = require("http")
var populateQuery = [{
    path: 'client_id'
}, {
    path: 'area_id'
}, {
    path: 'servicedeliveryaddress.area_id'
}, {
    path: 'servicedeliveryaddress.city_id'
}, {
    path: 'partner_id'
}, {
    path: 'services.service_id'
}, {
    path: 'assignby'
}, {
    path: 'assignto'
}, {
    path: 'masterservices.service_id'
}, {
    path: 'createdby'
}];
exports.makeClimsEntry = function(data, action, callback) {
    // console.log("making request from parser");
    ModelOrder.findById(data._id, function(error, orderResult) {
        if (error) return callback(error)
        generateJson(orderResult, action, function(error, json) {
            // console.log("into climsa");
            if (error) callback(error)
            return callback(null, json)
        })
    }).populate(populateQuery).select('')
}

function generateJson(data, action, callbackJson) {
    // **** ALL 41 ATTRIBUTE ARE REQUIRED TO MAKE ENTRY INTO CLIMS DATABASE
    // SO ALL ATTRIBUTE PLACED INSIDE IF CONDITION INCASE DATA NOT PRESENT PASS EMPTY STRING TO MAKE ENTRY INTO CLIMS DATABASE
    var Json = {};
    if (action == "add") {
        Json.FLAG = "I"
        data.client_id == null ? Json.PTNT_CD = "" : Json.PTNT_CD = (data.client_id.clientcode) ? data.client_id.clientcode.toUpperCase() : ""
        Json.ORDERID = ""
        Json.PHLEBO_ID = ""
        if (data.assignto == null) {
            Json.PHLEBO_ID = ""
        } else {
            if (data.assignto.profile.code) {
                Json.PHLEBO_ID = data.assignto.profile.code.toUpperCase()
                    //
            } else {
                Json.PHLEBO_ID = ""
            }
        }
    }
    if (action == "update") {
        Json.FLAG = "U"
        data.externalId ? Json.ORDERID = data.externalId.toUpperCase() : Json.ORDERID = ""
        data.client_id == null ? Json.PTNT_CD = "" : Json.PTNT_CD = (data.client_id.clientcode)?data.client_id.clientcode.toUpperCase():""
            // data.assignto == null ? Json.PHLEBO_ID = "" : Json.PHLEBO_ID = data.assignto.externalId
        if (data.assignto == null) {
            Json.PHLEBO_ID = ""
        } else {
            if (data.assignto.profile.code) {
                Json.PHLEBO_ID = data.assignto.profile.code.toUpperCase()
            } else {
                Json.PHLEBO_ID = ""
            }
        }
        if (data.assignto == null) {
            Json.PHLEBO_ID = ""
        } else {
            if (data.assignto.profile.code) {
                Json.PHLEBO_ID = data.assignto.profile.code.toUpperCase()
            } else {
                Json.PHLEBO_ID = ""
            }
        }
    }
    var hour = Math.floor(parseInt(data.fromtime) / 60);
    var remainder = parseInt(data.fromtime) % 60;
    if (remainder == 0) remainder = "00"
    if (remainder == 15) remainder = "15"
    if (remainder == 30) remainder = "30"
    if (remainder == 45) remainder = "45"
    var finalTime = hour + ":" + remainder;
    data.orderId ? Json.INCIDENT_NO = data.orderId.toUpperCase() : Json.INCIDENT_NO = ""
        // @abs [ as discuss Json.PTNT_LNM not required  ]
    if (data.client_id) {
        if (data.client_id.demography) {
            Json.TITLE = ( data.client_id.demography.salutation )?data.client_id.demography.salutation.toUpperCase():""
            data.client_id.demography.assumeddob == true ? Json.DOB_ACT_FLG = "Y" : Json.DOB_ACT_FLG = "N"
            if(data.client_id.demography.firstname)
                Json.PTNT_FNM = data.client_id.demography.firstname.toUpperCase()
            if(data.client_id.demography.lastname)
                Json.PTNT_LNM = data.client_id.demography.lastname.toUpperCase()
            data.client_id.demography.gender == "female" ? Json.PTNT_GNDR = "F" : Json.PTNT_GNDR = "M"
            Json.COLL_CONTACT1 = data.client_id.demography.mobilenumber
            data.client_id.demography.email ? Json.EMAILID = data.client_id.demography.email.toUpperCase() : Json.EMAILID = ""
        } else {
            Json.TITLE = ""
            Json.DOB_ACT_FLG = ""
            Json.PTNT_FNM = ""
            Json.PTNT_LNM = ""
            Json.PTNT_GNDR = ""
            Json.COLL_CONTACT1 = ""
            Json.EMAILID = ""
        }
    } else {
        Json.TITLE = ""
        Json.DOB_ACT_FLG = ""
        Json.PTNT_FNM = ""
        Json.PTNT_LNM = ""
        Json.PTNT_GNDR = ""
        Json.COLL_CONTACT1 = ""
        Json.EMAILID = ""
        Json.INCIDENT_NO = ""
    }
    if (data.servicedeliveryaddress) {
        Json.ADDRESS1 = data.servicedeliveryaddress.address.toString().toUpperCase()
        Json.LOCATION = data.servicedeliveryaddress.area_id.name.toString().toUpperCase()
        if (data.servicedeliveryaddress.landmark) {
            Json.LANDMARK = data.servicedeliveryaddress.landmark.toString().toUpperCase()
        } else {
            Json.LANDMARK = ""
        }
        Json.CITY = data.servicedeliveryaddress.city_id.name.toString().toUpperCase()
        Json.ZIP = data.servicedeliveryaddress.pincode || ""
    } else {
        Json.ADDRESS1 = ""
        Json.LOCATION = ""
        Json.LANDMARK = ""
        Json.CITY = ""
        Json.ZIP = ""
    }
    // @abs [ if order is cancel set CANCEL_FLAG="Y" else CANCEL_FLAG="Y" ]  cancelled_flag
    if (data.status == "Cancelled") {
        Json.CANCELLED_FLAG = "Y"
    } else {
        Json.CANCELLED_FLAG = "N"
    }
    //  [ need to change for testing its hardcoded ]
    Json.STATE = "MAHARASHTRA"
    Json.COUNTRY = "INDIA"
        //End
    Json.COLL_CONTACT2 = ""
        //  [ need to change for testing its hardcoded ]
    Json.DOCTOR = ""
        //end()
    Json.HOMECOLL_TYPE = ""
        //  [ need to check ]
    Json.HARD_COPY = "N"
        //  [ need to check ]
    if (data.partner_id != null) {
        if (data.partner_id.externalId) {
            Json.PARTY_ID = data.partner_id.externalId.toString().toUpperCase()
        } else {
            Json.PARTY_ID = ""
        }
    } else {
        Json.PARTY_ID = ""
    }
    // data.partner_id == null ? Json.PARTY_ID = "" : Json.PARTY_ID = data.partner_id.externalId
    if (data.paymentdetails) {
        if (data.paymentdetails.amount) {
            Json.GROSS_AMT = data.paymentdetails.amount.toString()
        } else {
            Json.GROSS_AMT = ""
        }
        if (data.paymentdetails.visitingcharges) {
            Json.HOMECOLL_AMNT = data.paymentdetails.visitingcharges.toString()
        } else {
            Json.HOMECOLL_AMNT = ""
        }
    } else {
        Json.GROSS_AMT = ""
        Json.HOMECOLL_AMNT = ""
    }


    Json.TESTS = ""
    Json.TEST_AMNTS = ""
        // incase the GROSS_AJNT is 0 because while update no paymentdetails.amount pass therefore temp variable to get correct GROSS_AMT
        // if (Json.GROSS_AMT == 0) {
        //     Json.GROSS_AMT = tempTotalAmount.toString()
        // };
        // Json.FLAG = "I"
        // @ [ need clarification done]
        // Json.PTNT_CD = ""
    Json.PROMOCODE = ""
    Json.REMARKS = ""
        // Json.ORDERID = ""
    Json.ADDRESS2 = ""
    if (data.createdby) {
        Json.USERNAME = data.createdby.username.toUpperCase()
    } else {
        Json.USERNAME = ""
    }
    if (data.comments) {
        for (var i = 0; i < data.comments.length; i++) {
            Json.REMARKS += data.comments[i].toUpperCase() + ","
        }
    } else {
        Json.REMARKS = ""
    }
    //~~~~~~~~~~~~~~~~~~~~~Payment Details With Discount~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    // CAPTURE DISCOUNT
    if (data.paymentdetails) {
        if (data.paymentdetails.paid == true) {
            Json.PAYMODE = "ONLINE"
            Json.PAYMENT_STATUS = "PAID"
            if (data.paymentdetails.paymentmode == "CARD") {
                Json.PAYMODE = "ONLINE"
                Json.PAYMENT_STATUS = "PAID"
            } else {
                if (data.paymentdetails.paymentmode == "CASH") {
                    Json.PAYMODE = "ONLINE"
                    Json.PAYMENT_STATUS = "PAID"
                } else {
                    Json.PAYMODE = "ONLINE"
                    Json.PAYMENT_STATUS = "PAID"
                }
            }
        } else {
            Json.PAYMODE = "OFFLINE"
            Json.PAYMENT_STATUS = ""
            if (data.paymentdetails.paymentmode == "CARD") {
                Json.PAYMODE = "ONLINE"
                Json.PAYMENT_STATUS = "PAID"
            } else {
                if (data.paymentdetails.paymentmode == "CASH") {
                    Json.PAYMODE = "OFFLINE"
                    Json.PAYMENT_STATUS = "PAID"
                } else {
                    Json.PAYMODE = "OFFLINE"
                    Json.PAYMENT_STATUS = ""
                }
            }
        }
    } else {
        // @abs [ at rare cases]
        Json.PAYMODE = ""
        Json.PAYMENT_STATUS = ""
    }
    if (data.paymentdetails) {
        if (data.paymentdetails.discount) {
            if (data.paymentdetails.discount == 0) {
                Json.DISCOUNT_FLAG = ""
                Json.DISCOUNT = ""
            } else {
                Json.DISCOUNT_FLAG = "A"
                Json.DISCOUNT = data.paymentdetails.discount.toString()
            }
        } else {
            Json.DISCOUNT_FLAG = ""
            Json.DISCOUNT = ""
        }
    } else {
        Json.DISCOUNT_FLAG = ""
        Json.DISCOUNT = ""
    }
    // CAPTURE PAYMENT DETAILS
    if (data.paymentdetails) {
        if (data.paymentdetails.transactionData) {
            if (data.paymentdetails.transactionData.transactionId) {
                Json.PAYMENT_ID = data.paymentdetails.transactionData.transactionId.toString().toUpperCase()
            } else {
                Json.PAYMENT_ID = ""
            }
        } else {
            Json.PAYMENT_ID = ""
        }
    } else {
        Json.PAYMENT_ID = ""
    }
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~end()~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    async.waterfall([
        function(nextfun) {
            var tempTotalAmount = 0;
            var ogprice = 0;
            if (data.masterservices) {
                for (var i = 0; i < data.masterservices.length; i++) {
                    // console.log("into for loop");
                    if (data.paymentdetails.discount) {
                        //discountnotapplicable
                        Json.TESTS += data.masterservices[i].service_id.externalId.toUpperCase() + " ,"
                        if (data.masterservices[i].service_id.discountnotapplicable == false) {
                            if (data.paymentdetails.discount > 0) {
                                var discount = 1 - parseFloat(data.paymentdetails.discount) / 100;
                                ogprice = data.masterservices[i].price / discount
                                Json.TEST_AMNTS += data.masterservices[i].price + " ,"
                                tempTotalAmount += ogprice
                            }
                        } else {
                            Json.TEST_AMNTS += data.masterservices[i].price + " ,"
                            tempTotalAmount += data.masterservices[i].price
                        }
                    } else {
                        Json.TESTS += data.masterservices[i].service_id.externalId.toUpperCase() + " ,"
                        Json.TEST_AMNTS += data.masterservices[i].price + " ,"
                        tempTotalAmount += data.masterservices[i].price
                    }
                }

                try {
                    if (Json.GROSS_AMT == 0) {
                        if (tempTotalAmount.length > 0) {
                            Json.GROSS_AMT = tempTotalAmount.toString()
                        } else
                            Json.GROSS_AMT = tempTotalAmount.toString()
                    } else {
                        Json.GROSS_AMT = tempTotalAmount.toString()
                    }
                } catch (e) {
                    Json.GROSS_AMT = "";
                }
                if (Json.GROSS_AMT == "NaN") {
                    Json.GROSS_AMT = ""
                };
                return nextfun(null)
            }
        },
        function(nextfun) {
            if (data.client_id) {
                getdate(data.client_id.demography.dob, function(error, result) {
                    Json.DOB = result
                    return nextfun(null)
                });
            } else {
                Json.DOB = ""
                return nextfun(null)
            }
        },
        function(nextfun) {
            if (data.fromdate) {
                getdate(data.fromdate, function(error, result) {
                    Json.COLL_DATE_FROM = result + " " + finalTime
                    return nextfun(null)
                });
            } else {
                Json.COLL_DATE_FROM = ""
                return nextfun(null)
            }
        },
        function(nextfun) {
            if (data.fromdate) {
                getdate(data.fromdate, function(error, result) {
                    Json.COLL_DATE_TO = result + " " + finalTime
                    return nextfun(null)
                })
            } else {
                Json.COLL_DATE_TO = ""
                return nextfun(null)
            }
        }
    ], function(error) {
        if (error) return callbackJson(error)
        var temp_TESTS = Json.TESTS.substring(0, Json.TESTS.length - 1)
        var temp_TEST_AMNTS = Json.TEST_AMNTS.substring(0, Json.TEST_AMNTS.length - 1)
        Json.TESTS = temp_TESTS
        Json.TEST_AMNTS = temp_TEST_AMNTS

        // incase of orde skip and cont
        if (Json.TEST_AMNTS.indexOf("undefined") > -1 || Json.TEST_AMNTS.indexOf("UNDEFINED") > -1) {
            Json.TEST_AMNTS = "0";
        };
        if (data.paymentdetails) {
            if (data.paymentdetails.visitingcharges) {
                Json.HOMECOLL_AMNT = data.paymentdetails.visitingcharges.toString()
            };
        };
        Json.provider_id = data.provider_id
        postRequestForClims(Json, function(error, result) {
            return callbackJson(null, result)
        })
    })
}
// [ set date as dd/mm/yyyy ]
function getdate(date, callbackDate) {
    var tomorrow = new Date(date);
    var setDateString = moment(date).tz('Asia/Calcutta').format("DD/MM/YYYY");
    // console.log(date);
    // console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`");
    // console.log(setDateString);
    // console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`");
    return callbackDate(null, setDateString)
}

function postRequestForClims(data, callbackData) {
    var Datetime = new Date()
    var provider_id;
    if (data.provider_id) {
        provider_id = data.provider_id
        delete data.provider_id
    };
    // console.log(climsUrl.srlApiUrl + '/api/CreateOrder');
    var options = {
        uri: climsUrl.srlApiUrl + '/api/CreateOrder',
        method: 'POST',
        json: data
    }
    request(options, function(error, response, body) {
        var climsResponse;
        // console.log("----------------Clims-Resposne----------------");
        // console.log(body);
        // console.log("----------------Clims-Resposne----------------");
        //  @abs [ hookslog for trace third party post json and response json]
        var hookslogs = {};
        hookslogs.inbound = false
        hookslogs.provider_id = provider_id
        hookslogs.url = climsUrl.srlApiUrl + '/api/CreateOrder'
        hookslogs.method = "POST"
        hookslogs.data = data
        hookslogs.result = body
        hookslogs.datetime = Datetime.toGMTString()
            //end()
            //
        hooksLogs.addHooksLogs(hookslogs, function(error, res) {
            // console.log("hooks return");
            try {
                // console.log("into try");
                climsResponse = JSON.parse(body)
                return callbackData(null, body)
            } catch (e) {
                // console.log("into Catch");
                return callbackData(null, "error")
            }
        });
    });
}
