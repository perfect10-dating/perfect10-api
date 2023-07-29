const mongoose = require('mongoose')

const VideoSchema = require('./schemas/VideoSchema')

const VideoModel = mongoose.model('video', VideoSchema)

module.exports = VideoModel
