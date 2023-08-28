const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const ConversationSchema = new mongoose.Schema({

    // a conversation may be between two users
    users: [{type: ObjectId, required: true, ref: 'user', index: true}],
    // whether the user at Index 0 has read all the messages
    user0Read: {type: Boolean, required: true, default: false},
    // whether the user at Index 1 has read all the messages
    user1Read: {type: Boolean, required: true, default: false},

}, {timestamps: true})

module.exports = ConversationSchema