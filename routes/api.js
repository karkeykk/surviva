const express = require('express');
const router = express.Router();

const Helper = require('../models/helper.js');
const Victim = require('../models/victim.js');

router.get('/getHelp',function(req,res,next){
    //console.log("gettttt");
    Victim.find({}).then(function(details){
        res.send(details);
    });
});

router.get('/getVerifiedHelp',function(req,res,next){
    Victim.findById({status:'Verified'}).then(function(details){
        res.send(details);
    });
});

router.get('/getNotVerifiedHelp',function(req,res,next){
    Victim.findById({status:'NotVerified'}).then(function(details){
        res.send(details);
    });
});

router.post('/addHelper',function(req,res,next){
    Helper.create(req.body).then(function(details){
        res.send(details);
    }).catch(next);
});

router.post('/addHelp',function(req,res,next){
    Victim.create(req.body).then(function(details){
        res.send(details);
    }).catch(next);
});

module.exports = router;