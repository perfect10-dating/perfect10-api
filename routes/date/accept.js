/*
Rejects a proposed date (TODO -- make this based on auth tokens)
Either party may reject a date until both parties agree to it
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
module.exports = (router) => {
    router.post('/accept-date', async (req, res) => {
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
                return res.status(400).json("User is currently locked and may not accept date")
            }

            let {_id} = user

            // find the date
            let date = await DateModel.findOne({_id: dateId}).populate(["users"]).exec()
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
                return res.status(400).json("You may not attempt to accept the date of two unknown users")
            }

            // accepts and saves the date
            date.accepted = true
            await date.save()

            // marks users as committed to this date; they are restricted in operations until they review it
            let promiseArray = []
            for (let i = 0; i < date.users.length; i++) {
                date.users[i].mustReviewDate = true
                date.users[i].lockingDate = date._id
            }

            await Promise.all(promiseArray)

            return res.status(200).json("Date accepted")
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}