// Given a user, find any rooms that they are a current member of
// (this SHOULD be only one room)
// then remove them from the room and swap in a suitable alternative
const RoomModel = require("../../models/RoomModel");
const {roomSelectionCriteria} = require("./roomSelectionCriteria");
const UserModel = require("../../models/UserModel");

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
            }]).exec()
            if (!room) {
                console.error("The user is not in a room")
                reject("No room")
            }
            let onSideTwo = false

            // scan side 2 to see if the user is on that side
            for (let i = 0; i < room.sideTwo.length; i++) {
                if (room.sideTwo + "" === userObject._id + "") {
                    onSideTwo = true
                }
            }

            if (onSideTwo) {
                resolve ({room, onSideTwo: true})
            }
            else resolve ({room, onSideTwo: false})
        }
        catch (err) {
            reject(err)
        }
    })
}

/*
Removes the user from a room and DOES NOT replace them
(this occurs when the user completes a review after a date, or after a setup)
 */
async function removeUserFromRoom(userObject) {
    return new Promise(async (resolve, reject) => {
        try {
            let {room, onSideTwo} = await findRoomsWithUsers(userObject, {})
            // depending on what side we're on, find the user and remove them from that side
            let workingArray = []
            if (onSideTwo) {
                for (let userIndex = 0; userIndex < room.sideTwo.length; userIndex++) {
                    if (room.sideTwo[userIndex] + "" !== userObject._id + "") {
                        workingArray.push(room.sideTwo[userIndex])
                    }
                }
                room.sideTwo = workingArray
            }
            else {
                for (let userIndex = 0; userIndex < room.sideOne.length; userIndex++) {
                    if (room.sideOne[userIndex] + "" !== userObject._id + "") {
                        workingArray.push(room.sideOne[userIndex])
                    }
                }
                room.sideOne = workingArray
            }

            await room.save()
            resolve("Removing user from room successful")
        }
        catch(err) {
            reject(err)
        }
    })
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

            // depending on what side we're on, find the user and remove them from that side
            let workingArray = []
            let scores
            if (onSideTwo) {
                scores = room.sideTwoScores
                for (let userIndex = 0; userIndex < room.sideTwo.length; userIndex++) {
                    if (room.sideTwo[userIndex] + "" !== userObject._id + "") {
                        workingArray.push(room.sideTwo[userIndex])
                    }
                }
                room.sideTwo = workingArray
            }
            else {
                scores = room.sideTwoScores
                for (let userIndex = 0; userIndex < room.sideOne.length; userIndex++) {
                    if (room.sideOne[userIndex] + "" !== userObject._id + "") {
                        workingArray.push(room.sideOne[userIndex])
                    }
                }
                room.sideOne = workingArray
            }

            // temporarily save the room -- the original user will have left even if we have an error later
            await room.save()

            // Now the interesting part -- find a person that we'll slot onto the end of the workingArray
            let newUser = await UserModel.findOne(
                roomSelectionCriteria(room.spawningUser, targetLookingFor, targetIdentity, scores.min, scores.max)
            )
                // gives priorityMode priority, then the last users to queue (smallest value)
                .sort({priorityMode: -1, roomEnqueueTime: 1})
                .select(["_id", "waitingForRoom", "currentRoom"])
                .exec()

            if (!newUser) {
                return reject("Could not find a suitable user to replace original in room swap")
            }
            newUser.waitingForRoom = false
            newUser.currentRoom = room._id

            workingArray.push(newUser)

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

module.exports = {findRoomsWithUsers, removeUserFromRoom, replaceUserInRoom}