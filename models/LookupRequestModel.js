const mongoose = require('mongoose')

const LookupRequestSchema = require('./schemas/LookupRequestSchema')

const LookupRequestModel = mongoose.model('lookup-request', LookupRequestSchema)

module.exports = LookupRequestModel