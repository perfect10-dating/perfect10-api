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
  emailAddress: {type: String},
  // the first name (displayed)
  firstName: {type: String, required: true},
  // the last name (optional)
  lastName: {type: String},
  // the person's identity (man, woman, transMan, transWoman, nonbinary)
  identity: {type: String, required: true},
  // the person's age (in years)
  age: {type: Number, required: true},
  dateOfBirth: {type: Date, required: true},
  // location (represents the user matchmaking location)
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
  },
  // END SECTION: personally identifiable information

  // BEGIN SECTION: dating preferences
  // the groups that this person may be looking for
  lookingFor: [{type: String, required: true}],

  // if the person is interested in a short term relationship (defaults to long term)
  shortTerm: {type: Boolean, required: true, default: false},

  // the age range that we'll match this person with
  ageRange: {
    min: {type: Number, required: true},
    max: {type: Number, required: true},
  },

  // distance in miles that the match can be.
  // NOTE: to begin with, users may not set this themselves. Instead, a 10-mile radius circle is drawn
  // so no collected users may
  maxDistance: {type: Number, required: true, default: 20},
  // END SECTION: dating preferences

  // BEGIN SECTION: dating history
  // the group the user is scored with respect to
  userGroup: {type: ObjectId, required: true},

  // the user is currently waiting for a room
  waitingForRoom: {type: Boolean, required: true, default: true, index: true},
  // the current room that the user is in
  currentRoom: {type: ObjectId, ref: "room", index: true},
  // the user gets to skip the entry queue (will implement this as a paid feature in the future?)
  entryQueueSkipped: {type: Boolean, required: true, default: false},

  totalScore: {type: Number, required: true, default: 0},
  // the number of dates this person has had
  totalDates: {type: Number, required: true, default: 0},
  // this will be rescored based on total score and adjustments
  roomScore: {type: Number, required: true, default: 0},
  // whether this is the first room someone is entering
  isNew: {type: Boolean, required: true, default: true},

  // in cases of switching -- the user must continue to wait (usually a 3-day timeout) before they join the next room
  // this will prevent waitingForRoom going back to "true"
  temporarilyLocked: {type: Boolean, required: true, default: true},
  // the time when the user will be unlocked (only relevant if temporarilyLocked is true)
  unlockTime: {type: Date, required: false},

  // user needs to review a date before they join a new room
  // this will prevent waitingForRoom going back to "true"
  mustReviewDate: {type: Boolean, required: true, default: false},
  // the date that the user has to review in order to unlock
  lockingDate: {type: ObjectId, ref: 'date'},
  // END SECTION: dating history

}, {timestamps: true})

module.exports = UserSchema
