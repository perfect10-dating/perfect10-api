const mongoose = require('mongoose')

const QrCodeSchema = require('./schemas/QrCodeSchema')

const QrCodeModel = mongoose.model('qr-code', QrCodeSchema)

module.exports = QrCodeModel