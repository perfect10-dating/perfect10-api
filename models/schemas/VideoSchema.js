const mongoose = require('mongoose')
const Mixed = mongoose.Schema.Types.Mixed
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

const VideoSchema = new mongoose.Schema({
  
  // various information that YouTube gives to us normally
  channelId: requiredString,
  channelTitle: requiredString,
  id: requiredString,
  regionCode: String,
  thumbnails: Mixed,
  
  // index based on the title of the video, prevent duplicates
  title: {type: String, required: true, index: true, unique: true},
  
  // TODO -- additional information that we need
  language: {type: String, required: true, index: true},

}, {timestamps: true})

module.exports = VideoSchema
