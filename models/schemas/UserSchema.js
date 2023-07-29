const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const UserSchema = new mongoose.Schema({
  
  // BEGIN SECTION: personally identifiable information
  // AWS cognito lookup
  cognitoId: {type: String, required: true, unique: true, index: true},
  // the person MUST have a unique phone number
  phoneNumber: {type: String, required: true, unique: true, index: true},
  // if the person has an email address, it MUST be unique
  emailAddress: {type: String, unique: true},
  // the first name (displayed)
  firstName: {type: String, required: true},
  // the last name (optional)
  lastName: {type: String},
  // the person's identity (man, woman, transMan, transWoman, nonbinary)
  identity: {type: String, required: true},
  // the person's age (in years)
  age: {type: Number, required: true},
  // location (a
  location: {
    type: {
      type: String,
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number], // longitude, then latitude
      required: true
    },
    index: '2dsphere',
  },
  // END SECTION: personally identifiable information

  // BEGIN SECTION: dating preferences
  // the groups that this person may be looking for
  lookingFor: [{type: String, required: true}],

  // the age range that we'll match this person with
  ageRange: {
    minimum: {type: Number, required: true},
    maximum: {type: Number, required: true},
  },

  // distance in miles that the match can be.
  // NOTE: to begin with, users may not set this themselves. Instead, a 10-mile radius circle is drawn
  // so no collected users may
  maxDistance: {type: Number, required: true, default: 20},
  // END SECTION: dating preferences

  // BEGIN SECTION: dating history
  totalScore: {type: Number, required: true, default: 0},
  // this will be rescored based on total score and adjustments
  roomScore: {type: Number, required: true, default: 5},
  isNew: {type: Boolean, required: true, default: true},
  // END SECTION: dating history

}, {timestamps: true})

module.exports = UserSchema
