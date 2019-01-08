'use strict';

const express = require('express');
const router = express.Router();

const Helper = require('../models/helper.js');
const Victim = require('../models/victim.js');

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

var instanceOAuth = axios.create({
    baseURL: 'https://www.googleapis.com/oauth2/v2/userinfo'
});

/*
PREDICTHQ.COM

Client secret: 	
0xLu2iA7bXPG9Yj2bqj5NltKZbCOiXJcszCBhPOY

Access token:
7XvdQkOUUrShrqq3QrHCYmwfJod5Oy
*/

var emotionScore = "";
var flg = true;
let response_handler = function (response) {
    let body = '';
    response.on('data', function (d) {
        body += d;
    });
    response.on('end', function () {
        let body_ = JSON.parse(body);
        //var body__ = JSON.stringify (body_, null, '  ');
        console.log(body_.documents[0].score);
        emotionScore = body_.documents[0].score;
        flg = false;
        //console.log(emotin);
    });
    response.on('error', function (e) {
        console.log('Error: ' + e.message);
    });
};

function get_sentiments(documents) {
    return new Promise((resolve, reject) => {
        let body = JSON.stringify(documents);
        let request_params = {
            method: 'POST',
            hostname: 'eastus.api.cognitive.microsoft.com',
            path: '/text/analytics/v2.0/sentiment',
            headers: {
                'Ocp-Apim-Subscription-Key':'840cc8c3afcc4edb9e6910b408eff236'
            }
        };
        let req = https.request(request_params, response_handler);
        req.write(body);
        req.end();
        resolve(req);
    });
}

function get_sentiment(documents) {
    let body = JSON.stringify(documents);
    let request_params = {
        method: 'POST',
        hostname: 'eastus.api.cognitive.microsoft.com',
        path: '/text/analytics/v2.0/sentiment',
        headers: {
            'Ocp-Apim-Subscription-Key': '840cc8c3afcc4edb9e6910b408eff236'
        }
    };
    let req = https.request(request_params, response_handler);
    req.write(body);
    req.end();
    return (req);
}


//**********************HELP**********************

router.get('/getHelp', function (req, res, next) {
    Victim.find({}).then(function (details) {
        res.send(details);
    });

});

router.get('/getVerifiedHelp', function (req, res, next) {
    Victim.find({ status: true }).then(function (details) {
        res.send(details);
    });
});

router.get('/getNotVerifiedHelp', function (req, res, next) {
    Victim.find({ status: false }).then(function (details) {
        res.send(details);
    });
});

router.get('/getHelpByMobile/:id', function (req, res, next) {
    Victim.find({ contact: req.params.id }).then(function (details) {
        res.send(details);
    });
});

router.get('/getHelp/:cat/:loc', function (req, res, next) {
    Victim.find({ probType: req.params.cat, location: req.params.loc }).then(function (details) {
        res.send(details);
    });
});

router.get('/deleteById/:id', function (req, res, next) {
    Victim.findByIdAndDelete({ _id: req.params.id }).then(function (details) {
        res.send(details);
    }).catch(next);
});

router.post('/addHelper', function (req, res, next) {
    Helper.create(req.body).then(function (details) {
        res.send(details);
    }).catch(next);
});

router.post('/addHelp', function (req, res, next) {
    let documents = {
        'documents': [
            { 'id': '1', 'language': 'en', 'text': req.body.probDesc }
        ]
    }
    var currentTime = Date();
    currentTime = currentTime.toString().slice(4,24);
    
    get_sentiments(documents).then(function () {
        console.log("hello");
    });
    setTimeout(function () {
        Victim.create({
            probTitle: req.body.probTitle,
            probType: req.body.probType,
            probDesc: req.body.probDesc,
            emotion: emotionScore,
            status: req.body.status,
            victimName: req.body.victimName,
            location: req.body.location,
            contact: req.body.contact,
            time: currentTime,
            email: req.body.email
        }).then(function (details) {
            res.send(details);
        }).catch(next);
    }, 8000);
});

router.post('/addHep', async function (req, res, next) {
    let documents = {
        'documents': [
            { 'id': '1', 'language': 'en', 'text': req.body.probDesc }
        ]
    }
    var currentTime = Date();
    currentTime = currentTime.toString().slice(4,24);

    await get_sentiment(documents);
    console.log("hii");
    Victim.create({
        probTitle: req.body.probTitle,
        probType: req.body.probType,
        probDesc: req.body.probDesc,
        emotion: emotionScore,
        status: req.body.status,
        victimName: req.body.victimName,
        location: req.body.location,
        contact: req.body.contact,
        time: currentTime,
        email: req.body.email
    }).then(function (details) {
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


//**********************OAUTH MODULE**********************

router.post('/addRecord', function(req, res,next){
    instanceOAuth.defaults.headers.common['Authorization'] = 'Bearer ' + req.body.accessToken;
    instanceOAuth.get('/').then(function(resp){
        console.log(resp.data.email);
        var token = jwt.sign({email: resp.data.email}, "Fuck You Little Bitch");
        res.send(token);
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

//*******************ALL-IN-ALL ALAGHU RAJA******************

var resultFinal = {};
router.get('/getAlerts/:lat/:lon',async function(req,res,next){

//***************DISASTER*****************

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

//****************NEWS*****************

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

//*******************WEATHER*******************

    await instanceWeather.get('/2.5/weather?lat='+req.params.lat+'&lon='+req.params.lon+'&appid=979e544ab2d464b05a32114170a8540f&units=metric').then(function(response){
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

    console.log("Final");
    res.send(resultFinal);
});
  

module.exports = router;