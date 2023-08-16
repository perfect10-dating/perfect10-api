const UserModel = require("../../models/UserModel");
module.exports = (router) => {
    router.get('/get-user', async (req, res) => {
        // TODO -- do this based on auth
        let cognitoId = res.locals.user.sub

        if (!cognitoId) {
            return res.status(400).json("Not logged in")
        }

        console.log({cognitoId})
        try {
            let user = await UserModel.findOne({cognitoId}).select([
                "_id", "cognitoId", "phoneNumber", "emailAddress", "firstName", "lastName", "identity", "age", "dateOfBirth",
                "location", "photoLinks", "profileComplete", "lookingFor", "shortTerm", "ageRange", "waitingForRoom", "currentRoom",
                "temporarilyLocked", "unlockTime", "mustReviewDate", "lockingDate"
            ]).populate({
                path: "lockingDate",
                populate: [{
                    path: "users",
                    select: ["_id", "firstName", "identity", "age", "location"]
                }, {
                    path: "setupResponsibleUser",
                    select: ["_id", "firstName", "identity", "age", "location"]
                }]
            }).lean().exec()
            if (!user) {
                return res.status(404).json("User not found")
            }

            return res.status(200).json(user)
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when getting user information")
        }
    })
}