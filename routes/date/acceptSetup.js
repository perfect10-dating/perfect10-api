/*
Rejects a proposed date (TODO -- make this based on auth tokens)
Either party may reject a date until both parties agree to it
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
const {replaceUserInRoom} = require("../room/replaceUserInRoom");
const {userInDate} = require("./userInDate");
module.exports = (router) => {
    router.post('/accept-setup', async (req, res) => {
        try {
            let cognitoId = res.locals.user
            let {dateId} = req.body

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
            let date = await DateModel.findOne({_id: dateId}).populate(["users", "setupResponsibleUser"]).exec()

            if (!userInDate(date, user._id)) {
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
                date.users[i].isNew = false
                promiseArray.push(date.users[i].save())
            }

            await Promise.all(promiseArray)

            // swaps the setupResponsibleUser back into the room matchmaker
            await replaceUserInRoom(date.setupResponsibleUser)
            date.setupResponsibleUser.waitingForRoom = true
            date.setupResponsibleUser.isNew = false
            await date.setupResponsibleUser.save()

            return res.status(200).json("Setup accepted")
        } catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred while you were accepting this setup")
        }
    })
}