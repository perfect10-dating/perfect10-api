/*
Views any dates that you or other users proposed
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
module.exports = (router) => {
    router.get('/view-proposed-dates', async (req, res) => {
        try {
            let cognitoId = res.locals.user.sub

            if (!cognitoId) {
                return res.status(400).json("Specify your cognitoId")
            }

            // get your own ID
            let user = await UserModel.findOne({cognitoId})
                .select(["_id", "isTemporarilyLocked", "mustReviewDate"]).lean().exec()
            if (!user) {
                return res.status(400).json("Invalid cognitoID")
            }

            if (user.isTemporarilyLocked || user.mustReviewDate) {
                return res.status(400).json("User is currently locked and may not see date proposals")
            }

            let {_id} = user

            // match all dates that we're either part of or set up
            let dates = DateModel.find({$and: {accepted: false, $or: [{setupResponsibleUser: _id}, {users: _id}]}})

            return res.status(200).json(dates)
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}