const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const DateReviewSchema = new mongoose.Schema({

  // who "you" are
  reviewer: {type: ObjectId, ref: 'user', required: true, index: true},
  // can be either the person you went on a date with, or a proxy (if it was a set-up)
  reviewee: {type: ObjectId, ref: 'user', required: true, index: true},

  // the attached date object
  dateObject: {type: ObjectId, ref: 'date', required: true, index: true},

  // the review itself
  // Did your date show up?
  wasNoShow: {type: Boolean, required: true, default: false},

  // Did your date look like their photos?
  wasCatfish: {type: Boolean, required: true, default: false},

  // Did your date make you feel unsafe?
  wasThreatening: {type: Boolean, required: true, default: false},

  // "How intelligent did you find your date? (1-10)"
  intelligent: {type: Number, required: true},

  // "How trustworthy did you find your date? (1-10)"
  trustworthy: {type: Number, required: true},

  // "How attractive did you find your date? (1-10)"
  attractive: {type: Number, required: true},

  // "How pleasant of a conversation partner did you find your date? (1-10)"
  pleasant: {type: Number, required: true},

  // "How satisfied were you with your date overall? (1-10)"
  // I'm planning on having this be the only (or primary?) deciding factor at first
  satisfied: {type: Number, required: true},

  // "Would you like a second date with this person? (Boolean)"
  secondDate: {type: Boolean, required: true},

}, {timestamps: true})

module.exports = DateReviewSchema
