const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const LookupRequestSchema = new mongoose.Schema({
  
  lookingUser: {type: ObjectId, required: true, ref: 'user'},
  
  // there is one of two pieces of information: either email address or userId
  queryEmail: {type: String},
  queryUser: {type: ObjectId, ref: 'user'},
  
  // if the other person looks this person up
  isMutual: {type: Boolean, required: true, default: false}
  
}, {timestamps: true})

module.exports = LookupRequestSchema
