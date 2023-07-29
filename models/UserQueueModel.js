const mongoose = require('mongoose')

const UserQueueSchema = require('./schemas/UserQueueSchema')

const UserQueueModel = mongoose.model('video', UserQueueSchema)

module.exports = UserQueueModel
