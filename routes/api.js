'use strict';

const express = require('express');
const router = express.Router();

const User = require('../models/user.js');
const Help = require('../models/help.js');

let https = require('https');

var promise = require('promise');

const axios = require('axios');

var jwt = require ('jsonwebtoken');

var instanceDisaster = axios.create({
    baseURL: 'https://api.predicthq.com/v1'
});

var instanceNews = axios.create({
    baseURL: 'https://api.reliefweb.int/v1'
});

var instanceWeather = axios.create({
    baseURL: 'http://api.openweathermap.org/data'
});

var instanceOAuthGmail = axios.create({
    baseURL: 'https://www.googleapis.com/oauth2/v2/userinfo'
});

var instanceOAuthFb = axios.create({
    baseURL: 'https://www.graph.facebook.com/v3.2'
});

var instanceSent = axios.create({
    baseURL: 'https://eastasia.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment'
});
/*
PREDICTHQ.COM

Client secret: 	
0xLu2iA7bXPG9Yj2bqj5NltKZbCOiXJcszCBhPOY

Access token:
7XvdQkOUUrShrqq3QrHCYmwfJod5Oy
*/


//**********************HELP**********************

router.get('/getHelp', function (req, res, next) {
    Help.find({}).sort({emotion:1}).then(function (details) {
        res.send(details);
    });

});

router.get('/getHelpByUser/:email', function (req, res, next) {
    Help.find({ email: req.params.email }).then(function (details) {
        res.send(details);
    });
});

router.get('/getNotVerifiedHelp', function (req, res, next) {
    Help.find({ status: false }).then(function (details) {
        res.send(details);
    });
});

router.get('/getHelpByMobile/:id', function (req, res, next) {
    Help.find({ contact: req.params.id }).then(function (details) {
        res.send(details);
    });
});

router.get('/getHelp/:cat/:loc', function (req, res, next) {
    Help.find({ probType: req.params.cat, location: req.params.loc }).then(function (details) {
        res.send(details);
    });
});

router.get('/deleteById/:id', function (req, res, next) {
    Help.findByIdAndDelete({ _id: req.params.id }).then(function (details) {
        res.send(details);
    }).catch(next);
});


router.post('/addHelp',async function(req,res,next){
    let documents = {
        'documents': [{
            'id': '1',
            'language': 'en',
            'text': req.body.probDesc 
        }]
    };
    var email = "";
    var emotionScore = "";
    var currentTime = Date();
    currentTime = currentTime.toString().slice(4,24);

    instanceDisaster.defaults.headers.common['Ocp-Apim-Subscription-Key'] = '810e478db8d14548aa32f228c027725a';

    await instanceSent.post('/',documents).then(function(response){
        console.log(response.data.documents[0].score);
        emotionScore = response.data.documents[0].score;
        //res.status(200).send(response.data.documents[0].score.toString());
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve sentiments");
        }
    });

    await verifyToken(req.headers['x-access-token'],function(emaill){
        email = emaill;
        console.log(emaill);
    });
    
    Help.create({
        probTitle: req.body.probTitle,
        probType: req.body.probType,
        probDesc: req.body.probDesc,
        emotion: emotionScore,
        status: req.body.status,
        location: req.body.location,
        contact: req.body.contact,
        time: currentTime,
        email: email
    }).then(function (details) {
        console.log("Details sent")
        res.send(details);
    }).catch(next);
});

//**********************DISASTER ALERTS**********************

router.get('/getDisasterAlerts',function(req,res,next){
    var currentDate = new Date();
    currentDate = currentDate.toISOString().slice(0,10);

    instanceDisaster.defaults.headers.common['Authorization'] = 'Bearer 7XvdQkOUUrShrqq3QrHCYmwfJod5Oy';

    //instanceDisaster.get('/events/?limit=5&category=disasters, severe-weather, terror&label=air-quality, biological-hazard, cold-wave, disaster, disaster-warning, drought, dust, earthquake, environment-pollution, epidemic, explosion, fire, heat-wave, hostage-crisis, hurricane, mass-shooting, nuclear, suspected-bombing, suspected-attack, technological-disaster, terror, tornado, tsunami, typhoon, vehicle-accident, volcano, weather, weather-warning, wildfire&country=US&active.gte='+currentDate+'&/')
    instanceDisaster.get('/events/?limit=10&category=disasters, severe-weather, terror&country=US&active.gte='+currentDate+'&/').then(function(response){
        var result = response.data.results;
        var newResult = [];
        
        result.forEach(element => {
            var tempObj={};
            tempObj.title=element.title;
            tempObj.description=element.description;
            tempObj.start=element.start;
            tempObj.end=element.end;
            tempObj.updated=element.updated;
            newResult.push(tempObj);
        });
        res.send(newResult);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve disaster alerts");
        }
    });
});

//**********************NEWS ALERTS**********************

router.get('/getNewsInfo/:id',function(req,res,next){
    
    instanceNews.get('/reports/'+req.params.id).then(function(response){
        var result = response.data.data;
        var newResult = {};
        newResult.title = result[0].fields.title;
        newResult.description = result[0].fields.body;
        newResult.url = result[0].fields.url;
        res.send(newResult);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve news");
        }
    });
});

router.get('/getAllNews',function(req,res,next){
    var body = {
        "filter":
            {
            "field": "country",
            "value": ["India"],
            "operator": "AND"
            }
    };
    instanceNews.post('/reports?appname=disassister',body).then(function(response){
        var result = response.data.data;
        var newResult = [];
        
        result.forEach(element => {
            var tempObj={};
            tempObj.id=element.id;
            tempObj.title=element.fields.title;
            newResult.push(tempObj);
        });
        res.send(newResult);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve news");
        }
    });  
});

//**********************WEATHER ALERTS**********************

router.get('/getWeatherAlerts/:lat/:lon',function(req,res,next){
    instanceWeather.get('/2.5/weather?lat='+req.params.lat+'&lon='+req.params.lon+'&appid=979e544ab2d464b05a32114170a8540f&units=metric').then(function(response){
        var result = response.data;
        var newResult = {};
        newResult.description = result.weather[0].description;
        newResult.temp = result.main.temp;
        newResult.humidity = result.main.humidity;
        newResult.windSpeed = result.wind.speed;
        res.send(newResult);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve weather alerts");
        }
    });  
});

/********************************************************/

router.get('/getUsers',function(req,res,next){
    User.find({}).then(function(details){
        res.send(details);
    }) 
});

router.get('/deleteUsersById/:id', function (req, res, next) {
    User.findByIdAndDelete({ _id: req.params.id }).then(function (details) {
        res.send(details);
    }).catch(next);
});

//**********************OAUTH MODULE**********************

router.post('/addGmailRecord', function(req,res,next){
    instanceOAuthGmail.defaults.headers.common['Authorization'] = 'Bearer ' + req.body.accessToken;
    instanceOAuthGmail.get('/').then(async function(resp){
        //console.log(resp);
        var body = {
            name : resp.data.name,
            email : resp.data.email
        }
        await User.create(body).then(function (details) {
            //res.send(details);
            console.log("User created");
        }).catch(next);
        var gmailtoken = jwt.sign({email: resp.data.email, name: resp.data.name}, "Fuck You Little Bitch");
        console.log("Token generated");
        res.send(gmailtoken);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Invalid or Expired Access Token");
        }
    });  
});

router.get('/verifyToken', function(req, res, next){
    var rToken = req.headers['x-access-token'];
    if (!rToken) 
        return res.status(401).send({ auth: false, message: 'No token provided.' });
  
    jwt.verify(rToken, "Fuck You Little Bitch", function(err, decoded) {
        if (err) 
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        res.status(200).send(decoded);
    });
});

async function verifyToken(accessToken,callback){
    if (!accessToken) 
        return "No token provided";
  
    await jwt.verify(accessToken, "Fuck You Little Bitch", function(err, decoded) {
        if (err) 
            return "Failed to authenticate token";
        //res.status(200).send(decoded);
        //console.log("in jwt "+decoded.email);
        callback(decoded.email);
    });
}

router.post('/addFBRecord', function(req, res,next){
    console.log("Before oauth");
    //console.log(req.body.accessToken)
    instanceOAuthFb.defaults.headers.common['Authorization'] = req.body.accessToken;
    instanceOAuthFb.get('/me?fields=id,name,email').then(function(resp){
        console.log(resp.email);
        var fbtoken = jwt.sign({email: resp.email}, "Fuck You Little Bitch");
        res.send(fbtoken);
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Invalid or Expired Access Token");
        }
    });  
});

//*******************ALL-IN-ALL ALAGHU RAJA******************

var resultFinal = {};

router.get('/getAllAlerts/:lat/:lon',async function(req,res,next){
    var la = req.params.lat;
    var lo = req.params.lon;
    await Promise.all([disasters(),news(),weathers(la,lo)]);
    console.log("Final");
    res.send(resultFinal);
});

//***************DISASTER*****************
async function disasters(){

    var currentDate = new Date();
    currentDate = currentDate.toISOString().slice(0,10);
    instanceDisaster.defaults.headers.common['Authorization'] = 'Bearer 7XvdQkOUUrShrqq3QrHCYmwfJod5Oy';
    //instanceDisaster.get('/events/?limit=5&category=disasters, severe-weather, terror&label=air-quality, biological-hazard, cold-wave, disaster, disaster-warning, drought, dust, earthquake, environment-pollution, epidemic, explosion, fire, heat-wave, hostage-crisis, hurricane, mass-shooting, nuclear, suspected-bombing, suspected-attack, technological-disaster, terror, tornado, tsunami, typhoon, vehicle-accident, volcano, weather, weather-warning, wildfire&country=US&active.gte='+currentDate+'&/')
    await instanceDisaster.get('/events/?limit=10&category=disasters, severe-weather, terror&country=US&active.gte='+currentDate+'&/').then(function(response){
        var result = response.data.results;
        var newResult = [];      
        result.forEach(element => {
            var tempObj={};
            tempObj.title=element.title;
            tempObj.description=element.description;
            tempObj.start=element.start;
            tempObj.end=element.end;
            tempObj.updated=element.updated;
            newResult.push(tempObj);
        });
        resultFinal.disaster = newResult;
        console.log("Disaster");
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve disaster alerts");
        }
    });
}
//****************NEWS*****************
async function news(){
    var body = {
        "filter":
            {
            "field": "country",
            "value": ["India"],
            "operator": "AND"
            }
    };
    await instanceNews.post('/reports?appname=disassister',body).then(function(response){
        var result = response.data.data;
        var newResult = [];
        
        result.forEach(element => {
            var tempObj={};
            tempObj.id=element.id;
            tempObj.title=element.fields.title;
            newResult.push(tempObj);
        });
        resultFinal.news = newResult;
        console.log("News");
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve news");
        }
    });  
}
//*******************WEATHER*******************

async function weathers(la,lo){
    await instanceWeather.get('/2.5/weather?lat='+la+'&lon='+lo+'&appid=979e544ab2d464b05a32114170a8540f&units=metric').then(function(response){
        var result = response.data;
        var newResult = {};
        newResult.description = result.weather[0].description;
        newResult.temp = result.main.temp;
        newResult.humidity = result.main.humidity;
        newResult.windSpeed = result.wind.speed;
        resultFinal.weather = newResult;
        console.log("Weather");
    }).catch(function(err){
        if(err.response){
            console.log(err.response.data);
            res.send("Unable to retrieve weather alerts");
        }
    }); 
}

module.exports = router;