/*
Views any dates that you or other users proposed
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
module.exports = (router) => {
    router.get('/view-proposed-dates', async (req, res) => {
        try {
            let {cognitoId} = req.body

            if (!cognitoId) {
                return res.status(400).json("Specify your cognitoId")
            }

            // get your own ID
            let user = await UserModel.findOne({cognitoId})
                .select(["_id", "isTemporarilyLocked", "mustReviewDate", "currentRoom"])
                .populate({
                    path: "currentRoom",
                    populate: [{
                        path: "sideOne",
                        select: ["firstName", "lastName", "identity", "age", "location"]
                    }, {
                        path: "sideTwo",
                        select: ["firstName", "lastName", "identity", "age", "location"]
                    }]
                })
                .lean().exec()
            if (!user) {
                return res.status(400).json("Invalid cognitoID")
            }

            if (user.isTemporarilyLocked || user.mustReviewDate) {
                return res.status(400).json("User is currently locked and may not see room")
            }

            let {_id} = user

            return res.status(200).json(user.currentRoom)
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}