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
  sideOneIdentity: {type: String, required: true, index: true},
  // the score range for Side 1
  sideOneScores: {min: Number, max: Number},
  // the age range for Side 1 (NOTE -- this is the range of ages for Side2 if two-sided)
  sideOneAgeRange: {min: Number, max: Number},
  // the length of the first array
  sideOneSize: {type: Number, required: true, default: 0},

  // the second side of the room (empty if single-sided)
  sideTwo: [{type: ObjectId, ref: 'user', required: true}],
  // the identity of the second side
  sideTwoIdentity: {type: String, index: true, sparse: true},
  // the score range for Side 2
  sideTwoScores: {min: Number, max: Number},
  // the age range for Side 2 (NOTE -- this is the range of ages for Side1)
  sideTwoAgeRange: {min: Number, max: Number},
  // the length of the second array
  sideTwoSize: {type: Number, required: true, default: 0},

  // the users that we DO NOT allow back into the room (they swapped out)
  bannedUserList: [{type: ObjectId, ref: 'user', required: true}],

}, {timestamps: true})

module.exports = RoomSchema
