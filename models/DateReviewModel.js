const mongoose = require('mongoose')

const DateReviewSchema = require('./schemas/DateReviewSchema')

const DateReviewModel = mongoose.model('date-review', DateReviewSchema)

module.exports = DateReviewModel
