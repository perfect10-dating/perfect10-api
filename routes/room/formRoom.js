const UserModel = require("../../models/UserModel");
const RoomModel = require("../../models/RoomModel");

const ROOM_SCORE_STDEV_RANGE = 1      // 1 --> +/- 0.5 stdevs
const {roomSelectionCriteria} = require("./roomSelectionCriteria");
const {findClosestGroup} = require("../userGroup/findClosestGroup");
const {getUserStdev, getGroupScoreRange} = require("../userGroup/getGroupScoreRange");

const formRoomFunction = (cognitoId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = UserModel.findOne({cognitoId}).populate({
                path: "userGroups",
                select: "lookingFor"
            }).exec()
            if (!user) {
                return reject("Unable to find a user with this ID")
            }

            else {
                console.log(user)

                if (user.temporarilyLocked || user.mustReviewDate) {
                    return reject("User is unsuitable for spawning a new room")
                }

                // to simplify things: randomly choose one of the groups this person is interested in
                let group = user.userGroups[Math.floor(Math.random() * user.userGroups.length)]
                // and select the choice as what that group is looking for
                let choice = group.lookingFor[0]

                let isOneSided = false
                let otherSideGroup
                // if the room is one-sided, set the other side's group to be the same group
                if (choice + "" === user.identity + "") {
                    isOneSided = true
                    otherSideGroup = group
                }
                // otherwise, find a relevant group for the other side
                // NOTE -- nearest group is NOT guaranteed. First we search groups above, then below the middle
                // (this means if there is a group overlapping the middle, we will always find them
                else {
                    let medianAge = (user.ageRange.max + user.ageRange.min)/2
                    let testAge = medianAge
                    while (!otherSideGroup && (testAge <= user.ageRange.max)) {
                        otherSideGroup = await findClosestGroup(choice, user.identity, testAge, user.location.coordinates)
                        testAge += 5
                    }
                    testAge = medianAge - 5
                    while (!otherSideGroup && testAge >= user.ageRange.min) {
                        otherSideGroup = await findClosestGroup(choice, user.identity, testAge, user.location.coordinates)
                        testAge -= 5
                    }

                    if (!otherSideGroup) {
                        return reject("Unable to find any user groups in this age range.")
                    }
                }

                let userStdDev = getUserStdev(user, group)
                let userGroupStdevData = getGroupScoreRange(group, userStdDev, ROOM_SCORE_STDEV_RANGE)
                let otherGroupStdevData = getGroupScoreRange(group, userStdDev, ROOM_SCORE_STDEV_RANGE)

                console.log((user.maxDistance / 2) * 1609)

                let [dates, competitors] = await Promise.all([
                    // find dates near these coordinates
                    // identity and choice are flipped, because we want to find someone who is LOOKING FOR
                    // the user
                    UserModel.find(
                        roomSelectionCriteria(
                            user, user.identity, choice, otherGroupStdevData.minScore, otherGroupStdevData.maxScore
                        ))
                        .limit(10)
                        .select(["_id", "waitingForRoom", "location", "identity", "currentRoom"])
                        .exec(),

                    // if it's one-sided, competitors=dates
                    isOneSided ? new Promise((resolve) => resolve([])) :

                    // find competitors near these coordinates
                    UserModel.find(roomSelectionCriteria(
                        user, choice, user.identity, userGroupStdevData.minScore, userGroupStdevData.maxScore
                    ))
                        .limit(9)
                        .select(["_id", "waitingForRoom", "location", "identity", "currentRoom"])
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
                    sideOneScores: {min: otherGroupStdevData.minScore, max: otherGroupStdevData.maxScore},
                    sideTwo: competitors,
                    sideTwoIdentity: identity,
                    sideTwoScores: {min: userGroupStdevData.minScore, max: userGroupStdevData.maxScore},
                })

                console.log("Saving room")
                // save this new room
                room = await room.save()

                // mark dates and competitors as no longer waiting for a room, in this room
                for (let i = 0; i < dates.length; i++) {
                    dates[i].waitingForRoom = false
                    dates[i].currentRoom = room._id
                }
                for (let i = 0; i < competitors.length; i++) {
                    competitors[i].waitingForRoom = false
                    competitors[i].currentRoom = room._id
                }

                // save all dates and competitors
                await Promise.all([dates, competitors].map(userArray => {
                    return Promise.all(userArray.map(indUser => {
                        return indUser.save()
                    }))
                }))

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