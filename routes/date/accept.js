/*
Rejects a proposed date (TODO -- make this based on auth tokens)
Either party may reject a date until both parties agree to it
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
const {userInDate} = require("./userInDate");
const {getOtherUserInDate} = require("./getOtherUserInDate");
module.exports = (router) => {
    router.post('/accept-date', async (req, res) => {
        try {
            let cognitoId = res.locals.user.sub

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

            // checks to see if you're in the date
            if (!userInDate(date, user._id)) {
                return res.status(400).json("You may not attempt to accept the date of two unknown users")
            }

            // checks to see if the other person has accepted another date
            let otherUserInDate = getOtherUserInDate(date, user._id)
            if (otherUserInDate && otherUserInDate.mustReviewDate) {
                return res.status(500).json("This user is no longer available")
            }

            // accepts and saves the date
            date.isAccepted = true
            await date.save()

            // marks users as committed to this date; they are restricted in operations until they review it
            let promiseArray = []
            for (let i = 0; i < date.users.length; i++) {
                date.users[i].mustReviewDate = true
                date.users[i].lockingDate = date._id
                // TODO -- also marks them as no longer new
                /**
                 * Advantages --
                 * 1. isNew prevents users scoring mediocre results from seeing untested users
                 * Disadvantages --
                 * 1. splitting user pools --> slower matchmaking
                 * 2. new people see some profiles that are guaranteed not creepy
                 */
                // date.users[i].isNew = false
                promiseArray.push(date.users[i].save())
            }

            await Promise.all(promiseArray)

            return res.status(200).json("Date accepted")
        } catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when trying to accept this date")
        }
    })
}