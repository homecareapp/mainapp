var express = require('express');
var router = express.Router();
var passportConf = require('../config/passport');
var order = require("../controllers/order");
var call = require("../controllers/call");
var client = require("../controllers/client");
var partnerservice = require('../controllers/partnerservice');
var area = require('../controllers/area');
var city = require('../controllers/city');
var provider = require("../controllers/provider");

/*var provider = require('../controllers/provider');
var order = require('../controllers/order');
var branch = require('../controllers/branch');
var document = require('../controllers/document');
var user = require('../controllers/user');
var item = require('../controllers/item');*/

/*router.get('/checkuser/:mobilenumber',user.checkUser);
router.get('/register',user.getPassword);
router.post('/login',user.mobileLogin);

//requires authentication for below api's
router.post('/registerdeviceid',passportConf.isAuthenticated,passportConf.isAuthorized,user.registermobileuserdeviceid);
router.post('/unregisterdeviceid',passportConf.isAuthenticated,passportConf.isAuthorized,user.unregistermobileuserdeviceid);
router.get('/orders',passportConf.isAuthenticated,passportConf.isAuthorized,order.getMyOrders);
router.post('/orders',passportConf.isAuthenticated,passportConf.isAuthorized,order.add);
router.get('/profile',passportConf.isAuthenticated,passportConf.isAuthorized,user.get);
router.put('/profile',passportConf.isAuthenticated,passportConf.isAuthorized,user.updateProfile);
router.get('/branches',passportConf.isAuthenticated,passportConf.isAuthorized,branch.getListByProximity);
router.get('/items',passportConf.isAuthenticated,passportConf.isAuthorized,item.getList);*/

// orders
// router.post('/orders', passportConf.isAuthorized, order.add);
router.post('/orders', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('addorder', req, res, next);
}, order.add);

router.put('/updatestatus/:id', passportConf.isAuthorized, order.mapiUpdateStatus)


router.put('/orders/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('updateOrder', req, res, next);
}, order.update);


router.get('/getParentOrders/:id', passportConf.isAuthorized, order.getParentOrders)

/*
router.get('/orders/:id', passportConf.isAuthorized, function(req, res, next) {
    provider.checkparser('getOrderList', req, res, next);
}, order.getList);
*/
//router.get('/orders/:id', passportConf.isAuthorized, order.getList);

//router.get('/orders', passportConf.isAuthorized, order.getList);

// router.get('/orders', passportConf.isAuthorized, function(req, res, next) {
//     provider.checkparser('getOrderList', req, res, next);
// }, order.getList);

/*** Client ***/
router.get('/clients', passportConf.isAuthorized, client.getList);
router.get('/clients/:id', passportConf.isAuthorized, client.getList);
router.post('/clients', passportConf.isAuthorized, client.add);
router.put('/clients/:id', passportConf.isAuthorized, client.update);

/*** Partner Test Services**/
router.get('/partnerservices', passportConf.isAuthorized, partnerservice.getList);
router.get('/partnerservices/:id', passportConf.isAuthorized, partnerservice.getList);
router.post('/partnerservices', passportConf.isAuthorized, partnerservice.add);
router.put('/partnerservices/:id', passportConf.isAuthorized, partnerservice.update);

/***Area***/
router.get('/areas/:id', passportConf.isAuthorized, area.getList);
router.get('/areas', passportConf.isAuthorized, area.getList);
router.post('/areas', passportConf.isAuthorized, area.add);
router.put('/areas/:id', passportConf.isAuthorized, area.update);

/***City***/
router.get('/cities/:id', passportConf.isAuthorized, city.getList);
router.get('/cities', passportConf.isAuthorized, city.getList);
router.post('/cities', passportConf.isAuthorized, city.add);
router.put('/cities/:id', passportConf.isAuthorized, city.update);



//router.post('/orders', passportConf.isAuthorized, order.add);


module.exports = router;
