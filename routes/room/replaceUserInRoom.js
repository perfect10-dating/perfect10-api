// Given a user, find any rooms that they are a current member of
// (this SHOULD be only one room)
// then remove them from the room and swap in a suitable alternative
const RoomModel = require("../../models/RoomModel");
const {roomSelectionCriteria} = require("./roomSelectionCriteria");
const UserModel = require("../../models/UserModel");

async function findRoomsWithUsers(userObject) {
    return new Promise(async (resolve, reject) => {
        try {
            let [onSideOne, onSideTwo] = await Promise.all([
                // find any room that has this user on SideOne
                RoomModel.findOne({sideOne: userObject._id}).populate(["spawningUser"]).exec(),
                // find any room that has this user on SideTwo
                RoomModel.findOne({sideTwo: userObject._id}).populate(["spawningUser"]).exec(),
            ])

            if (onSideTwo) {
                resolve ({room: onSideTwo, onSideTwo: true})
            }
            else resolve ({room: onSideOne, onSideTwo: false})
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
            let {room, onSideTwo} = await findRoomsWithUsers(userObject)
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

            await room.save().exec()
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
            let {room, onSideTwo} = await findRoomsWithUsers(userObject)

            // set what the person is looking for and what their identity is
            let targetIdentity = onSideTwo ? room.sideTwoIdentity : sideOneIdentity
            let targetLookingFor = onSideTwo ? room.sideOneIdentity : sideTwoIdentity

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

            // temporarily save the room -- the original user will have left even if we have an error later
            await room.save()
            // Now the interesting part -- find a person that we'll slot onto the end of the workingArray
            let newUser = await UserModel.findOne(roomSelectionCriteria(room.spawningUser, targetLookingFor, targetIdentity))
                .select("_id")
                .exec()

            if (!newUser) {
                return reject("Could not find a suitable user to replace original in room swap")
            }
            workingArray.push(newUser)

            // now re-save
            await room.save()
            resolve("Successfully swapped out the user")
        }
        catch (err) {
            reject(err)
        }
    })
}

module.exports = {removeUserFromRoom, replaceUserInRoom}