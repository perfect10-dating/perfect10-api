/*
This route allows the user to write a date review for another user
 */
const UserModel = require("../../models/UserModel");
const DateReviewModel = require("../../models/DateReviewModel");
const {removeUserFromRoom} = require("../room/replaceUserInRoom");
const {generateScore} = require("./generateScore");
module.exports = (router) => {
    router.post('/review-date', async (req, res) => {
        try {
            let cognitoId = res.locals.user
            let {wasNoShow, wasCatfish, wasThreatening, intelligent, trustworthy,
                attractive, pleasant, satisfied, secondDate} = req.body

            if (!cognitoId || wasNoShow===undefined || wasCatfish===undefined || wasThreatening===undefined ||
                !intelligent || !trustworthy || !attractive || !pleasant || !satisfied ||
                secondDate===undefined) {
                return res.status(400).json("Please include all required fields of this request")
            }

            for (let field of [intelligent, trustworthy, attractive, pleasant, satisfied]) {
                if (field < 1 || field > 10) {
                    return res.status(400).json("Numerical fields must be between 1 and 10")
                }
            }

            let user = await UserModel.findOne({cognitoId}).populate({
                path: "lockingDate",
                populate: [{
                    path: "setupResponsibleUser",
                    select: ["_id", "totalScore", "totalDates", "roomScore", "userGroups"],
                    populate: ["userGroups"]
                }, {
                    path: "users",
                    select: ["_id", "totalScore", "totalDates", "roomScore", "userGroups"],
                    populate: ["userGroups"]
                }]
            }).exec()
            if (!user.lockingDate) {
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
                reviewee: otherUser._id,
                dateObject: user.lockingDate,
                wasNoShow, wasCatfish, wasThreatening,
                intelligent, trustworthy, attractive, pleasant, satisfied, secondDate
            })

            // save the review
            await dateReview.save()
            console.log("DATE-REVIEW: Saved new review")

            // release yourself
            user.mustReviewDate = false
            await user.save()

            // swap yourself out of your old room and allow yourself to choose to join a new one
            await removeUserFromRoom(user)
            user.currentRoom = null
            await user.save()
            console.log("DATE-REVIEW: Swapped reviewing user out of room")

            // edit the other person's score based on your review
            let {totalScore, totalDates, roomScore} = generateScore(
                otherUser.totalScore,
                otherUser.totalDates,
                wasNoShow, wasCatfish, wasThreatening,
                intelligent, trustworthy, attractive, pleasant, satisfied, secondDate
            )

            otherUser.totalScore = totalScore
            otherUser.totalDates = totalDates
            otherUser.roomScore = roomScore

            // save the new score
            await otherUser.save()
            console.log("DATE-REVIEW: Edited other user score")

            // find the user group the other user belongs to
            let otherUserGroups = otherUser.userGroups
            for (let i = 0; i < otherUserGroups.length; i++) {
                // calculate the new mean and std dev
                otherUserGroups[i].totalDates += 1
                otherUserGroups[i].totalRoomScore += otherUser.roomScore
                otherUserGroups[i].totalSquaredRoomScore += Math.pow(otherUser.roomScore, 2)
                otherUserGroups[i].averageRoomScore = otherUserGroups[i].totalRoomScore / otherUserGroups[i].totalCount
                // stDev = sqrt(E(X^2) - E(X)^2)
                otherUserGroups[i].roomScoreStdDev = Math.sqrt(
                    otherUserGroups[i].totalSquaredRoomScore / otherUserGroups[i].totalCount
                    - Math.pow(otherUserGroups[i].averageRoomScore, 2)
                )
            }

            await Promise.all(otherUserGroups.map(group => group.save()))
            console.log("DATE-REVIEW: Modified user group information")

            return res.status(200).json("Successfully reviewed date")
        }
        catch(err) {
            console.error(err)
            return res.status(500).json("An error occurred when submitting your date review")
        }
    })
}