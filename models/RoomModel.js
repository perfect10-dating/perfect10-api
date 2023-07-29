const mongoose = require('mongoose')

const RoomSchema = require('./schemas/RoomSchema')

const RoomModel = mongoose.model('room', RoomSchema)

module.exports = RoomModel
