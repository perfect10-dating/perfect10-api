const mongoose = require('mongoose')

const UserQueueSchema = require('./schemas/UserQueueSchema')

const UserQueueModel = mongoose.model('userQueue', UserQueueSchema)

module.exports = UserQueueModel
