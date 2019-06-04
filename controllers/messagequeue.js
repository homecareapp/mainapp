var RedisSMQ = require("rsmq");
var redisClient = require('./redisclient');

var rsmq = new RedisSMQ( {host: "127.0.0.1", port: 6379, ns: "rsmq" ,client:redisClient} );

rsmq.createQueue({qname:"webhooks_order"}, function (err, resp) {
  if (resp===1) {
    console.log("webhooks_order queue created")
  }
});

exports.sendMessage = function(data,callback){
  if(!rsmq.redis.connected) return callback(new Error('Not connected to Redis'));
  rsmq.sendMessage(data,callback);
};
