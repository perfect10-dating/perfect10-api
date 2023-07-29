const mongoose = require('mongoose')

const DateReviewSchema = require('./schemas/DateReviewSchema')

const DateReviewModel = mongoose.model('date', DateReviewSchema)

module.exports = DateReviewModel
