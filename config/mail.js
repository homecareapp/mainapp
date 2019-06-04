/**
 * Created by anil on 09/03/15.
 */
var mandrill = require('mandrill-api/mandrill');
var secrets = require('./secrets');

var mandrill_client = new mandrill.Mandrill(secrets.mandrill.password);

var send = function(alert,callback){

    var template_name = alert.event+alert.provider_id;
    var subaccount = alert.provider_id;
    var fromemail = alert.fromemail;
    var toemail = alert.toemail;
    var lineitems = alert.lineitems;

    var from = fromemail;
    //var subject = doc.provider_id.emailtemplates[doc.event].subject;

    //doc.provider_id.emailtemplates[doc.event].template;
    var template_content = [{
        "name": "lineitems",
        "content": lineitems
    }];
    var message = {
      "to": [{
       "email": toemail, //TODO
       "type": "to"
       }],
       "headers": {
       "Reply-To": from
       },
       "subaccount": subaccount
    };
    var async = true;
    mandrill_client.messages.sendTemplate({
      "template_name":template_name,
      "template_content":template_content,
      "async":async,
      "message": message
    },
    function(result){
      return callback(null,result);
    },
    function(e){
      console.log('Error :'+ e.name + '-' + e.message);
      return callback(new Error(e.message));
    });
};

module.exports={
    client:mandrill_client,
    send:send
};
