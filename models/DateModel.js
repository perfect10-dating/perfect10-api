const mongoose = require('mongoose')

const DateSchema = require('./schemas/DateSchema')

const DateModel = mongoose.model('date-review', DateSchema)

module.exports = DateModel
