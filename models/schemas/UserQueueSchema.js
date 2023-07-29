const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

// A schema to organize the queues of people that can be used to build a room
const UserQueueSchema = new mongoose.Schema({

    // gender of person (man, woman, transMan, transWoman, nonbinary)
    gender: {type: String, required: true},

    // what this person is looking for
    lookingFor: [{type: String, required: true}],

    // age (18-22, 23-27, 28-32, 33-37, etc.)
    minAge: {type: Number, required: true},
    maxAge: {type: Number, required: true},

    // BEGIN: counts
    // the total: free count plus any users in rooms
    totalCount: {type: Number, required: true, default: 0},
    // users available for rooms (not beginner rooms)
    freeCount: {type: Number, required: true, default: 0},
    // beginner users available for rooms
    freeBeginnerCount: {type: Number, required: true, default: 0},
    // END: counts

    // BEGIN: scores
    // these both are always accurate
    totalScore: {type: Number, required: true, default: 0},
    totalDates: {type: Number, required: true, default: 0},
    // these both are periodically recalculated
    averageRoomScore: {type: Number, required: true, default: 0},
    roomScoreStdDev: {type: Number, required: true, default: 0},
    // END: scores

}, {timestamps: true})

module.exports = UserQueueSchema