var express = require('express');
var router = express.Router();
var passportConf = require('../config/passport');
var user = require('../controllers/user');
var city = require('../controllers/city');
var area = require('../controllers/area');

var attendance = require('../controllers/attendance');

var tube = require('../controllers/tube');
var partner = require('../controllers/partner');
var menu = require('../controllers/menu');
var distance = require('../controllers/distance');
var services = require('../controllers/service.js');
var department = require('../controllers/department.js');
var imports = require('../controllers/imports.js');
var partnerservice = require('../controllers/partnerservice.js');
var specialneed = require('../controllers/specialneed.js');
var patientinstruction = require('../controllers/patientinstruction');
var role = require("../controllers/role");
var optionmaster = require("../controllers/optionmaster");
var weekoffrequest = require("../controllers/weekoffrequest");
var client = require("../controllers/client");
var call = require("../controllers/call");
var servicerequest = require("../controllers/servicerequest");
var order = require("../controllers/order");
var orderNew = require("../controllers/order-new");
var provider = require("../controllers/provider");
var sync = require("../controllers/sync");
var weekoff = require("../controllers/weekoff");
var hookslogs = require("../controllers/hookslogs")

var servicesinfo = require("../controllers/servicesinfo");
var notification = require("../controllers/notification");

var reportController = require('../controllers/report');
var importlog = require('../controllers/importlogs');

//---------- need to delete after test order add and update start working from parser----------------//
// for add order from parser
var climsParser = require("../parser/srl/call.js")

var orderParser = require("../parser/mly/order.js")

//var fileexport = require("../controllers/exportfile");




/** For data syncing with external systems **/
router.get('/sync/:entity', sync.startSync);



/****User***/
// [ need to add the below route to  get mly userList not having any orders ] 
// router.get('/users', passportConf.isAuthorized, user.getAvailableServiceAgent);
router.get('/availableusers', passportConf.isAuthorized, user.getSRLUsers);
router.get('/users', passportConf.isAuthorized, user.getList);
router.get('/users/:id', passportConf.isAuthorized, user.getList);
router.get('/getuserwithorder', passportConf.isAuthorized, user.getUsersWithOrders);
router.post('/users', passportConf.isAuthorized, user.add);
router.put('/users/:id', passportConf.isAuthorized, user.update);
router.post('/userbyarea', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('userbyarea', req, res, next);
}, user.getUsersByArea);
router.get('/getuserinfolist', passportConf.isAuthorized, user.getUserInfoList);

router.post('/logisticuserbyarea', passportConf.isAuthorized, user.getLogisticUsersByArea);

router.put('/changePassword/:id', passportConf.isAuthorized, user.changePassword);


router.get('/resetpassword/:id', passportConf.isAuthorized, user.resetPassword);

/***City***/
router.get('/cities/:id', passportConf.isAuthorized, city.getList);
router.get('/cities', passportConf.isAuthorized, city.getList);
router.post('/cities', passportConf.isAuthorized, city.add);
router.put('/cities/:id', passportConf.isAuthorized, city.update);

/***Attendance***/
router.get('/attendance', passportConf.isAuthorized, attendance.getList);
router.get('/attendance/:Id', passportConf.isAuthorized, attendance.getList);
router.post('/attendance', passportConf.isAuthorized, attendance.add);
router.put('/attendance/:id', passportConf.isAuthorized, attendance.update);
router.get('/getUsersAttendance', passportConf.isAuthorized, attendance.getUsersAttendance);


/***Area***/
router.get('/areas/:id', passportConf.isAuthorized, area.getList);
router.get('/areas', passportConf.isAuthorized, area.getList);
router.post('/areas', passportConf.isAuthorized, area.add);
router.put('/areas/:id', passportConf.isAuthorized, area.update);

/***Distance***/
router.get('/distances', passportConf.isAuthorized, distance.getList);
router.post('/distances', passportConf.isAuthorized, distance.add);
router.put('/distances', passportConf.isAuthorized, distance.update);

/***Tube***/
router.get('/tubes', passportConf.isAuthorized, tube.getList);
router.get('/tubes/:id', passportConf.isAuthorized, tube.getList);
router.post('/tubes', passportConf.isAuthorized, tube.add);
router.put('/tubes/:id', passportConf.isAuthorized, tube.update);
router.delete('/tubes/:id', passportConf.isAuthorized, tube.delete);

// router.post('/tubes/imports',passportConf.isAuthorized,tube.imports);


/***Partners***/
router.get('/partners', passportConf.isAuthorized, partner.getList);
router.get('/partners/:id', passportConf.isAuthorized, partner.getList);
router.post('/partners', passportConf.isAuthorized, partner.add);
router.put('/partners/:id', passportConf.isAuthorized, partner.update);
router.put('/partnerarea/:id', passportConf.isAuthorized, partner.updatearea);
router.get('/availabletimeslot', passportConf.isAuthorized, partner.avblSlot);
router.get('/partnerareaslot', passportConf.isAuthorized, partner.prtrAreaSlot);
router.get('/getpartnerinfolist', passportConf.isAuthorized, partner.getPartnerInfoList);


/*** Services ***/
router.get('/services', passportConf.isAuthorized, services.getList);
router.get('/services/:id', passportConf.isAuthorized, services.getList);
router.post('/services', passportConf.isAuthorized, services.add);
router.put('/services/:id', passportConf.isAuthorized, services.update);
router.delete('/services/:id', passportConf.isAuthorized, services.delete);



/***Menu***/
router.get('/menus', passportConf.isAuthorized, menu.getList);
router.get('/menus/:id', passportConf.isAuthorized, menu.getList);
router.post('/menus', passportConf.isAuthorized, menu.add);
router.put('/menus/:id', passportConf.isAuthorized, menu.update);

/*** Department ***/
router.get('/departments', passportConf.isAuthorized, department.getList);
router.get('/departments/:id', passportConf.isAuthorized, department.getList);
router.post('/departments', passportConf.isAuthorized, department.add);
router.put('/departments/:id', passportConf.isAuthorized, department.update);


/*** FileUpload **/
//router.post('/imports/:type', passportConf.isAuthorized, imports.addFile);

router.post('/imports/:type', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('imports', req, res, next);
}, imports.addFile);

/*** Partner Test Services**/
router.get('/partnerservices', passportConf.isAuthorized, partnerservice.getList);
router.get('/partnerservices/:id', passportConf.isAuthorized, partnerservice.getList);
router.post('/partnerservices', passportConf.isAuthorized, partnerservice.add);
router.put('/partnerservices/:id', passportConf.isAuthorized, partnerservice.update);
router.delete('/partnerservices/:id', passportConf.isAuthorized, partnerservice.delete);
router.delete('/deletepartnerservices/:id', passportConf.isAuthorized, partnerservice.deletePermanent);
router.post('/getcustomerinstructions', passportConf.isAuthorized, partnerservice.getCustomerInstructions);
router.post('/getSuperSetServices', passportConf.isAuthorized, partnerservice.getSuperSetServices);
router.post('/getAllUniqueTestsFromServices', passportConf.isAuthorized, partnerservice.getAllUniqueTestsFromServices);

/*** Specail Test **/
router.get('/specialneed', passportConf.isAuthorized, specialneed.getList);
router.get('/specialneed/:id', passportConf.isAuthorized, specialneed.getList);
router.post('/specialneed', passportConf.isAuthorized, specialneed.add);
router.put('/specialneed/:id', passportConf.isAuthorized, specialneed.update);

/*** Patient Instructions **/
router.get('/patientinstructions', passportConf.isAuthorized, patientinstruction.getList);
router.post('/patientinstructions', passportConf.isAuthorized, patientinstruction.add);
router.put('/patientinstructions/:id', passportConf.isAuthorized, patientinstruction.update);
router.get('/patientinstructions/:id', passportConf.isAuthorized, patientinstruction.getList);


/*** Roles **/ 
router.get('/roles', passportConf.isAuthorized, role.getList);
router.post('/roles', passportConf.isAuthorized, role.add);
router.put('/roles/:id', passportConf.isAuthorized, role.update);

/*** Options **/
router.get('/options', passportConf.isAuthorized, optionmaster.getList);
router.post('/options', passportConf.isAuthorized, optionmaster.add);
router.put('/options/:id', passportConf.isAuthorized, optionmaster.update);
router.delete('/options/:id', passportConf.isAuthorized, optionmaster.deleteOption);
router.get('/options/:id', passportConf.isAuthorized, optionmaster.getObjByID);

/*** Week Off Request **/
router.get('/worequests', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('worequests', req, res, next);
}, weekoffrequest.getList);


router.post('/addWOList', passportConf.isAuthorized, weekoffrequest.addWOList);

router.post('/worequests', passportConf.isAuthorized, weekoffrequest.add);
router.post('/worequests/:id', passportConf.isAuthorized, weekoffrequest.add);

router.get('/worequests/:id', passportConf.isAuthorized, weekoffrequest.getList);

/*** Client ***/
router.get('/clients', passportConf.isAuthorized, client.getList);
router.get('/clients/:id', passportConf.isAuthorized, client.getList);
router.post('/clients', passportConf.isAuthorized, client.add);
router.put('/clients/:id', passportConf.isAuthorized, client.update);
router.put('/updatedemography/:id', passportConf.isAuthorized, client.updateDemography);
router.get('/clientsbycode/:clientcode',passportConf.isAuthorized, client.findByClientCode);
router.get('/lims/clients',passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('getClientsFromLIMS', req, res, next);
},client.getListFromProvider);
router.put('/updateclientaddress/:id', passportConf.isAuthorized, client.updateclientaddress);
router.delete('/deleteclient/:id', passportConf.isAuthorized, client.deletePermanent);

/*** Calls ***/
router.get('/calls', passportConf.isAuthorized, call.getList);
router.get('/calls/:id', passportConf.isAuthorized, call.getList);
router.post('/calls', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('addCall', req, res, next);
}, call.add);

// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// need to change call routes as mention above i need to test order entry into clims database
// router.post('/calls', passportConf.isAuthorized, climsParser.add);
// end()

router.put('/calls/:id', passportConf.isAuthorized, call.update);
router.get('/srlServicePrice', passportConf.isAuthorized, call.srlServicePrice);



/*** Services ***/
router.get('/servicerequests', passportConf.isAuthorized, servicerequest.getList);
router.get('/servicerequests/:id', passportConf.isAuthorized, servicerequest.getList);
router.post('/servicerequests', passportConf.isAuthorized, servicerequest.add);
router.put('/servicerequests/:id', passportConf.isAuthorized, servicerequest.update);


/*** Orders ***/
// router.get('/orders', passportConf.isAuthorized, order.getList);
//router.get('/orders', passportConf.isAuthorized, order.getList); //function(req, res, next) { provider.checkparser('getOrderList', req, res, next); }, 

// router.get('/orders/:id', passportConf.isAuthorized, order.getList);
//router.get('/orders/:id', passportConf.isAuthorized, orderNew.getOrder);

// router.post('/orders', passportConf.isAuthorized, order.add);
router.get('/orderoverview', passportConf.isAuthorized, order.getOverview);
router.post('/orders', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('order', req, res, next);
}, order.add);

router.put('/orders/:id', passportConf.isAuthorized, order.update);

router.get('/getparentorderid', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('getParentOrderID', req, res, next);
}, order.getParentOrderID);

router.put('/updatelogistic/:id', passportConf.isAuthorized, order.assignLogistic);

router.put('/updateComment/:id', passportConf.isAuthorized, order.changeComment);

router.post('/addprescriptionbyid/:id', passportConf.isAuthorized, order.addPrescriptionByID);
router.delete('/deleteprescriptionbyid/:id', passportConf.isAuthorized, order.deletePrescriptionByID);
router.get('/getprescriptionbyid/:id', passportConf.isAuthorized, order.getPrescriptionByID);

router.get('/getCountsForDashboard', passportConf.isAuthorized, order.getCountsForDashboard);

router.put('/cancelorder/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('cancelorder', req, res, next);
}, order.cancelorder);

// router.put('/getvisitcharge', passportConf.isAuthorized, function(req, res, next) {
//     provider.checkparser('getVisitingCharge', req, res, next);
// }, order.getVisitingCharge);

router.put('/getvisitcharge', passportConf.isAuthorized, order.getVisitingCharge);

router.put('/ordertestupdate/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('ordertestupdate', req, res, next);
}, order.ordertestupdate);

router.put('/changeorderaddress/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('changeorderaddress', req, res, next);
}, orderNew.changeorderaddress);

router.put('/rescheduleorder/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('rescheduleorder', req, res, next);
}, order.rescheduleorder);

router.put('/assignphlebo/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('assignphlebo', req, res, next);
}, orderNew.assignphlebo);
router.get('/getpporderid', passportConf.isAuthorized, order.getPPOrderID);
router.get('/getordercount', passportConf.isAuthorized, order.getOrderCount);

//router.post('/addorders', passportConf.isAuthorized, orderNew.addOrders);
router.get('/getpartnerlog', passportConf.isAuthorized, orderNew.getPartnerLog);
//router.put('/updateorder/:id', passportConf.isAuthorized, orderNew.updateOrder);

//router.get('/grouporders', passportConf.isAuthorized, order.grouporders);


/****Providers***/
router.get('/providers', passportConf.isAuthorized, provider.getList);
router.get('/providers/:id', passportConf.isAuthorized, provider.getList);
router.post('/providers', passportConf.isAuthorized, provider.add);
router.put('/providers/:id', passportConf.isAuthorized, provider.update);

/*** servicesinfo ***/
router.get('/servicesinfo', passportConf.isAuthorized, servicesinfo.getList);
router.post('/servicesinfo', passportConf.isAuthorized, servicesinfo.add);
router.get('/servicesinfo/:id', passportConf.isAuthorized, servicesinfo.getList);
router.put('/servicesinfo/:id', passportConf.isAuthorized, servicesinfo.update);

/*** notifications ***/
router.get('/notifications', passportConf.isAuthorized, notification.getList);
router.put('/notifications', passportConf.isAuthorized, notification.updateNotification);
router.post('/notifications', passportConf.isAuthorized, notification.sendNotification);

// *** hookslogs ***/
router.get('/hookslogs', passportConf.isAuthorized, hookslogs.getList);


/***Tube***/
router.get('/importlogs', passportConf.isAuthorized, importlog.getList);
router.get('/importlogs/:id', passportConf.isAuthorized, importlog.getById);

router.post('/registerdeviceid',user.registerdeviceid);
router.post('/unregisterdeviceid',user.unregisterdeviceid);

router.post('/getPPtest', passportConf.isAuthorized, orderParser.PPTests);

/*** Exports files ***/
//router.get('/exportfile', passportConf.isAuthorized, fileexport.getFile);

/*** Week Off **/
// router.get('/weekoff', passportConf.isAuthorized, weekoff.getWO);
router.get('/weekoff/:month', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('weekoff', req, res, next);
}, weekoff.getWO);

router.get('/getWORequests', passportConf.isAuthorized, weekoff.getWORequests);

//router.post('/reports',passportConf.isAuthorized,reportController.get);

module.exports = router;
