const {sendEmail} = require("./sendEmail");
module.exports = (router) => {
    router.post('/test-send-email', async (req, res) => {
        try {
            await sendEmail({
                to: "elliotpotter496@gmail.com",
                subject: "Test Mail!",
                text: "This is a test of the mailing utility!"
            })

            return res.status(200).json("sent")
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when sending test mail")
        }

    })
}