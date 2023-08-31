const RoomModel = require("../../models/RoomModel");
const {appConfiguration} = require("../../appConfiguration");
const {screenUsers} = require("./dateCompetitorFindFunction");
const DateModel = require("../../models/DateModel");

/**
 * Based on the user, find non-filled rooms that would be suitable
 *
 * @param userObject
 * @returns {*}
 */
function roomSelection(userObject) {
    return RoomModel.find({
        // location: {
        //     $near: {
        //         // convert distance in miles to meters, measure only radially
        //         $maxDistance: (userObject.maxDistance / 2) * 1609,
        //         $geometry: {
        //             type: "Point",
        //             coordinates: userObject.location.coordinates
        //         }
        //     }
        // },
        $or: [

            // Side 1 Criteria (one-sided dating)
            {
                $and: [{sideOneIdentity: userObject.identity}, {sideOneIdentity: userObject.lookingFor}],
                // check scores
                "sideOneScores.min": {$lte: userObject.roomScore},
                "sideOneScores.max": {$gte: userObject.roomScore},
                // check age and age range
                "sideOneAgeRange.min": {$lte: userObject.age, $gte: userObject.ageRange.min},
                "sideOneAgeRange.max": {$gte: userObject.age, $lte: userObject.ageRange.max},
                // check length
                sideOneSize: {$lt: appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT+1},
            },
            // Side 1 Criteria (two-sided dating)
            {
                sideOneIdentity: userObject.identity,
                sideTwoIdentity: userObject.lookingFor,
                // check scores
                "sideOneScores.min": {$lte: userObject.roomScore},
                "sideOneScores.max": {$gte: userObject.roomScore},
                // check age
                "sideTwoAgeRange.min": {$lte: userObject.age},
                "sideTwoAgeRange.max": {$gte: userObject.age},
                // check age range
                "sideOneAgeRange.min": {$gte: userObject.ageRange.min},
                "sideOneAgeRange.max": {$lte: userObject.ageRange.max},
                // check length
                sideOneSize: {$lt: appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT},
            },
            // Side 2 Criteria (two-sided dating)
            {
                sideTwoIdentity: userObject.identity,
                sideOneIdentity: userObject.lookingFor,
                // check scores
                "sideTwoScores.min": {$lte: userObject.roomScore},
                "sideTwoScores.max": {$gte: userObject.roomScore},
                // check age
                "sideOneAgeRange.min": {$lte: userObject.age},
                "sideOneAgeRange.max": {$gte: userObject.age},
                // check age range
                "sideTwoAgeRange.min": {$gte: userObject.ageRange.min},
                "sideTwoAgeRange.max": {$lte: userObject.ageRange.max},
                // check length
                sideOneSize: {$lt: appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT},
            }
        ],
        bannedUserList: {$ne: userObject._id},
    }).limit(5).exec()
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

            console.log(potentialRooms)

            let chosenRoom = undefined
            for (let room of potentialRooms) {
                let isSideTwo = userObject.identity === room.sideTwoIdentity
                let isOneSided = room.isSingleSided

                // screen users using Dates
                let screenedUsers = await screenUsers({
                    DateModelObject: DateModel,
                    usersToScreen: [userObject],
                    // if either oneSided or the user is on SideTwo, sideOne is the screening side
                    screeningUsers: ((isSideTwo || isOneSided) ? room.sideOne : room.sideTwo)
                })

                if (screenedUsers.length !== 0) {
                    chosenRoom = room
                    break
                }
            }

            console.log("PASSED FOR LOOP")

            // if we found a room
            if (chosenRoom) {
                let isSideTwo = userObject.identity !== chosenRoom.sideOneIdentity

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