// the number of days to delay a user switching groups
const UserModel = require("../../models/UserModel");
const {removeUserFromRoom} = require("../room/replaceUserInRoom");
DELAY_NUMBER_DAYS = 3

module.exports = (router) => {
    /*
    The user chooses to switch groups rather than date anybody
     */
    router.post('/switch-groups-delayed', async (req, res) => {
        try {
            let {cognitoId} = req.body
            if (!cognitoId) {
                return res.status(400).json("You must be authenticated")
            }

            // TODO -- eventually we will want to allow use of cognitoIds from authentication rather than payload
            let user = await UserModel.findOne({cognitoId}).exec()

            // immediately switch out the user
            await removeUserFromRoom(user)

            // now make the user wait several days before they can join a new room
            let currentTime = Date.now()
            let newTime = currentTime + 86400000*DELAY_NUMBER_DAYS

            user.temporarilyLocked = true
            user.unlockTime = newTime

            await user.save()
            return res.status(200).json("User is now unlocked")
        }
        catch(err) {
            console.error(err)
            return res.status(500).json("An error occurred when switching groups")
        }
    })

    /*
    TODO -- The user is far enough away from the group that they're swapped
     */
    router.post('/switch-groups-distance', async (req, res) => {
        try {

        }
        catch (err) {

        }
    })

    /*
    TODO -- the user pays some small fee to immediately switch groups
     */
    router.post('/switch-groups-paid', async (req, res) => {

    })
}