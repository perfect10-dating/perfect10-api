/*
Rejects a proposed date (TODO -- make this based on auth tokens)
Either party may reject a date until both parties agree to it
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
module.exports = (router) => {
    router.post('/reject-date', async (req, res) => {
        try {
            let {cognitoId, dateId} = req.body

            if (!cognitoId || !dateId) {
                return res.status(400).json("Specify your cognitoId and the date ID")
            }

            // get your own ID
            let user = await UserModel.findOne({cognitoId})
                .select(["_id", "isTemporarilyLocked", "mustReviewDate"]).lean().exec()
            if (!user) {
                return res.status(400).json("Invalid cognitoID")
            }
            if (user.isTemporarilyLocked || user.mustReviewDate) {
                return res.status(400).json("User is currently locked and may not reject date")
            }

            let {_id} = user

            // create a new date
            let date = await DateModel.findOne({_id: dateId}).exec()
            let userInDate = false
            for (let i = 0; i < date.users.length; i++) {
                if (date.users[i] + "" === _id + "") {
                    userInDate = true
                }
            }
            if (date.isSetup && date.setupResponsibleUser+"" === _id+"") {
                userInDate = true
            }

            if (!userInDate) {
                return res.status(400).json("You may not attempt to cancel the date of two unknown users")
            }

            await DateModel.deleteOne({_id: dateId}).exec()

            return res.status(200).json("Date declined")
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}