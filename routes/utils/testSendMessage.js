const {sendPinpointMessage} = require("./sendPinpointMessage");
module.exports = (router) => {
    router.post('/test-send-message', async (req, res) => {
        // this is only legal on test environments
        if (!process.env.MONGO_DB) {
            let {destinationAddress, message} = req.body

            try {
                await sendPinpointMessage({
                    messageType: "TRANSACTIONAL", destinationAddress, message
                })

            } catch (err) {
                console.error(err)
                return res.status(500).json("Testing message send failed")
            }
        }
        else {
            return res.status(400).json("Nope.")
        }
    })
}