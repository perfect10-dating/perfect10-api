const UserModel = require("../../models/UserModel");
const RoomModel = require("../../models/RoomModel");
const {roomSelectionCriteria} = require("./roomSelectionCriteria");

const formRoomFunction = (cognitoId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = UserModel.findOne({cognitoId}).exec()
            if (!user) {
                return reject("Unable to find a user with this ID")
            }

            else {
                console.log(user)

                // to simplify things: randomly choose one of the groups this person is interested in
                let choice = user.lookingFor[Math.floor(Math.random() * user.lookingFor.length)]

                let isOneSided = false
                if (choice + "" === user.identity + "") {
                    isOneSided = true
                }

                console.log((user.maxDistance / 2) * 1609)

                let [dates, competitors] = await Promise.all([
                    // find dates near these coordinates
                    // identity and choice are flipped, because we want to find someone who is LOOKING FOR
                    // the user
                    UserModel.find(roomSelectionCriteria(user, user.identity, choice))
                        .limit(10)
                        .select(["_id", "waitingForRoom", "location", "identity"])
                        .exec(),

                    // if it's one-sided, competitors=dates
                    isOneSided ? new Promise((resolve, reject) => resolve([])) :

                        // find competitors near these coordinates
                        UserModel.find(roomSelectionCriteria(user, choice, user.identity))
                            .limit(9)
                            .select(["_id", "waitingForRoom", "location", "identity"])
                            .exec(),
                ])

                console.log(`completed find; ${dates.length} dates and ${competitors.length} competitors`)

                if (isOneSided) {
                    if (dates.length < 10) {
                        console.log("rejecting... 1")
                        return reject("Not enough dates for one-sided dating")
                    }
                    else {
                        dates.push(user)
                    }
                }
                else {
                    if (dates.length < 10 || competitors.length < 9) {
                        console.log("rejecting... 2")
                        return reject("Too few dates or competitors")
                    }
                    else {
                        competitors.push(user)
                    }
                }

                console.log("finished manipulating arrays")

                let room = new RoomModel({
                    spawningUser: user,
                    numPeople: dates.length + competitors.length,
                    isSingleSided: isOneSided,
                    sideOne: dates,
                    sideOneIdentity: choice,
                    sideTwo: competitors,
                    sideTwoIdentity: identity,
                })

                console.log("Saving room")
                // save this new room
                await room.save()

                // TODO -- change both lists to mark them as no longer waiting for a room
                // wait until I've debugged this, though

                console.log({dates, competitors})

                return resolve({
                    dates, competitors
                })
            }
        }
        catch (err) {
            console.error(err)
            return reject(err)
        }
    })
}

module.exports = (router) => {
    // calls the formRoom function with a particular user id, immediately calculating to see if they can get a room
    router.post('/form-room', async (req, res) => {
        try {
            await formRoomFunction(req.body.userId)
            return res.status(200).json("Formed a new room")
        } catch (err) {
            return res.status(500).json(err)
        }
    })
}