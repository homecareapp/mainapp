var RSMQWorker = require( "rsmq-worker" );
var redisClient = require('./redisclient');
var webhooks_order = new RSMQWorker( "webhooks_order",{ 
  redis : redisClient,
  timeout:30000 
});

var async = require('async');
var urlParser = require('url');
var Provider = require('../models/Provider');
var Order = require('../models/Order');
var http = require('http');
var https = require('https');

webhooks_order.on("message",function(msg,next){
  msg = JSON.parse(msg);
  Order.findOne({_id : msg._id},function(err,doc){
    if(err)
      return next(doc);
    Provider.processHook('order', doc ,function(err){
      return next(err);
    })
  })
})
message_eventhandler(webhooks_order);

function message_eventhandler(worker){
  // optional error listeners
  worker.on('error', function( err, msg ){
      console.log( "ERROR", err, msg.id );
  });
  worker.on('exceeded', function( msg ){
      console.log( "EXCEEDED", msg.id );
  });
  worker.on('timeout', function( msg ){
      console.log( "TIMEOUT", msg.id, msg.rc );
  });
}


exports.startworkers = function(){
  webhooks_order.start();
}