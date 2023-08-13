const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const ConversationSchema = new mongoose.Schema({

    // a conversation may be between two users
    users: [{type: ObjectId, required: true, ref: 'user', index: true}]

}, {timestamps: true})

module.exports = ConversationSchema