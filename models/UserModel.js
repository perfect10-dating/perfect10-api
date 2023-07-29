const mongoose = require('mongoose')

const UserSchema = require('./schemas/UserSchema')

const UserModel = mongoose.model('user', UserSchema)

module.exports = UserModel
