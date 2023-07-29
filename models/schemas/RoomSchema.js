const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const RoomSchema = new mongoose.Schema({
  // the user that spawned this room in (their choices are important for future swap-outs)
  spawningUser: {type: ObjectId, ref: 'user', required: true},
  
  // number of people in the room (to start with: 10 or 20 for single or double-sided rooms)
  numPeople: {type: Number, required: true},

  // if the room is single-sided (otherwise is double-sided)
  isSingleSided: {type: Boolean, required: true},

  // the first side of the room
  sideOne: [{type: ObjectId, ref: 'user', required: true}],
  // the identity of the first side
  sideOneIdentity: String,

  // the second side of the room (empty if single-sided)
  sideTwo: [{type: ObjectId, ref: 'user', required: true}],
  // the identity of the second side
  sideTwoIdentity: String,

}, {timestamps: true})

module.exports = RoomSchema
