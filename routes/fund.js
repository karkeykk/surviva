const express = require ('express');
const router = express.Router();
const Ninja = require('../models/fund.js');
const multer = require('multer');

var imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './imageUploads')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split('/')[1];
        cb(null, file.fieldname + '-' + Date.now() + '.' + ext)
    }
});


const imageUpload = multer({ storage : imageStorage});



router.post('/imageUpload', imageUpload.single('image'), function(req,res,next)  {
    
    var currentTime = Date();
    currentTime = currentTime.toString().slice(4,24);

    var formData = {
        title: req.body.title,
        description: req.body.description,
        image: req.file.filename,
        time: currentTime
    } 

    Ninja.create(formData, function(err, ninja){
        if(ninja)
            res.send(ninja);
        else    
            res.send({error: "Error creating User!"});
    })
    console.log(formData);
    res.send("Success");
});




module.exports = router;
