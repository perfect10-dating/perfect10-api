const mongoose = require('mongoose')

const UserGroupSchema = require('./schemas/UserGroupSchema')

const UserGroupModel = mongoose.model('userQueue', UserGroupSchema)

module.exports = UserGroupModel
