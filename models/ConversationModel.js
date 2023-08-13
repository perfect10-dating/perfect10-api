const mongoose = require('mongoose')

const ConversationSchema = require('./schemas/ConversationSchema')

const ConversationModel = mongoose.model('conversation', ConversationSchema)

module.exports = ConversationModel