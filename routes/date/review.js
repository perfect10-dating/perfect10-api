/*
This route allows the user to write a date review for another user
 */
const UserModel = require("../../models/UserModel");
const DateReviewModel = require("../../models/DateReviewModel");
const {removeUserFromRoom} = require("../room/replaceUserInRoom");
module.exports = (router) => {
    router.post('/review-date', async (req, res) => {
        try {
            let {cognitoId, intelligent, trustworthy, attractive, pleasant, satisfied, secondDate} = req.body

            if (!cognitoId || !intelligent || !trustworthy || !attractive || !pleasant || !satisfied || !secondDate) {
                return res.status(400).json("Please include all required fields of this request")
            }

            let user = await UserModel.findOne({cognitoId}).populate("lockingDate").exec()
            if (!lockingDate) {
                return res.status(400).json("You're attempting to review a nonexistent date")
            }

            // find the id of the other person on the date
            let otherUser
            if (user.lockingDate.setupResponsibleUser && user.lockingDate.setupResponsibleUser._id+"" !== user._id+"") {
                otherUser = user.lockingDate.setupResponsibleUser
            }
            else {
                for (let i = 0; i < user.lockingDate.users.length; i++) {
                    if (user.lockingDate.users[i]+"" !== user._id+"") {
                        otherUser = user.lockingDate.users[i]
                    }
                }
            }

            // create a new date review
            let dateReview = new DateReviewModel({
                reviewer: user._id,
                reviewee: otherUser,
                dateObject: user.lockingDate,
                intelligent,
                trustworthy,
                attractive,
                pleasant,
                satisfied,
                secondDate
            })

            // save the review
            await dateReview.save()

            // release yourself
            user.mustReviewDate = false
            await user.save()

            // swap yourself out of your old room and into a new room
            await removeUserFromRoom(user)
            user.waitingForRoom = true
            await user.save()

            // TODO -- edit the other person's score based on your review

            return res.status(200).json("Successfully reviewed date")
        }
        catch(err) {
            console.error(err)
            return res.status(500).json("An error occurred when submitting your date review")
        }
    })
}