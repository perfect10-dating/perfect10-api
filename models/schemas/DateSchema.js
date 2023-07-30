const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const DateSchema = new mongoose.Schema({

  // whether the date is a set-up
  isSetup: {type: Boolean, required: true},

  // the user proposing the date
  proposer: {type: ObjectId, ref: 'user', index: true, required: true},

  // whether the date has been accepted
  isAccepted: {type: Boolean, required: true, default: false},
  
  // the users going on a date.
  // can be:
  // two users if mutual date
  // one user if set-up
  users: [{type: ObjectId, required: true, ref: 'user', index: true}],

  // if is a setup: the user who has an affected dater profile (by proxy)
  setupResponsibleUser: {type: ObjectId, ref: 'user', index: true, sparse: true},

  // if is a setup: the provisional user profile for the set-ee (TODO -- is this needed?)

  // the time scheduled for the date
  time: {type: Date, required: true},

}, {timestamps: true})

module.exports = DateSchema
