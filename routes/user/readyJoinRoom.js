const UserModel = require("../../models/UserModel");
module.exports = (router) => {
    /*
    The user marks themselves as being ready to join a new room
     */
    router.post('/ready-join-room', async (req, res) => {
        let cognitoId = res.locals.user.sub

        if (!cognitoId) {
            return res.status(400).json("You must be logged in to access this route")
        }

        try {
            let user = await UserModel.findOne({cognitoId}).select(["unlockTime", "temporarilyLocked"]).exec()

            if (!user) {
                return res.status(404).json("No user found")
            }

            // check to see if unlockTime has passed. If so, we can unlock the user
            if (user.temporarilyLocked || user.mustReviewDate) {
                console.error("READY-JOIN-ROOM: This user can't join a room yet")
                return res.status(200).json("This user can't join a room yet")
            }
            else {
                user.waitingForRoom = true
                await user.save()

                return res.status(200).json("User may now join a room")
            }
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when trying to unlock you")
        }
    })
}