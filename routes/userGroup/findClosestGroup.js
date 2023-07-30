/*
Given a user, find the closest group that matches their parameters (return Null if no group)
 */
const UserGroupModel = require("../../models/UserGroupModel");
// group detection range, in miles
const GROUP_DETECTION_RANGE = 100

function findClosestGroup(user) {
    return new Promise(async (resolve, reject) => {
        try {
            let group = await UserGroupModel.findOne({
                gender: user.identity,
                lookingFor: user.lookingFor,
                minAge: {$gte: user.age},
                maxAge: {$lte: user.age},
                location: {
                    $near: {
                        // convert distance in miles to meters, measure only radially
                        $maxDistance: (GROUP_DETECTION_RANGE) * 1609,
                        $geometry: {
                            type: "Point",
                            coordinates: user.location.coordinates
                        }
                    }
                }
            }).exec()
            return resolve(group)
        }
        catch (err) {
            console.error(err)
            return reject("An error occurred when finding a group")
        }
    })

}

module.exports = {findClosestGroup}