const UserModel = require("../../models/UserModel");
const RoomModel = require("../../models/RoomModel");

const formRoomFunction = (userId) => {
    return new Promise((resolve, reject) => {
        UserModel.findOne({_id: userId}).lean()
            .exec()
            .catch(err => {
                console.error(err)
                return reject("Error occurred while finding user with this ID")
            })
            .then(async(user) => {
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

                    try {
                        let [dates, competitors] = await Promise.all([
                            // find dates near these coordinates
                            UserModel.find({
                                // is waiting
                                waitingForRoom: true,
                                // matches beginner value
                                isBeginner: user.isBeginner,
                                // is looking for this user
                                lookingFor: user.identity,
                                // the user is looking for them
                                identity: choice,
                                // in the age range
                                age: {$lte: user.ageRange.max, $gte: user.ageRange.min},
                                // // both ways
                                "ageRange.max": {$gte: user.age},
                                "ageRange.min": {$lte: user.age},

                                location: {
                                    $near: {
                                        // convert distance in miles to meters, measure only radially
                                        $maxDistance: (user.maxDistance / 2) * 1609,
                                        $geometry: {
                                            type: "Point",
                                            coordinates: user.location.coordinates
                                        }
                                    }
                                }
                            })
                                .limit(10)
                                .select(["_id", "waitingForRoom", "location", "identity"])
                                .exec(),

                            // if it's one-sided, competitors=dates
                            isOneSided ? new Promise((resolve, reject) => resolve()) :

                            // find competitors near these coordinates
                            UserModel.find({
                                // // is waiting
                                waitingForRoom: true,
                                // matches beginner value
                                isBeginner: user.isBeginner,
                                // is looking for similar dates
                                lookingFor: choice,
                                // the user is looking for them
                                identity: user.identity,
                                // in the age range
                                age: {$lte: user.ageRange.max, $gte: user.ageRange.min},
                                // // they are also less or equally selective than the user
                                "ageRange.max": {$gte: user.ageRange.max},
                                "ageRange.min": {$lte: user.ageRange.min},

                                location: {
                                    $near: {
                                        // convert distance in miles to meters, measure only radially
                                        $maxDistance: (user.maxDistance / 2) * 1609,
                                        $geometry: {
                                            type: "Point",
                                            coordinates: user.location.coordinates
                                        }
                                    }
                                }
                            })
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
                            numPeople: dates.length + competitors.length,
                            isSingleSided: isOneSided,
                            sideOne: dates,
                            sideTwo: competitors,
                        })

                        console.log("Saving room")
                        // save this new room
                        room.save().then(() => {
                            // TODO -- change both lists to mark them as no longer waiting for a room
                            // wait until I've debugged this, though

                            console.log({dates, competitors})

                            return resolve({
                                dates, competitors
                            })
                        })
                        .catch((err) => {
                            console.error(err)
                            return reject("Error saving a new room")
                        })
                    }
                    catch (err) {
                        console.error(err)
                        return reject(err)
                    }

                }
            })
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