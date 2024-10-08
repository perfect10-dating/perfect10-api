const UserModel = require("../../models/UserModel");
const RoomModel = require("../../models/RoomModel");

const ROOM_SCORE_STDEV_RANGE = 1      // 1 --> +/- 0.5 stdevs
const {roomSelectionCriteria} = require("./roomUserSelectionCriteria");
const {findClosestGroup} = require("../userGroup/findClosestGroup");
const {getUserStdev, getGroupScoreRange} = require("../userGroup/getGroupScoreRange");
const {dateCompetitorFindFunction} = require("./dateCompetitorFindFunction");
const {findExistingRoomForUser} = require("./findExistingRoomForUser");
const {sendPinpointMessage} = require("../utils/sendPinpointMessage");
const {appConfiguration} = require("../appConfiguration");

const formRoomFunction = (user, checkProfileComplete) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(user)

            if (user.temporarilyLocked || user.mustReviewDate || (!user.profileComplete && checkProfileComplete)) {
                return reject("User is unsuitable for spawning a new room")
            }

            // if the user is already in a room, we don't allow them to join a new one
            if (!!user.currentRoom) {
                return reject("User is already in a room")
            }

            // to simplify things: randomly choose one of the groups this person is interested in
            let group = user.userGroups[Math.floor(Math.random() * user.userGroups.length)]
            // and select the choice as what that group is looking for
            console.log(group)
            let choice = group.lookingFor[0]

            console.log(`FORM-ROOM: Group identity selection complete: a room of ${user.identity} and ${choice}`)

            let isOneSided = false
            let otherSideGroup
            // if the room is one-sided, set the other side's group to be the same group
            if (choice + "" === user.identity + "") {
                isOneSided = true
                otherSideGroup = group
                console.log("FORM-ROOM: one-sided room")
            }
            // otherwise, find a relevant group for the other side
            // NOTE -- nearest group is NOT guaranteed. First we search groups above, then below the middle
            // (this means if there is a group overlapping the middle, we will always find them)
            else {
                console.log("FORM-ROOM: two-sided room")

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
                    console.log("FORM-ROOM: unable to find a valid group for the other side")
                    return reject("Unable to find any user groups in this age range.")
                }
            }

            let userStdDev = getUserStdev(user, group)
            let userGroupStdevData = getGroupScoreRange(group, userStdDev, ROOM_SCORE_STDEV_RANGE)
            let otherGroupStdevData = getGroupScoreRange(group, userStdDev, ROOM_SCORE_STDEV_RANGE)
            console.log(`FORM-ROOM: user has a stdev score of ${userStdDev}, defining ${JSON.stringify(userGroupStdevData)} for their own\
group and ${JSON.stringify(otherGroupStdevData)} for the other group`)


            // ==================== ACTUALLY RUN QUERY FOR USERS ======================================
            console.log("FORM-ROOM: searching for potentialPartners and competitors")
            let {potentialPartners, competitors, sideOneAgeRange, sideTwoAgeRange} = await dateCompetitorFindFunction({
                user,
                choiceIdentity: choice,
                group1MinScore: isOneSided ? userGroupStdevData.minScore : otherGroupStdevData.minScore,
                group1MaxScore: isOneSided ? userGroupStdevData.maxScore : otherGroupStdevData.maxScore,
                group2MinScore: isOneSided ? otherGroupStdevData.minScore : userGroupStdevData.minScore,
                group2MaxScore: isOneSided ? otherGroupStdevData.maxScore : userGroupStdevData.maxScore,
                UserModelType: "UserModel",
                DateModelType: "DateModel",
                checkProfileComplete
            })

            console.log(`FORM-ROOM: completed find; ${potentialPartners.length} potentialPartners and ${competitors.length} competitors`)

            if (isOneSided) {
                if (potentialPartners.length < appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT_MINIMUM) {
                    console.error("FORM-ROOM: rejecting due too few potentialPartners for one-sided dating")
                    return reject("Not enough potentialPartners for one-sided dating")
                }
                else {
                    potentialPartners.push(user)
                }
            }
            else {
                if (potentialPartners.length < appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT_MINIMUM ||
                    competitors.length < appConfiguration.TWO_SIDED_COMPETITOR_COUNT_MINIMUM) {
                    console.error("FORM-ROOM: rejecting due to two few potentialPartners or competitors for 2-sided dating")
                    return reject("Too few potentialPartners or competitors")
                }
                else {
                    competitors.push(user)
                }
            }

            console.log("FORM-ROOM: finished manipulating arrays")

            let room = new RoomModel({
                spawningUser: user,
                numPeople: potentialPartners.length + competitors.length,
                isSingleSided: isOneSided,

                sideOne: potentialPartners,
                sideOneIdentity: choice,
                sideOneScores: {min: otherGroupStdevData.minScore, max: otherGroupStdevData.maxScore},
                sideOneAgeRange,
                sideOneSize: potentialPartners.length,

                sideTwo: competitors,
                sideTwoIdentity: user.identity,
                sideTwoScores: {min: userGroupStdevData.minScore, max: userGroupStdevData.maxScore},
                sideTwoAgeRange,
                sideTwoSize: competitors.length,
                
                location: user.location,
            })

            console.log("FORM-ROOM: Saving room")
            // save this new room
            room = await room.save()

            // mark potentialPartners and competitors as no longer waiting for a room, in this room
            for (let i = 0; i < potentialPartners.length; i++) {
                potentialPartners[i].waitingForRoom = false
                potentialPartners[i].currentRoom = room._id
            }
            for (let i = 0; i < competitors.length; i++) {
                competitors[i].waitingForRoom = false
                competitors[i].currentRoom = room._id
            }

            console.log("FORM-ROOM: Saving potentialPartners and competitors as no longer waiting for rooms")
            // save all potentialPartners and competitors
            await Promise.all([potentialPartners, competitors].map(userArray => {
                return Promise.all(userArray.map(indUser => {
                    return indUser.save()
                }))
            }))

            console.log("FORM-ROOM: PotentialPartners and competitors saved")

            // only text people on live
            if (process.env.MONGO_DB) {
                console.log("FORM-ROOM: Texting people in the new room")

                await Promise.all([potentialPartners, competitors].map(userArray => {
                    return Promise.all(userArray.map(indUser => {
                        return sendPinpointMessage({
                            messageType: "PROMOTIONAL",
                            destinationNumber: indUser.phoneNumber,
                            message:
                              `Hi ${indUser.firstName}! This is Rizzly, letting you know that we created a room for you. View your matches now at https://rizz.ly`
                        })
                    }))
                }))
            }

            // console.log({potentialPartners, competitors})

            return resolve({
                potentialPartners, competitors
            })
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
        let cognitoId = res.locals.user.sub

        let user = await UserModel.findOne({cognitoId}).populate({
            path: "userGroups",
            select: ["lookingFor", "roomScore", "averageRoomScore", "roomScoreStdDev"]
        }).exec()
        if (!user) {
            console.error("FORM-ROOM: Unable to find user with cognitoId")
            return res.status(400).json("Unable to find a user with this ID")
        }

        try {
            // first, try forming a room
            await formRoomFunction(user, true)

            return res.status(200).json("Formed a new room")
        } catch (err) {
            console.error(err)

            // if that fails, try adding the user to an existing room
            try {
                await findExistingRoomForUser(user)
                return res.status(200).json("Found existing room")
            }
            catch (err) {
                console.error(err)
                return res.status(500).json("Failed to form a new room, or join an existing one")
            }
        }
    })

    router.post('/form-room-test', async (req, res) => {
        // this is only legal on test environments
        if (!process.env.MONGO_DB) {
            let {cognitoId} = req.body

            let user = await UserModel.findOne({cognitoId}).populate({
                path: "userGroups",
                select: ["lookingFor", "roomScore", "averageRoomScore", "roomScoreStdDev"]
            }).exec()
            if (!user) {
                console.error("FORM-ROOM: Unable to find user with cognitoId")
                return res.status(400).json("Unable to find a user with this ID")
            }

            try {
                await formRoomFunction(user, true)
                
                return res.status(200).json("Formed a new room")
            } catch (err) {
                console.error(err)
    
                // if that fails, try adding the user to an existing room
                try {
                    await findExistingRoomForUser(user)
                    return res.status(200).json("Found existing room")
                }
                catch (err) {
                    console.error(err)
                    return res.status(500).json("Failed to form a new room, or join an existing one")
                }
            }
        }
        else {
            return res.status(400).json("Nope.")
        }
    })
}