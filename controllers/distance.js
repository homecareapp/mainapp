var mongoose = require('mongoose');
var async = require('async');
var Model = require('../models/Distance');

exports.getList = function(req, res, next){
  var search={};
  if (req.query.majorarea) {
  search["majorarea"]=req.query.majorarea;

  } 
  Model.find(search,function(err, result){
    if(err) return next(new Error(err));

    res.json(result);
  });
};

// exports.add = function(req, res, next){
//   var data = req.body;
//   var from = data.from;
//   var to = data.to;
//   var distance = data.distance;
//   var majorarea = data.majorarea;

//   var search = {
//     from: from,
//     to: to    
//   }

//   Model.findOne(search,function(err, resDistance){
//     //console.log(resDistance);
//     if(resDistance)  return next(new Error("Distance already present"));

//     var distances = [
//       { from: from, to: to, distance:distance ,majorarea: majorarea },
//       { from: to, to: from, distance:distance ,majorarea: majorarea }
//     ]
    
//     async.each(distances,function(dObj,nextdistance){
//       d = new Model(dObj);
//       d.save(function(err, result){
//         if (err) { return nextdistance(err)};
//         return nextdistance();
//       });
//     },function(err){
//       if (err) { return next(err)};
//       return res.json();
//     })
//   });  
// };

exports.add = function(req,res,next){
  var data = req.body;
  var search = {};
  var newdata = {};
  var datafound = [];

  if (data.distances) {
    async.eachSeries(data.distances,function(dObj,nextdistance){
      search = {};
      newdata={};
      search["from"]=dObj.from;
      search["to"]=dObj.to;
      search["majorarea"]=dObj.majorarea;

      Model.find(search, function (error, obj) {
        if (error) return next(error);
        if (obj.length) {
          datafound.push(dObj);
          return nextdistance();
        }

        newdata.from=dObj.from;
        newdata.distance=dObj.distance;
        newdata.to=dObj.to;
        newdata.majorarea=dObj.majorarea;

        var distance = new Model(newdata);
        distance.save(function (e, abresult) {
          if (e) return next(e);
          return nextdistance();

          // newdata = {};
          // newdata.from=dObj.to;
          // newdata.to=dObj.from;
          // newdata.distance=dObj.distance;
          // newdata.majorarea=dObj.majorarea;

          // var distance = new Model(newdata);
          // distance.save(function(e, baresult){
          //   if (e) return next(e);
          //   console.log("ok");
          //   return nextdistance();
          // })
        });
      })
    },function (e) {
      if (e) return next(e);

      if (datafound.length) {
        res.json({
          message: "Data already exist"
        })
      } else{
        res.json({
          message: "Successfully insert"
        })
      };
      
    })
  }
  else{
    res.json({
      message: "Distance object not found"
    })
  }
}

// exports.update = function(req, res, next){
//   var search = {};
//   var distanceList = req.body.distances;
//   for (var i = 0; i < distanceList.length; i++) {
    
//     if (distanceList[i].from && distanceList[i].to){
//       $or : [
//           { $and : [ { from : distanceList[i].from }, { to : distanceList[i].to } ] },
//           { $and : [ { from : distanceList[i].to }, { to : distanceList[i].from } ] }
//       ]
//     }
//     Model.update(search,{distance: distanceList[i].distance},{multi:true},function(err, result){
//       if (err) next(new Error("Something went wrong during update." + err));
//       return res.json(result);
//     })
//   };  
//   //else
//     //return next(new Error("Please send from and to Area."));
 
  
// };


exports.update = function(req, res, next){
  var search = {};
  var data = req.body;
  var data = req.body;
  if(!data.distances) return req.json({message:"Distances not found"});
  
  async.eachSeries(data.distances, function(distance, nextdistance){
      if (!distance.from) return nextdistance();
      if (!distance.to) return nextdistance();
      
      search.from = distance.from;
      search.to = distance.to;
      search.majorarea = distance.majorarea;

      Model.find(search,function(err,obj){
        if (err) return nextdistance();
        //New Object
        //console.log(obj);
        if(obj.length==0) {
          var newDistanceObj  = new Model(distance);
          newDistanceObj.save(function(err, dObj){
            if (err) return next(err);
            
            return nextdistance();
          })          
        }

        //Update
        else{
          obj[0].distance = distance.distance;
          obj[0].save(function(e, result){
            if (e) return next(e);

            return nextdistance();         
          });
        }
      })
    },
    //Final function
    function(e){
    if (e) return next(e);

    return res.json({
      message:"Successfully updated"
    })
  });
};