var redis = require('redis');
var secrets = require('../config/secrets');

/** connect to redis **/
redisClient = redis.createClient(secrets.redisPort,secrets.redisHost, {no_ready_check: true});

redisClient.auth(secrets.redisPassword, function (err) {
  if (err){
  	console.log('Error connecting to Redis')
  	console.error(err);
  }
});

redisClient.on('connect', function() {
    console.log('Connected to Redis');
});

module.exports = redisClient;
