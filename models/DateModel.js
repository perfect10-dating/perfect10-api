const mongoose = require('mongoose')

const VideoSchema = require('./schemas/VideoSchema')

const DateModel = mongoose.model('video', VideoSchema)

module.exports = DateModel
