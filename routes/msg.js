const { text } = require('express');
const mongoose = require('mongoose');


const msgSchema = mongoose.Schema({
    data: Buffer,
    fromUser: String,
    toUser:String,
    messageType:{
        type: String,
        enum:[ 'text', 'image', 'video', 'document'],
        default: text,
    },
    content: String,
    fileName: String,
});

module.exports = mongoose.model('msg', msgSchema);