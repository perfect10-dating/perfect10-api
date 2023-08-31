const mongoose = require('mongoose')

const RoomSchema = require('./schemas/RoomSchema')
RoomSchema.index({location: '2dsphere'})

const RoomModel = mongoose.model('room', RoomSchema)

module.exports = RoomModel
