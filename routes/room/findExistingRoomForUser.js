import RoomModel from "../../models/RoomModel";
import {appConfiguration} from "../../appConfiguration";
import {screenUsers} from "./dateCompetitorFindFunction";
import DateModel from "../../models/DateModel";

/**
 * Based on the user, find non-filled rooms that would be suitable
 *
 * @param userObject
 * @returns {*}
 */
function roomSelection(userObject) {
    return RoomModel.findOne({
        location: {
            $near: {
                // convert distance in miles to meters, measure only radially
                $maxDistance: (userObject.maxDistance / 2) * 1609,
                $geometry: {
                    type: "Point",
                    coordinates: userObject.location.coordinates
                }
            }
        },
        $or: [

            // Side 1 Criteria (one-sided dating)
            {
                sideOneIdentity: {$and: [{$eq: userObject.identity}, {$eq: userObject.lookingFor}]},
                // check scores
                "sideOneScores.min": {$le: userObject.roomScore},
                "sideOneScores.max": {$ge: userObject.roomScore},
                // check age and age range
                "sideOneAgeRange.min": {$and: [{$le: userObject.age}, {$ge: userObject.ageRange.min}]},
                "sideOneAgeRange.max": {$and: [{$ge: userObject.age}, {$le: userObject.ageRange.max}]},
                // check length
                sideOneSize: {$le: appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT+1},
            },
            // Side 1 Criteria (two-sided dating)
            {
                sideOneIdentity: userObject.identity,
                sideTwoIdentity: userObject.lookingFor,
                // check scores
                "sideOneScores.min": {$le: userObject.roomScore},
                "sideOneScores.max": {$ge: userObject.roomScore},
                // check age
                "sideTwoAgeRange.min": {$le: userObject.age},
                "sideTwoAgeRange.max": {$ge: userObject.age},
                // check age range
                "sideOneAgeRange.min": {$ge: userObject.ageRange.min},
                "sideOneAgeRange.max": {$le: userObject.ageRange.max},
                // check length
                sideOneSize: {$le: appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT},
            },
            // Side 2 Criteria (two-sided dating)
            {
                sideTwoIdentity: userObject.identity,
                sideOneIdentity: userObject.lookingFor,
                // check scores
                "sideTwoScores.min": {$le: userObject.roomScore},
                "sideTwoScores.max": {$ge: userObject.roomScore},
                // check age
                "sideOneAgeRange.min": {$le: userObject.age},
                "sideOneAgeRange.max": {$ge: userObject.age},
                // check age range
                "sideTwoAgeRange.min": {$ge: userObject.ageRange.min},
                "sideTwoAgeRange.max": {$le: userObject.ageRange.max},
                // check length
                sideOneSize: {$le: appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT},
            }
        ],
        bannedUserList: {$ne: userObject._id},
    }).exec()
}

/**
 * Finds an existing room for a user, where:
 *
 *
 * @param userObject
 * @returns {Promise<unknown>}
 */
async function findExistingRoomForUser(userObject) {
    return new Promise(async (resolve, reject) => {
        try {
            let potentialRooms = await roomSelection(userObject)

            let chosenRoom = undefined
            for (let room of potentialRooms) {
                let isSideTwo = userObject.identity === room.sideTwoIdentity
                let isOneSided = room.isSingleSided

                // screen users using Dates
                let screenedUsers = await screenUsers({
                    DateModelObject: DateModel,
                    usersToScreen: [userObject],
                    // if either oneSided or the user is on SideTwo, sideOne is the screening side
                    screeningUsers: ((isSideTwo || isOneSided) ? room.sideOne : room.sideTwo).map(id => {return {id}})
                })

                if (screenedUsers.length !== 0) {
                    chosenRoom = room
                    break
                }
            }

            // if we found a room
            if (chosenRoom) {
                let isSideTwo = userObject.identity === chosenRoom.sideTwoIdentity

                // modify the chosenRoom to include the user and update its lengths
                let workingArray = isSideTwo ? chosenRoom.sideTwo : chosenRoom.sideOne
                workingArray.push(userObject)
                chosenRoom.sideOneSize = chosenRoom.sideOne.length
                chosenRoom.sideTwoSize = chosenRoom.sideTwo.length

                // set the user's room
                userObject.waitingForRoom = false
                userObject.currentRoom = chosenRoom._id

                await userObject.save()
                await chosenRoom.save()

                return resolve("Successfully found and filled a room")
            }
            return reject("No valid rooms found")
        }
        catch (err) {
            console.error(err)
            return reject(err)
        }
    })
}

module.exports = {findExistingRoomForUser}