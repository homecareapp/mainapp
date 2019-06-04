	var express = require('express');
	var router = express.Router();
	var userController = require('../controllers/user');
	var migration = require('../controllers/migration');
	var container = require('../controllers/container.js');

	/*var integrator = require('../controllers/integrator');
	var medsearch = require('../controllers/medsearch');*/


	/* GET home page. */
	router.get('/', function(req, res, next) {
	    res.send('index.html');
	});

	router.post('/login', userController.postLogin);
	router.get('/resetpassword/:id', userController.resetPassword);

	router.get('/checkApiContainer', container.count);

	router.get('/migrateclientaddress', migration.mgrClient);
	router.get('/migrateorderaddress', migration.mgrOrder);

	module.exports = router;
