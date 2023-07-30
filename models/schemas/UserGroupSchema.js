const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

// A schema to organize the queues of people that can be used to build a room
const UserGroupSchema = new mongoose.Schema({

    // gender of group (man, woman, transMan, transWoman, nonbinary)
    gender: {type: String, required: true},

    // what this group is looking for
    lookingFor: [{type: String, required: true}],

    // age (18-22, 23-27, 28-32, 33-37, etc.)
    minAge: {type: Number, required: true},
    maxAge: {type: Number, required: true},

    // BEGIN: counts
    // the total: free count plus any users in rooms
    totalCount: {type: Number, required: true, default: 0},
    // users available for rooms (not beginner rooms)
    // TODO -- maybe use lower fields
    // freeCount: {type: Number, required: true, default: 0},
    // beginner users available for rooms
    // freeBeginnerCount: {type: Number, required: true, default: 0},
    // END: counts

    // BEGIN: scores
    // these all are always accurate
    totalRoomScore: {type: Number, required: true, default: 0},
    totalSquaredRoomScore: {type: Number, required: true, default: 0},
    totalDates: {type: Number, required: true, default: 0},
    // these both are periodically recalculated
    averageRoomScore: {type: Number, required: true, default: 0},
    // StdDev is calculated as sqrt(totalSquaredRoomScore/totalCount - (totalRoomScore/totalCount)^2)
    roomScoreStdDev: {type: Number, required: true, default: 0},
    // END: scores

    // BEGIN: localization
    // the location is borrowed from the group spawning user
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


}, {timestamps: true})

module.exports = UserGroupSchema