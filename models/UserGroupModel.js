const mongoose = require('mongoose')

const UserGroupSchema = require('./schemas/UserGroupSchema')

const UserGroupModel = mongoose.model('user-group', UserGroupSchema)

module.exports = UserGroupModel
