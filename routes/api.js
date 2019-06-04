/**
 * Created by anil on 10/03/15.
 */
var express = require('express');
var router = express.Router();
var passportConf = require('../config/passport');
var service = require('../controllers/service.js');
var order = require('../controllers/order.js');
var provider = require("../controllers/provider");
var mlyCity = require("../parser/mly/apiCity");
var mlyServices = require("../parser/mly/apiService");
var mlyArea = require("../parser/mly/apiArea");
var test = require("../controllers/servicesinfo");


router.post('/testwebhook', function(req, res, next) {
    console.log(req.body)
    res.json(true);
});
router.post('/addorder', passportConf.isAuthenticatedApi, function(req, res, next) {
    provider.checkparser('addorder', req, res, next);
}, order.apiAdd);

/*router.post('/notify/:mobilenumber',passportConf.isAuthenticatedApi,user.notifyUser);
router.get('/users/:mobilenumber',passportConf.isAuthenticatedApi,user.searchByMobile);
router.get('/items',passportConf.isAuthenticatedApi,item.getList);
router.get('/appointments/:mobilenumber',passportConf.isAuthenticatedApi,order.getMyOrders);*/




// [ below open api for mly ]
// 
router.get('/getCity', passportConf.isAuthenticatedApi, function(req, res, next) {
    provider.checkparser('getList', req, res, next);
}, mlyCity.getList)

router.get('/getServices', passportConf.isAuthenticatedApi, function(req, res, next) {
    provider.checkparser('getList', req, res, next);
}, mlyServices.getList)


router.get('/getArea', passportConf.isAuthenticatedApi, function(req, res, next) {
    provider.checkparser('getList', req, res, next);
}, mlyArea.getList)

router.get('/getTest', passportConf.isAuthenticatedApi, test.getTestList);
router.get('/getTestById', passportConf.isAuthenticatedApi, test.getTestById);

module.exports = router;