const UserModel = require("../../models/UserModel");
module.exports = (router) => {
    /*
    The user attempts to unlock themselves from temporarilyLocked
     */
    router.post('/unlock', async (req, res) => {
        let {cognitoId} = req.body
        if (!cognitoId) {
            return res.status(400).json("You must be logged in to access this route")
        }

        try {
            let user = await UserModel.findOne({cognitoId}).select(["unlockTime", "temporarilyLocked"]).exec()

            if (!user) {
                return res.status(404).json("No user found")
            }

            // check to see if unlockTime has passed. If so, we can unlock the user
            if (user.temporarilyLocked && (!user.unlockTime || Date.now() > (new Date(user.unlockTime)).getTime())) {
                user.temporarilyLocked = false
                await user.save()
                return res.status(200).json("Success")
            }
            else {
                return res.status(200).json("This user is not yet unlockable")
            }
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when trying to unlock you")
        }
    })
}