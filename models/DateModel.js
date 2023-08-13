const mongoose = require('mongoose')

const DateSchema = require('./schemas/DateSchema')

const DateModel = mongoose.model('date', DateSchema)

module.exports = DateModel
