// the number of days to delay a user switching groups
const UserModel = require("../../models/UserModel");
const {removeUserFromRoom, replaceUserInRoom} = require("../room/replaceUserInRoom");
const DELAY_NUMBER_DAYS = 3
const MAX_UNBALANCE = .30    // 3:4 person ratio (1/3) causes penalties, but 4:6 (2/4) does not

module.exports = (router) => {
    /*
    The user chooses to switch groups rather than date anybody
     */
    router.post('/switch-rooms-delayed', async (req, res) => {
        try {
            let cognitoId = res.locals.user.sub

            if (!cognitoId) {
                return res.status(400).json("You must be authenticated")
            }

            let user = await UserModel.findOne({cognitoId}).exec()

            // immediately switch out the user
            const {room, onSideTwo} = await replaceUserInRoom(user)

            // don't penalize people from leaving unbalanced rooms
            if (onSideTwo ? (room.sideTwo.length-room.sideOne.length)/(room.sideOne.length||1) < MAX_UNBALANCE
                : (room.sideOne.length-room.sideTwo.length)/(room.sideTwo.length||1) < MAX_UNBALANCE) {
                // now make the user wait several days before they can join a new room
                let currentTime = Date.now()
                let newTime = currentTime + 86400000*DELAY_NUMBER_DAYS

                user.temporarilyLocked = true
                user.unlockTime = newTime
            }

            user.currentRoom = null

            await user.save()
            return res.status(200).json("User is now locked")
        }
        catch(err) {
            console.error(err)
            return res.status(500).json("An error occurred when switching rooms")
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