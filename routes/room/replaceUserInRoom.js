// Given a user, find any rooms that they are a current member of
// (this SHOULD be only one room)
// then remove them from the room and swap in a suitable alternative
const RoomModel = require("../../models/RoomModel");
const {roomSelectionCriteria} = require("./roomUserSelectionCriteria");
const UserModel = require("../../models/UserModel");
const {screenUsers} = require("./dateCompetitorFindFunction");
const DateModel = require("../../models/DateModel");

/*
NOTE: expects a user with currentRoom field that has not had lean() called.

Finds any rooms that contain this user. Additional parameters may be specified (this might be done to see if a room
is no longer suitable for a user)
 */
async function findRoomsWithUsers(userObject, additionalParameters) {
    return new Promise(async (resolve, reject) => {
        try {
            let room = await RoomModel.findOne({_id: userObject.currentRoom}).populate([{
                path: "spawningUser",
            }]).populate([
                {
                    path: "sideOne",
                    select: ["roomScore"]
                },
                {
                    path: "sideTwo",
                    select: ["roomScore"]
                }
            ]).exec()
            if (!room) {
                console.error("The user is not in a room")
                reject("No room")
            }
            let onSideTwo = userObject.identity !== room.sideOneIdentity
            resolve({room, onSideTwo: onSideTwo})
        }
        catch (err) {
            reject(err)
        }
    })
}

// /*
// Removes the user from a room and DOES NOT replace them
// (this occurs when the user completes a review after a date, or after a setup)
//  */
// async function removeUserFromRoom(userObject) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let {room, onSideTwo} = await findRoomsWithUsers(userObject, {})
//             // depending on what side we're on, find the user and remove them from that side
//             let workingArray = []
//             if (onSideTwo) {
//                 for (let userIndex = 0; userIndex < room.sideTwo.length; userIndex++) {
//                     if (room.sideTwo[userIndex] + "" !== userObject._id + "") {
//                         workingArray.push(room.sideTwo[userIndex])
//                     }
//                 }
//                 room.sideTwo = workingArray
//             }
//             else {
//                 for (let userIndex = 0; userIndex < room.sideOne.length; userIndex++) {
//                     if (room.sideOne[userIndex] + "" !== userObject._id + "") {
//                         workingArray.push(room.sideOne[userIndex])
//                     }
//                 }
//                 room.sideOne = workingArray
//             }
//
//             await room.save()
//             resolve({msg: "Removing user from room successful", room, onSideTwo})
//         }
//         catch(err) {
//             reject(err)
//         }
//     })
// }

/**
 * Gets the new score range for a room
 * @param oldRange
 * @param users
 */
function getNewScoreRange(oldRange, users) {
    const spread = (oldRange.max - oldRange.min) / 2
    let sum = 0
    for (let user of users) {
        sum += user.roomScore
    }
    let average = sum / (users.length || 1)
    return {min: average-spread, max: average+spread}
}

/*
Removes the user from a room and DOES replace them
(this occurs when the user opts to swap themselves out, due to distance, inactivity or lack of interest)
 */
async function replaceUserInRoom(userObject) {
    return new Promise(async (resolve, reject) => {
        try {
            let {room, onSideTwo} = await findRoomsWithUsers(userObject, {})

            // set what the person is looking for and what their identity is
            let targetIdentity = onSideTwo ? room.sideTwoIdentity : room.sideOneIdentity
            let targetLookingFor = onSideTwo ? room.sideOneIdentity : room.sideTwoIdentity

            // don't allow this user to be swapped back into the room later
            room.bannedUserList.push(userObject._id)

            // depending on what side we're on, find the user and remove them from that side
            let workingArray = []
            let scores
            let ageRange
            let selectionAgeRange
            let opposingArray
            if (onSideTwo) {
                scores = room.sideTwoScores
                ageRange = room.sideTwoAgeRange
                selectionAgeRange = room.sideOneAgeRange
                opposingArray = room.sideOne
                for (let userIndex = 0; userIndex < room.sideTwo.length; userIndex++) {
                    if (room.sideTwo[userIndex]._id + "" !== userObject._id + "") {
                        workingArray.push(room.sideTwo[userIndex])
                    }
                }
                room.sideTwo = workingArray
            }
            else {
                scores = room.sideOneScores
                ageRange = room.sideOneAgeRange
                // if it's single sided, use SideOne, otherwise use SideTwo
                selectionAgeRange = room.isSingleSided ? room.sideOneAgeRange : room.sideTwoAgeRange
                for (let userIndex = 0; userIndex < room.sideOne.length; userIndex++) {
                    if (room.sideOne[userIndex]._id + "" !== userObject._id + "") {
                        workingArray.push(room.sideOne[userIndex])
                    }
                }
                opposingArray = room.isSingleSided ? workingArray : room.sideTwo
                room.sideOne = workingArray
            }
            console.log(onSideTwo)
            console.log(workingArray)

            // rescore the room based on the people currently in it
            room.sideOneScores = getNewScoreRange(room.sideOneScores, room.sideOne)
            room.sideTwoScores = getNewScoreRange(room.sideTwoScores, room.sideTwo)

            // change the room lengths so we can add people in later
            room.sideOneSize = room.sideOne.length
            room.sideTwoSize = room.sideTwo.length

            // temporarily save the room -- the original user will have left even if we have an error later
            room = await room.save()

            // Now the interesting part -- find a set of people that may work in this room
            let newUsers = await UserModel.find(
                roomSelectionCriteria(
                    {
                        user: room.spawningUser,
                        choice: targetLookingFor,
                        identity: targetIdentity,
                        minScore: scores.min, maxScore: scores.max,
                        checkProfileComplete: true,
                        ageRange,
                        selectionAgeRange,
                        bannedUsers: room.bannedUsers || []
                    })
            )
                // gives priorityMode priority, then the last users to queue (smallest value)
                .sort({priorityMode: -1, roomEnqueueTime: 1})
                .limit(20)
                .select(["_id", "waitingForRoom", "currentRoom"])
                .exec()

            // next, get the dates these people went on with those on opposingArray
            let screenedUsers = await screenUsers({
                DateModelObject: Date,
                usersToScreen: newUsers,
                screeningUsers: opposingArray,
                allowNonEmpty: false})

            let newUser = screenedUsers[0]
            if (!newUser) {
                console.error("Could not find a suitable user to replace original in room swap")
                // we resolve because we'll be able to replace the original user later
                // as more people join
                resolve()
            }
            newUser.waitingForRoom = false
            newUser.currentRoom = room._id

            workingArray.push(newUser)

            room.sideOneLength = room.sideOne.length
            room.sideTwoLength = room.sideTwo.length

            // now re-save
            await room.save()
            await newUser.save()
            resolve("Successfully swapped out the user")
        }
        catch (err) {
            reject(err)
        }
    })
}

module.exports = {findRoomsWithUsers, replaceUserInRoom}