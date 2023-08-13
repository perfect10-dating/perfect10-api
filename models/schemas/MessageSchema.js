const mongoose = require("mongoose");
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const MessageSchema = new mongoose.Schema({

    text: {type: String},
    isImage: {type: Boolean},
    imageUrl: {type: String},
    conversation: {type: ObjectId, ref: 'conversation', required: true, index: true},
    sender: {type: ObjectId, red: 'user'}

}, {timestamps: true})

module.exports = MessageSchema