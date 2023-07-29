import UserModel from "../../models/UserModel";
import RoomModel from "../../models/RoomModel";

const formRoomFunction = (userId) => {
    return new Promise((resolve, reject) => {
        UserModel.find({_id: userId}).lean()
            .exec(async (err, user) => {
                if (err || !user) {
                    console.error(err)
                    return reject("Unable to find a user with this ID")
                }

                else {
                    // to simplify things: randomly choose one of the groups this person is interested in
                    let choice = user.lookingFor[Math.floor(Math.random() * user.lookingFor)]

                    let isOneSided = false
                    if (choice + "" === user.identity + "") {
                        isOneSided = true
                    }

                    try {
                        let {dates, competitors} = await Promise.all([
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
                                age: {$le: user.ageRange.maximum, $ge: user.age.minimum},
                                // both ways
                                "ageRange.maximum": {$ge: user.age},
                                "ageRange.minimum": {$le: user.age},

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
                            }).limit(10).select("_id"),

                            // if it's one-sided, competitors=dates
                            isOneSided ? new Promise((resolve, reject) => resolve()) :

                            // find competitors near these coordinates
                            UserModel.find({
                                // is waiting
                                waitingForRoom: true,
                                // matches beginner value
                                isBeginner: user.isBeginner,
                                // is looking for similar dates
                                lookingFor: choice,
                                // the user is looking for them
                                identity: user.identity,
                                // in the age range
                                age: {$le: user.ageRange.maximum, $ge: user.age.minimum},
                                // both ways
                                "ageRange.maximum": {$ge: user.age},
                                "ageRange.minimum": {$le: user.age},

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
                            }).limit(9).select("_id"),
                        ])

                        if (isOneSided) {
                            if (dates.length < 9) {
                                return reject("Not enough dates for one-sided dating")
                            }
                            else {
                                if (dates.length === 9) {
                                    dates.push(user)
                                }
                                else {
                                    dates[9] = user
                                }
                            }
                        }
                        else {
                            if (dates.length < 10 || competitors.length < 9) {
                                return reject("Too few dates or competitors")
                            }
                            else {
                                competitors.push(user)
                            }
                        }

                        let room = new RoomModel({
                            numPeople: dates.length + competitors.length,
                            isSingleSided: isOneSided,
                            sideOne: dates,
                            sideTwo: competitors,
                        })

                        // save this new room
                        room.save((err) => {
                            if (err) {
                                console.error(err)
                                return reject("Error saving a new room")
                            }

                            return resolve({
                                dates, competitors
                            })
                        })
                    }
                    catch (err) {
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

        } catch (err) {
            return res.status(500).json(err)
        }
    })
}