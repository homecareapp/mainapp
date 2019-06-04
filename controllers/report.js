var _ = require('lodash');
var async = require('async');
var replace = require("replace");
var fse = require('fs-extra');
var csv = require('csv');
var stringify = csv.stringify;
var generate = csv.generate;
var secrets = require('../config/secrets');
var request = require('request');
var OrderModel = require('../models/Order');
var TempReportModel = require('../models/TempReport');
var PartnerModel = require('../models/Partner');
//var Model = require('../models/Report');

var loggedinuser;
var tempDate = new Date();
var tempMinutes;
var tempNumber = new Number();

var moment = require('moment-timezone');
var TIMEZONE = require('../config/secrets').TIMEZONE;

// get the report server filepath
// if report server file path available
// replace db.src file with mongodburi from environment variable
// copy all the files to repost server filepath

function get(req,res,next){
  var reportname = req.body.reportname;
  var format = req.body.format;
  var params= req.body.params;
  var fromdate= req.body.fromdate;
  var todate= req.body.todate;
  var user_id= req.body.user_id;
  var provider_id= req.body.provider_id;
  var partner_id= req.body.partner_id;
  
  switch(reportname){ 
    /*
    POST - http://localhost:3000/reports
    {
      "reportname": "homevisitreport",
      "name": "Completed Home Visit Report",
      "format": "csv",
      "params": [],
      "fromdate": "2015-05-07T18:30:00.000Z",
      "todate": "2016-05-07T18:30:00.000Z"
    }
    */
    case 'homevisitreport':
      loggedinuser = req.user;
      var data = {};
      if (fromdate) {
        data.fromdate = fromdate;
      }
      else{
        data.fromdate = new Date();
      };
      if (todate) {
        data.todate = todate;
      }
      else{
        data.todate = new Date();
      };
      if (user_id) {
        data.user_id = user_id;
      };
      if (provider_id) {
        data.provider_id = provider_id;
      };
      if (partner_id) {
        data.partner_id = partner_id;
      };

      getHomeVisitCSVReport(data, function(e, result){
        if (e) return next(e);

        if (!result) return next(new Error('Order Data not saved'));
        
        /*
        if (!result._id) return next(new Error('Data not saved'));

        params = [];
        params.push({'name': 'tempreport_id', 'value': result._id});
        getReport(format,reportname,params,res);
        */

        var stringifier = stringify({ header: true,delimiter: ',' });
        //stringifier = stringify({})
        stringifier.on('readable', function(){
          while(row = stringifier.read()){
            res.write(row);
          }
        });

        stringifier.on('error', function(err){
          consol.log(err.message);
        });

        stringifier.on('finish', function(){
          res.end();
        });
        res.setHeader('Content-disposition', 'attachment; filename=export.csv');
          res.writeHead(200, {
            'Content-Type': 'text/csv'
          });
          result.forEach(function(row){
            stringifier.write(row);
          })
          //stringifier.write([ 'root','x','0','0','root','/root','/bin/bash' ]);
        //stringifier.write([ 'someone','x','1022','1022','a funny cat','/home/someone','/bin/bash' ]);
        stringifier.end();
      });
      break;
    /*
    POST - http://localhost:3000/reports
    {
      "reportname": "conciserevenuereport",
      "name": "Consice Revenue Report",
      "format": "csv",
      "params": [],
      "fromdate": "2015-05-07T18:30:00.000Z",
      "todate": "2016-05-07T18:30:00.000Z"
    }
    */
    case 'conciserevenuereport':
      loggedinuser = req.user;
      var data = {};
      if (fromdate) {
        data.fromdate = fromdate;
      }
      else{
        data.fromdate = new Date();
      };
      if (todate) {
        data.todate = todate;
      }
      else{
        data.todate = new Date();
      };
      if (user_id) {
        data.user_id = user_id;
      };
      if (provider_id) {
        data.provider_id = provider_id;
      };
      if (partner_id) {
        data.partner_id = partner_id;
      };

      getConciseRevenueCSVReport(data, function(e, result){
        if (e) return next(e);

        if (!result) return next(new Error('Order Data not saved'));
        
        /*
        if (!result._id) return next(new Error('Data not saved'));

        params = [];
        params.push({'name': 'tempreport_id', 'value': result._id});
        getReport(format,reportname,params,res);
        */

        var stringifier = stringify({ header: true,delimiter: ',' });
        //stringifier = stringify({})
        stringifier.on('readable', function(){
          while(row = stringifier.read()){
            res.write(row);
          }
        });

        stringifier.on('error', function(err){
          consol.log(err.message);
        });

        stringifier.on('finish', function(){
          res.end();
        });
        res.setHeader('Content-disposition', 'attachment; filename=export.csv');
          res.writeHead(200, {
            'Content-Type': 'text/csv'
          });
          result.forEach(function(row){
            stringifier.write(row);
          })
          //stringifier.write([ 'root','x','0','0','root','/root','/bin/bash' ]);
        //stringifier.write([ 'someone','x','1022','1022','a funny cat','/home/someone','/bin/bash' ]);
        stringifier.end();
      });
      break;
  };
};

function getReport(format,name,params,res){
  //format can be pdf,html,xlsx
  //params is an array
  //name including .rptdesign
  //http://IP:8080/birtname/frameset?__report=whatever.rptdesign
  //__format
  //__report
  nhhs_logger.debug({
    "function":"getReport",
    "format":format,
    "name":name,
    "params":params
  },"Report");

  if(!format){
    return res.status(500).send('Report format is required');
  }
  if(!name){
    return res.status(500).send('Report name is required');
  }

  var url = secrets.birturl;
  url += '/preview?__report=' + name;
  url += '&__format=' + format;

  if(params.constructor === Array){
    params.forEach(function(param){
      url += '&' + param.name + '=' + param.value;
    })
  };

  request.get(url)
  .on('error', function(err) {
    nhhs_logger.error(err,"Report-Birt");
    res.status(500).send(err);
  })
  .pipe(res);

  /*
  http.get(url, function(response) {

    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end',function(){
      cb(null,body);
    })
    response.pipe(res);

  }).on('error', function(e) {
    console.error(e);
    return res.status(500).send('Error occured during get request ' + url);
  });
  */
};

function getReportList(req,res,next){
  var options = {
    sort:{
      name: 1
    }
  };
  
  Model.find({},{}, options, function(e,list){
    if(e) return next(e);
    if (!req.query.getall) {
      var response = [];
      var roles = [];
      if (req.user)
        roles = req.user.roles;

      list.forEach(function(o){
        var found = _.contains(o.roles, roles[0]);
        if (found) {
          response.push(o);
        };
      });
      list = response;
    };

    res.json(list);
  });  
};

exports.updateReport = function(req, res, next) {
  var data = req.body;
  if (!data.length) {
    var err = new Error('Please check report data !!!');
    err.status = 500;
    return next(err);
  };

  async.eachSeries(data, function(obj, cb){
    Model.findById(obj._id,function(err,doc){
      if(!doc){
        cb("Report not found");
      };

      doc.roles = obj.roles;
      doc.save(function(err,result){
        if(err) return next(new Error(err));
        cb();
      });
    });
  }, function(e){
    if (e) {
      var err = new Error(e);
      err.status = 500;
      return next(err);
    };
    res.json(data);
  });  
};

exports.get = get;
exports.getReport = getReport;
exports.getList = getReportList;

function saveReport (data, nextreport){
  var Report = new TempReportModel(data);
  Report.save(function(e, r){
    if (e) return nextreport(e);

    return nextreport(null, r);
  });
};

/********** Attributes required for HomeVisit-Report ***********/
function initializeHomeVisitReportObject () {
  return {
    "reportname":"",
    "partnername": "",
    "dateoflead":"",
    "timeoflead":"",
    "dateofvisit": "",
    "timeofvisit": "",
    "timeofvisit_am_pm": "",
    "createdbyname": "",
    "patienttitle": "",
    "patientname": "",
    "patientuhid" : "",
    "r_n" : "",
    "r_o": "",
    "majorlocation": "",
    "location": "",
    "patientcontactnumber": "",
    "patientage": "",
    "patientgender": "",
    "R_F_PP": "",
    "testname": "",
    "testcost": "",
    "visitcharge" : "",
    "totalcharge": "",
    "status": "",
    "timeforpp":"",
    "timeforpp_am_pm":"",
    "ppstatus":"",
    "remark":"",
    "phleboremark":""
  };
};

function makeHomeVisitReportData(data, next){
  var search={};
  //var orderIDs = [];
  var finalOrders = [];
  if (loggedinuser) {
    //search["user_id"] = loggedinuser;
  };
  if (data.provider_id) {
    search["provider_id"] = data.provider_id;
  };
  if (data.partner_id) {
    search["partner_id"] = data.partner_id;
  };

  if(data.fromdate && data.todate){
    var fdate = new Date(data.fromdate);
    var tdate = new Date(data.todate);

    tdate.setDate(tdate.getDate()+1);
    tdate.setSeconds(tdate.getSeconds() - 1);

    search["fromdate"] = { $gte : fdate, $lte : tdate };
  };
  //console.log(search);

  async.waterfall([
    function(nextfunc){ 
      OrderModel.find(search, null, { sort: { _id: 1 }, lean:true }, function(e, orders){
        if (e) return nextfunc(e);
        if (!orders.length) return nextfunc(new Error("Order not found"));

        //assigning pporder, if available
        // orders.forEach(function(o){
        //   if (o.ordertype == "F") {
        //     finalOrders.push(o);
        //   }else if (o.ordertype == "PP"){
        //     finalOrders.forEach(function(fo){
        //       if (fo.client_id.toString() == o.client_id.toString() &&
        //         fo.orderGroupId.toString() == o.orderGroupId.toString()) {
        //         fo.pporder = {};
        //         fo.pporder = o;
        //       }
        //     });
        //   };
        // });

        for (var i = 0; i < orders.length; i++) {
          var order = orders[i];
          if (order.ordertype == "F") {
            finalOrders.push(order);
          }
          else if (order.ordertype == "PP")
          {
            for (var j = 0; j < finalOrders.length; j++) {
              if (finalOrders[j].client_id._id.toString() == order.client_id._id.toString() &&
                finalOrders[j].orderGroupId.toString() == order.orderGroupId.toString()) {
                finalOrders[j].pporder = order;
                break;
              }
            }
          }
        }

        return nextfunc(null, finalOrders);
      }).populate([
        { path: 'client_id' },
        // { path: 'servicedeliveryaddress.area_id', select: '_id name' },
        // { path: 'servicedeliveryaddress.sublocation_id', select: '_id name' },
        { path: 'services.service_id', select: '_id name' },
        { path: 'partner_id', select: '_id info.name' }
      ]);
    },
    /*
    function(finalOrders, nextfunc){
      OrderModel.find({ parentorder_id: { $in: orderIDs } }, null, { lean:true }, function(e, pporders){
        if (e) return nextfunc(e);

        //assigning pporder, if available
        orders.forEach(function(o){
          if (o.ordertype == "F") {
            finalOrders.push(o);
          }else if (o.ordertype == "PP"){
            finalOrders.forEach(function(fo){
              if (fo.client_id.toString() == o.client_id.toString() &&
                fo.orderGroupId.toString() == o.orderGroupId.toString()) {
                fo.pporder = {};
                fo.pporder = o;
              }
            });
          };
        });

        return nextfunc(null, finalOrders);
      });
    }
    */
  ], function (e, finalOrders) {
    if (e) return next(e);

    var homeVisitReportArray = [];
    

    async.each(finalOrders, function(ordersObj, nextOrder){ 

      async.waterfall([
        function(nextfun) {
            var homeVisitReportObj = {};
            homeVisitReportObj = initializeHomeVisitReportObject();

            homeVisitReportObj.reportname = "Complete Home Visit Report";

            if (ordersObj && ordersObj.partner_id && ordersObj.partner_id.info  && ordersObj.partner_id.info.name) {
              homeVisitReportObj.partnername = ordersObj.partner_id.info.name.toUpperCase();
            };

            tempDate = new Date(ordersObj.createdatetime);
            tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
            homeVisitReportObj.dateoflead = tempDate.formatDate('dd-MM-yyyy');
            homeVisitReportObj.timeoflead = tempDate.formatDate('hh:mm T');

            tempDate = new Date(ordersObj.fromdate);
            tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
            homeVisitReportObj.dateofvisit = tempDate.formatDate('dd-MM-yyyy');
            tempMinutes = tempNumber.waqt(tempNumber.makeFloat(ordersObj.fromtime));
            homeVisitReportObj.timeofvisit = tempMinutes.hour+":"+tempMinutes.remainder;
            homeVisitReportObj.timeofvisit_am_pm = tempMinutes.meridian;
            
            homeVisitReportObj.createdbyname = ordersObj.createdbyname;
            if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.salutation)
              homeVisitReportObj.patienttitle = ordersObj.client_id.demography.salutation;
            if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.fullname)
              homeVisitReportObj.patientname = ordersObj.client_id.demography.fullname;
            if (ordersObj && ordersObj.client_id && ordersObj.client_id.externalId)
              homeVisitReportObj.patientuhid = ordersObj.client_id.externalId;

            if (true)
              homeVisitReportObj.r_o = "R";
            else if (true)
              homeVisitReportObj.r_o = "O";

            if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.area_id && ordersObj.servicedeliveryaddress.area_id.name)
              homeVisitReportObj.majorlocation = ordersObj.servicedeliveryaddress.area_id.name;

            // if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.sublocation_id && ordersObj.servicedeliveryaddress.sublocation_id.name)
            //   homeVisitReportObj.location = ordersObj.servicedeliveryaddress.sublocation_id.name;

            if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.address2)
              homeVisitReportObj.location = ordersObj.servicedeliveryaddress.address2;

            if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.mobilenumber)
              homeVisitReportObj.patientcontactnumber = ordersObj.client_id.demography.mobilenumber;

            if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.age)
              homeVisitReportObj.patientage = ordersObj.client_id.demography.age;
            
            if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.gender){
              if (ordersObj.client_id.demography.gender.toUpperCase() == "MALE")
                homeVisitReportObj.patientgender = "M";
              else if (ordersObj.client_id.demography.gender.toUpperCase() == "FEMALE")
                homeVisitReportObj.patientgender = "F";
            };

            if (ordersObj.ordertype = 'F' && !ordersObj.pporder)
              homeVisitReportObj.R_F_PP = "R";
            else if (ordersObj.ordertype = 'F' && ordersObj.pporder)
              homeVisitReportObj.R_F_PP = "F";
            else if (ordersObj.ordertype = 'PP')
              homeVisitReportObj.R_F_PP = "PP";

            if (ordersObj.services) {
              var servicesLength = ordersObj.services.length;
              ordersObj.services.forEach(function(so, index){
                if (so && so.service_id) {
                  homeVisitReportObj.testname += so.service_id.name;  
                  if ((servicesLength - 1) != index) {
                    homeVisitReportObj.testname += ",\r";
                  };
                };
              });
            };
            
            if (ordersObj && ordersObj.paymentdetails) {}
            homeVisitReportObj.testcost = tempNumber.makeFloat(ordersObj.paymentdetails.amount).toString();
            homeVisitReportObj.visitcharge = tempNumber.makeFloat(ordersObj.paymentdetails.visitingcharges).toString();
            homeVisitReportObj.totalcharge = (tempNumber.makeFloat(ordersObj.paymentdetails.amount) + tempNumber.makeFloat(ordersObj.paymentdetails.visitingcharges)).toString();

            if (ordersObj.status && ordersObj.status.toUpperCase() == "COMPLETED")
              homeVisitReportObj.status = "Y";
            else
              homeVisitReportObj.status = "N";
            
            if (ordersObj.pporder) { 
              tempDate = new Date(ordersObj.pporder.fromdate);
              tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
              //homeVisitReportObj.dateforpp = tempDate.formatDate('dd-MM-yyyy');
              tempMinutes = tempNumber.waqt(tempNumber.makeFloat(ordersObj.pporder.fromtime));
              homeVisitReportObj.timeforpp = tempMinutes.hour+":"+tempMinutes.remainder;
              homeVisitReportObj.timeforpp_am_pm = tempMinutes.meridian;

              if (ordersObj.pporder.status && ordersObj.pporder.status.toUpperCase() == "COMPLETED")
                homeVisitReportObj.ppstatus = "Y";
              else
                homeVisitReportObj.ppstatus = "N";
            };

            ordersObj.comments.forEach(function(ro){ //ro = remark object
              if (ro)
                homeVisitReportObj.remark += ro + "\n\r";  
            });

            ordersObj.visitcomments.forEach(function(pro){ //pro = phlebo remark object
              if (pro)
              {
                var arr = pro.split(':');
                var a = (arr[0].toUpperCase()).trim()
                if(loggedinuser.role == "partnerfrontoffice" || loggedinuser.role == "partnerteamlead")
                {
                  if((a.toUpperCase()).trim() != 'SINGLE PRICK' && (a.toUpperCase()).trim() != 'DOUBLE PRICK' && (a.toUpperCase()).trim() != 'RESCUE PRICK')
                  {
                    homeVisitReportObj.phleboremark += pro + "\n\r";
                  }
                }
                else
                {
                  homeVisitReportObj.phleboremark += pro + "\n\r";
                }
                // if((a.toUpperCase()).trim() != 'SINGLE PRICK' && (a.toUpperCase()).trim() != 'DOUBLE PRICK' && (a.toUpperCase()).trim() != 'RESCUE PRICK')
                // {
                //   homeVisitReportObj.phleboremark += pro + "\n\r";
                // }
                  
              }
            });

            if(ordersObj.prescriptions)
            {
              var desc = ""
              ordersObj.prescriptions.forEach(function(prescrp){
                if(prescrp.description != "LabAssistant Signature" 
                    && prescrp.description != "Logistics Signature" 
                    && prescrp.description != "Delivery Signature"
                    && prescrp.description != "Patient Signature")
                {
                  desc += prescrp.description + "\n\r";
                }
                
              })
              homeVisitReportObj.prescriptionDescription = desc;
            }

            if(ordersObj.serviceupdatecomment)
            {
              //testupdatereason
              if(ordersObj.serviceupdatecomment.testupdatereason)
              {
                if(ordersObj.serviceupdatecomment.testupdatereason.length)
                {
                  var testupdatereason = "";
                  ordersObj.serviceupdatecomment.testupdatereason.forEach(function(testReasonObj){
                    if(testReasonObj.displayname)
                    {
                      testupdatereason += testReasonObj.displayname + "\n\r";
                    }
                  })
                  homeVisitReportObj.testupdatereason = testupdatereason;
                }
                else
                  homeVisitReportObj.testupdatereason = ""
              }
              else
                homeVisitReportObj.testupdatereason = "";
              //testupdatereason

              //testupdatecomment
              if(ordersObj.serviceupdatecomment.testupdatecomment)
              {
                if(ordersObj.serviceupdatecomment.testupdatecomment.length)
                {
                  var testupdatecomment = "";
                  ordersObj.serviceupdatecomment.testupdatecomment.forEach(function(testCommentObj){
                    if(testCommentObj)
                    {
                      testupdatecomment += testCommentObj + "\n\r";
                    }
                  })
                  homeVisitReportObj.testupdatecomment = testupdatecomment;
                }
                else
                  homeVisitReportObj.testupdatecomment = ""
              }
              else
                homeVisitReportObj.testupdatecomment = "";
              //testupdatecomment
            }
            else
            {
              homeVisitReportObj.testupdatereason = "";
              homeVisitReportObj.testupdatecomment = "";
            }
            return nextfun(null, homeVisitReportObj)
        },
        function(homeVisitReportObj, nextfun) {
            // if (true)
            //   homeVisitReportObj.r_n = "R";
            // else if (true)
            //   homeVisitReportObj.r_n = "N";

            // if(moment(ordersObj.client_id.registrationdate).tz(TIMEZONE).format("DD-MM-YYYY") == moment(ordersObj.fromdate).tz(TIMEZONE).format("DD-MM-YYYY"))
            // {
            //   homeVisitReportObj.r_n = "N";
            // }
            
            // else if(moment(ordersObj.client_id.registrationdate).tz(TIMEZONE).startOf('day') < moment(ordersObj.fromdate).tz(TIMEZONE).startOf('day')
            //   && moment(ordersObj.fromdate).tz(TIMEZONE).startOf('day') <= moment().tz(TIMEZONE).startOf('day'))
            // {
            //   homeVisitReportObj.r_n = "N";
            // }
            // else
            // {
            //   homeVisitReportObj.r_n = "R";
            // }
            var searchpatientorder = {};
            searchpatientorder["client_id"]= ordersObj.client_id._id;
            searchpatientorder["fromdate"]= {$lt:ordersObj.fromdate};
            OrderModel.count(searchpatientorder, function(e,count){
              if(count)
              {
                homeVisitReportObj.r_n = "R";
              }
              else
              {
                homeVisitReportObj.r_n = "N";
              }
              return nextfun(null, homeVisitReportObj)
            })
        }   
      ],function(error, homeVisitReportObj) {
          homeVisitReportArray.push(homeVisitReportObj);
          return nextOrder();
      })

      
    }, function(e){
      if (e) return next();

      fdate.setDate(fdate.getDate()+1);
      tdate.setDate(tdate.getDate()+1);
      var reportdate = 'From ' + fdate.formatDate('dd-MM-yyyy') + ' To ' + tdate.formatDate('dd-MM-yyyy');
      var reportstaff = "";
      if (loggedinuser.profile)
        reportstaff = loggedinuser.profile.firstname + " " + loggedinuser.profile.lastname;

      var savedata = {
        headerinfo: {
          reportname: 'Home Visit Report',
          reportdate: "Date - " + reportdate,
          reportstaff: "Generated by - " + reportstaff
        },
        details: {
          homeVisitreport: homeVisitReportArray
        }
      };

      saveReport(savedata, function(saveerr, saveresult){
        if (saveerr) return next(saveerr);
        
        return next(null, saveresult);
      });
    });
  });
};

function getHomeVisitCSVReport(data, csvCB){
  makeHomeVisitReportData(data, function(e, tempResult){
    if (e) return csvCB(e);

    if (!tempResult) return csvCB(new Error("Temp data not found"));
    if (!tempResult.details) return csvCB(new Error("Temp detail data not found"));
    if (!tempResult.details.homeVisitreport) return csvCB(new Error("Temp data not found"));
    if (!tempResult.details.homeVisitreport.length) return csvCB(new Error("Temp data not found"));

    var orders = tempResult.details.homeVisitreport;
    var exportdata = [];
    var secondblankrow = [];

    exportdata.push(['S.No','Partner Name','Date of Lead','Time of Lead','Date of Visit','Time of Visit','AM/PM','Created By',
      'Title','Patients Name','UHID','R/N','R/O','Major Area','Location','Patients Contact Number','Age','Gender','R/F/PP',
      'Test Names','Test Cost','Visit Charge','Total','Completed (Y/N)','Time for PP','AM/PM','Completed (Y/N)','Remarks',
      'Phlebo Remark','Description','Test Update Reason','Test Update Comment'
    ]);
    exportdata[0].forEach(function(o){
      secondblankrow.push('');
    });
    exportdata.push(secondblankrow);

    orders.forEach(function(ordersObj, i){
      exportdata.push([
        i+1,
        ordersObj.partnername.toUpperCase(),
        ordersObj.dateoflead.toUpperCase(),
        ordersObj.timeoflead.toUpperCase(),
        ordersObj.dateofvisit.toUpperCase(),
        ordersObj.timeofvisit.toUpperCase(),
        ordersObj.timeofvisit_am_pm.toUpperCase(),
        ordersObj.createdbyname.toUpperCase(),
        ordersObj.patienttitle.toUpperCase(),
        ordersObj.patientname.toUpperCase(),
        ordersObj.patientuhid.toUpperCase(),
        ordersObj.r_n.toUpperCase(),
        ordersObj.r_o.toUpperCase(),
        ordersObj.majorlocation.toUpperCase(),
        ordersObj.location.toUpperCase(),
        ordersObj.patientcontactnumber.toUpperCase(),
        ordersObj.patientage.toUpperCase(),
        ordersObj.patientgender.toUpperCase(),
        ordersObj.R_F_PP.toUpperCase(),
        ordersObj.testname.toUpperCase(),
        ordersObj.testcost.toUpperCase(),
        ordersObj.visitcharge.toUpperCase(),
        ordersObj.totalcharge.toUpperCase(),
        ordersObj.status.toUpperCase(),
        ordersObj.timeforpp.toUpperCase(),
        ordersObj.timeforpp_am_pm.toUpperCase(),
        ordersObj.ppstatus.toUpperCase(),
        (ordersObj.remark.trim()).toUpperCase(),
        (ordersObj.phleboremark.trim()).toUpperCase(),
        ordersObj.prescriptionDescription.toUpperCase(),
        ordersObj.testupdatereason.toUpperCase(),
        ordersObj.testupdatecomment.toUpperCase()
      ]);
    });

    return csvCB(null, exportdata);
  });
};

/********** Attributes required for ConsiceRevenue-Report ***********/
function initializeConciseRevenueReportObject () {
  return {
    "reportname":"",
    "partnername": "",
    "dateoflead":"",
    "timeoflead":"",
    "dateofvisit": "",
    "timeofvisit": "",
    "timeofvisit_am_pm": "",
    "createdbyname": "",
    "patienttitle": "",
    "patientname": "",
    "patientuhid" : "",
    "r_n" : "",
    "r_o": "",
    "majorlocation":"",
    "location": "",
    "patientcontactnumber": "",
    "patientage": "",
    "patientgender": "",
    "R_F_PP": "",
    "testname": "",
    "testcost": "",
    "visitcharge" : "",
    "totalcharge": "",
    "status": "",
    "timeforpp":"",
    "timeforpp_am_pm":"",
    "ppstatus":"",
    "remark":"",
    "phleboremark":""
  };
};

function makeConciseRevenueReportData(data, next){
  var search={};
  //var orderIDs = [];
  var finalOrders = [];
  if (loggedinuser) {
    //search["user_id"] = loggedinuser;
  };
  if (data.provider_id) {
    search["provider_id"] = data.provider_id;
  };
  if (data.partner_id) {
    search["partner_id"] = data.partner_id;
  };

  if(data.fromdate && data.todate){
    var fdate = new Date(data.fromdate);
    var tdate = new Date(data.todate);

    tdate.setDate(tdate.getDate()+1);
    tdate.setSeconds(tdate.getSeconds() - 1);

    search["fromdate"] = { $gte : fdate, $lte : tdate };
  };
  //console.log(search);

  async.waterfall([ 
    function(nextfunc){ 
      OrderModel.find(search, null, { sort: { _id: 1 }, lean:true }, function(e, orders){
        if (e) return nextfunc(e);
        if (!orders.length) return nextfunc(new Error("Order not found"));

        //assigning pporder, if available
        orders.forEach(function(o){
          if (o.ordertype == "F") {
            finalOrders.push(o);
          }else if (o.ordertype == "PP"){
            finalOrders.forEach(function(fo){
              if (fo.client_id.toString() == o.client_id.toString() &&
                fo.orderGroupId.toString() == o.orderGroupId.toString()) {
                fo.pporder = {};
                fo.pporder = o;
              }
            });
          };
        });

        return nextfunc(null, finalOrders);
      }).populate([
        { path: 'client_id' },
        //{ path: 'servicedeliveryaddress.area_id', select: '_id name' },
        //{ path: 'servicedeliveryaddress.sublocation_id', select: '_id name' },
        { path: 'services.service_id', select: '_id name' },
        { path: 'partner_id', select: '_id info.name' }
      ]);
    },
    /*
    function(finalOrders, nextfunc){
      OrderModel.find({ parentorder_id: { $in: orderIDs } }, null, { lean:true }, function(e, pporders){
        if (e) return nextfunc(e);

        //assigning pporder, if available
        orders.forEach(function(o){
          pporders.forEach(function(ppo){
            if (o._id.toString() == ppo.parentorder_id.toString()) {
              o.pporder = {};
              o.pporder = ppo;
            };
          });
        });

        return nextfunc(null, orders);
      });
    }
    */
  ], function (e, finalOrders) {
    if (e) return next(e);
    
    var conciseRevenueReportArray = [];
    var conciseRevenueReportObj = {};

    async.each(finalOrders, function(ordersObj, nextOrder){ 
      conciseRevenueReportObj = {};
      conciseRevenueReportObj = initializeConciseRevenueReportObject();
      
      conciseRevenueReportObj.reportname = "Complete Home Visit Report";

      if (ordersObj && ordersObj.partner_id && ordersObj.partner_id.info  && ordersObj.partner_id.info.name) {
        conciseRevenueReportObj.partnername = ordersObj.partner_id.info.name.toUpperCase();
      };

      tempDate = new Date(ordersObj.createdatetime);
      tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
      conciseRevenueReportObj.dateoflead = tempDate.formatDate('dd-MM-yyyy');
      conciseRevenueReportObj.timeoflead = tempDate.formatDate('hh:mm T');

      tempDate = new Date(ordersObj.fromdate);
      tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
      conciseRevenueReportObj.dateofvisit = tempDate.formatDate('dd-MM-yyyy');
      // conciseRevenueReportObj.timeofvisit = tempDate.formatDate('hh:mm');
      // conciseRevenueReportObj.timeofvisit_am_pm = tempDate.formatDate('T');
      tempMinutes = tempNumber.waqt(tempNumber.makeFloat(ordersObj.fromtime));
      conciseRevenueReportObj.timeofvisit = tempMinutes.hour+":"+tempMinutes.remainder;
      conciseRevenueReportObj.timeofvisit_am_pm = tempMinutes.meridian;

      conciseRevenueReportObj.createdbyname = ordersObj.createdbyname;
      if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.salutation)
        conciseRevenueReportObj.patienttitle = ordersObj.client_id.demography.salutation;
      if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.fullname)
        conciseRevenueReportObj.patientname = ordersObj.client_id.demography.fullname;
      if (ordersObj && ordersObj.client_id && ordersObj.client_id.externalId)
        conciseRevenueReportObj.patientuhid = ordersObj.client_id.externalId;

      if (true)
        conciseRevenueReportObj.r_n = "R";
      else if (true)
        conciseRevenueReportObj.r_n = "N";

      if (true)
        conciseRevenueReportObj.r_o = "R";
      else if (true)
        conciseRevenueReportObj.r_o = "O";

      if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.area_id && ordersObj.servicedeliveryaddress.area_id.name)
        conciseRevenueReportObj.majorlocation = ordersObj.servicedeliveryaddress.area_id.name;

      // if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.sublocation_id && ordersObj.servicedeliveryaddress.sublocation_id.name)
      //   conciseRevenueReportObj.location = ordersObj.servicedeliveryaddress.sublocation_id.name;

      if (ordersObj.servicedeliveryaddress && ordersObj.servicedeliveryaddress.address2)
        conciseRevenueReportObj.location = ordersObj.servicedeliveryaddress.address2;

      if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.mobilenumber)
        conciseRevenueReportObj.patientcontactnumber = ordersObj.client_id.demography.mobilenumber;

      if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.age)
        conciseRevenueReportObj.patientage = ordersObj.client_id.demography.age;
      
      if (ordersObj && ordersObj.client_id && ordersObj.client_id.demography && ordersObj.client_id.demography.gender){
        if (ordersObj.client_id.demography.gender.toUpperCase() == "MALE")
          conciseRevenueReportObj.patientgender = "M";
        else if (ordersObj.client_id.demography.gender.toUpperCase() == "FEMALE")
          conciseRevenueReportObj.patientgender = "F";
      };

      if (true)
        conciseRevenueReportObj.R_F_PP = "R";
      else if (true)
        conciseRevenueReportObj.R_F_PP = "F";
      else if (true)
        conciseRevenueReportObj.R_F_PP = "PP";

      if (ordersObj.services) {
        var servicesLength = ordersObj.services.length;
        ordersObj.services.forEach(function(so, index){
          if (so && so.service_id) {
            conciseRevenueReportObj.testname += so.service_id.name;  
            if ((servicesLength - 1) != index) {
              conciseRevenueReportObj.testname += ",\r";
            };
          };
        });
      };

      conciseRevenueReportObj.testcost = "";
      conciseRevenueReportObj.visitcharge = "";
      conciseRevenueReportObj.totalcharge = "";

      if (ordersObj.status && ordersObj.status.toUpperCase() == "COMPLETED")
        conciseRevenueReportObj.status = "Y";
      else
        conciseRevenueReportObj.status = "N";

      if (ordersObj.pporder) {
        tempDate = new Date(ordersObj.pporder.fromdate);
        tempDate = new Date(tempDate.setMinutes(tempDate.getMinutes()+330));
        //conciseRevenueReportObj.dateforpp = tempDate.formatDate('dd-MM-yyyy');
        conciseRevenueReportObj.timeforpp = tempDate.formatDate('hh:mm');
        conciseRevenueReportObj.timeforpp_am_pm = tempDate.formatDate('T');

        if (ordersObj.pporder.status && ordersObj.pporder.status.toUpperCase() == "COMPLETED")
          conciseRevenueReportObj.ppstatus = "Y";
        else
          conciseRevenueReportObj.ppstatus = "NA";
      };

      ordersObj.comments.forEach(function(ro){ //ro = remark object
        if (ro)
          conciseRevenueReportObj.remark += ro + "\n\r";  
      });

      ordersObj.visitcomments.forEach(function(pro){ //pro = phlebo remark object
        if (pro)
        {
          var arr = pro.split(':');
          var a = (arr[0].toUpperCase()).trim()

          if(loggedinuser.role == "partnerfrontoffice" || loggedinuser.role == "partnerteamlead")
          {
            if((a.toUpperCase()).trim() != 'SINGLE PRICK' && (a.toUpperCase()).trim() != 'DOUBLE PRICK' && (a.toUpperCase()).trim() != 'RESCUE PRICK')
            {
              conciseRevenueReportObj.phleboremark += pro + "\n\r";
            }
          }
          else
          {
            conciseRevenueReportObj.phleboremark += pro + "\n\r";
          }
          // if((a.toUpperCase()).trim() != 'SINGLE PRICK' && (a.toUpperCase()).trim() != 'DOUBLE PRICK' && (a.toUpperCase()).trim() != 'RESCUE PRICK')
          // {
          //   conciseRevenueReportObj.phleboremark += pro + "\n\r";
          // }
            
        }  
      });

      if(ordersObj.prescriptions)
      {
        var desc = ""
        ordersObj.prescriptions.forEach(function(prescrp){
          if(prescrp.description != "LabAssistant Signature" 
              && prescrp.description != "Logistics Signature" 
              && prescrp.description != "Delivery Signature"
              && prescrp.description != "Patient Signature")
          {
            desc += prescrp.description + "\n\r";
          }
        })
        conciseRevenueReportObj.prescriptionDescription = desc;
      }

      conciseRevenueReportArray.push(conciseRevenueReportObj);
      
      return nextOrder();
    }, function(e){
      if (e) return next();

      fdate.setDate(fdate.getDate()+1);
      tdate.setDate(tdate.getDate()+1);
      var reportdate = 'From ' + fdate.formatDate('dd-MM-yyyy') + ' To ' + tdate.formatDate('dd-MM-yyyy');
      var reportstaff = "";
      if (loggedinuser.profile)
        reportstaff = loggedinuser.profile.firstname + " " + loggedinuser.profile.lastname;

      var savedata = {
        headerinfo: {
          reportname: 'Home Visit Report',
          reportdate: "Date - " + reportdate,
          reportstaff: "Generated by - " + reportstaff
        },
        details: {
          conciseRevenueReport: conciseRevenueReportArray
        }
      };

      saveReport(savedata, function(saveerr, saveresult){
        if (saveerr) return next(saveerr);
        
        return next(null, saveresult);
      });
    });
  });
};

function getConciseRevenueCSVReport(data, csvCB){
  makeConciseRevenueReportData(data, function(e, tempResult){
    if (e) return csvCB(e);

    if (!tempResult) return csvCB(new Error("Temp data not found"));
    if (!tempResult.details) return csvCB(new Error("Temp detail data not found"));
    if (!tempResult.details.conciseRevenueReport) return csvCB(new Error("Temp data not found"));
    if (!tempResult.details.conciseRevenueReport.length) return csvCB(new Error("Temp data not found"));

    var orders = tempResult.details.conciseRevenueReport;
    var exportdata = [];
    var secondblankrow = [];

    exportdata.push(['S.No','Partner Name','Date of Lead','Time of Lead','Date of Visit','Time of Visit','AM/PM','Created By',
      'Title','Patients Name','UHID','R/N','R/O','Major Area','Location','Patients Contact Number','Age','Gender','R/F/PP','Test Names',
      'Test Cost','Visit Charge','Total','Completed (Y/N)','Time for PP','AM/PM','Completed (Y/N)','Remarks',
      'Phlebo Remark','Description'
    ]);
    exportdata[0].forEach(function(o){
      secondblankrow.push('');
    });
    exportdata.push(secondblankrow);

    orders.forEach(function(ordersObj, i){
      exportdata.push([
        i+1,
        ordersObj.partnername.toUpperCase(),
        ordersObj.dateoflead.toUpperCase(),
        ordersObj.timeoflead.toUpperCase(),
        ordersObj.dateofvisit.toUpperCase(),
        ordersObj.timeofvisit.toUpperCase(),
        ordersObj.timeofvisit_am_pm.toUpperCase(),
        ordersObj.createdbyname.toUpperCase(),
        ordersObj.patienttitle.toUpperCase(),
        ordersObj.patientname.toUpperCase(),
        ordersObj.patientuhid.toUpperCase(),
        ordersObj.r_n.toUpperCase(),
        ordersObj.r_o.toUpperCase(),
        ordersObj.majorlocation.toUpperCase(),
        ordersObj.location.toUpperCase(),
        ordersObj.patientcontactnumber.toUpperCase(),
        ordersObj.patientage.toUpperCase(),
        ordersObj.patientgender.toUpperCase(),
        ordersObj.R_F_PP.toUpperCase(),
        ordersObj.testname.toUpperCase(),
        ordersObj.testcost.toUpperCase(),
        ordersObj.visitcharge.toUpperCase(),
        ordersObj.totalcharge.toUpperCase(),
        ordersObj.status.toUpperCase(),
        ordersObj.timeforpp.toUpperCase(),
        ordersObj.timeforpp_am_pm.toUpperCase(),
        ordersObj.ppstatus.toUpperCase(),
        (ordersObj.remark.trim()).toUpperCase(),
        (ordersObj.phleboremark.trim()).toUpperCase(),
        ordersObj.prescriptionDescription.toUpperCase()
      ]);
    });

    return csvCB(null, exportdata);
  });
};