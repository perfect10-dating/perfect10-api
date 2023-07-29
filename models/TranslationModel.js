const mongoose = require('mongoose')

const TranslationSchema = require('./schemas/TranslationSchema')

const TranslationModel = mongoose.model('translation', TranslationSchema)

module.exports = TranslationModel
