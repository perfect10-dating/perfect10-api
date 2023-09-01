const QrCodeModel = require("../../models/QrCodeModel");
module.exports = (router) => {
    router.post('/log-qr-code', async (req, res) => {
        let {qrCode} = req.body
        if (!qrCode) {
            return res.status(400).json("Please provide a valid QR code")
        }

        try {
            let qrCodeObject = QrCodeModel.findOne({_id: qrCode}).exec()
            if (!qrCodeObject) {
                console.error("LOG-QR-CODE: qrCodeObject not found")
                return res.status(404).json("This QR code does not exist in the database")
            }

            qrCodeObject.signupCount += 1

            await qrCodeObject.save()

            return res.status(500).json("Updating qrCodeObject successful")
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when logging this QR code")
        }
    })
}