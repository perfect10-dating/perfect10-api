/*
Proposes a new date between a user with your cognitoId (TODO -- make this based on auth tokens)
and another user with their _id.

This operation does NOT lock you or your prospective date
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
module.exports = (router) => {
    router.post('/propose-setup', async (req, res) => {
        try {
            let {cognitoId, otherUserId, time} = req.body

            if (!cognitoId || !otherUserId || !time) {
                return res.status(400).json("Specify your cognitoId and the other user's ID")
            }

            // get your own ID
            let user = await UserModel.findOne({cognitoId})
                .select(["_id", "isTemporarilyLocked", "mustReviewDate"]).lean().exec()
            if (!user) {
                return res.status(400).json("Invalid cognitoID")
            }

            if (user.isTemporarilyLocked || user.mustReviewDate) {
                return res.status(400).json("User is currently locked and may not propose setup")
            }

            let {_id} = user

            // create a new date
            let date = new DateModel({
                isSetup: true,
                proposer: _id,
                setupResponsibleUser: _id,
                users: [otherUserId],
                time
            })

            await date.save()

            return res.status(200).json("Setup proposed")
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}