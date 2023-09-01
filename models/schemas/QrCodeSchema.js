const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const QrCodeSchema = new mongoose.Schema({

    // the number of people that have signed up using this QR code
    signupCount: {type: Number, required: true, default: 0},

}, {timestamps: true})

module.exports = QrCodeSchema
