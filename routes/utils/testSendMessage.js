const {sendPinpointMessage} = require("./sendPinpointMessage");
module.exports = (router) => {
    router.post('/test-send-message', async (req, res) => {
        // this is only legal on test environments
        if (!process.env.MONGO_DB) {
            let {destinationAddress, message} = req.body

            try {
                let response = await sendPinpointMessage({
                    messageType: "PROMOTIONAL", destinationAddress, message
                })
                console.log(response)
                console.log(response.MessageResponse.Result)

                return res.status(200).json("message sent")

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