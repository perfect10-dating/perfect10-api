const mongoose = require('mongoose')

const MessageSchema = require('./schemas/MessageSchema')

const MessageModel = mongoose.model('message', MessageSchema)

module.exports = MessageModel