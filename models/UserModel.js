const mongoose = require('mongoose')

const UserSchema = require('./schemas/UserSchema')
UserSchema.index({location: '2dsphere'})

const UserModel = mongoose.model('user', UserSchema)

module.exports = UserModel
