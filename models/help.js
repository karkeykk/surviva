const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HelpSchema = new Schema({
    probTitle: {
        type: String,
        required: [true,'Title is required']
    },
    probType: {
        type: String,
        //required: [true,'Type is required']
    },
    probDesc:{
        type: String
    },
    email:{
        type: String
    },
    contact: {
        type: String,
        required: [true,'Contact is required']
    },
    visible: Boolean,
    emotion: String,
    location: {
        type: String,
        required: [true,'Location is required']
    },
    time: String
});

const Help = mongoose.model('help', HelpSchema);

module.exports = Help;