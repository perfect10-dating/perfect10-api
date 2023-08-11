const mongoose = require('mongoose')

const UserGroupSchema = require('./schemas/UserGroupSchema')
UserGroupSchema.index({location: '2dsphere'})

const UserGroupModel = mongoose.model('user-group', UserGroupSchema)

module.exports = UserGroupModel
