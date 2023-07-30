/*
Given a user, generate a group centered on that user's location, with their identity.
Assumes that a matching group does not yet exist
 */
const UserGroupModel = require("../../models/UserGroupModel");
// group detection range, in miles

function generateGroup(user) {
    return new Promise(async (resolve, reject) => {
        try {
            let minAge = 18
            let maxAge = 22
            // keeps moving the range up until it straddles the user
            while (maxAge < user.age) {
                minAge += 5
                maxAge += 5
            }

            let userGroup = new UserGroupModel({
                gender: user.identity,
                lookingFor: user.lookingFor,
                minAge,
                maxAge,
                totalCount: user.isBeginner ? 0 : 1,
                location: user.location
            })

            let userGroupSaved = userGroup.save()
            return resolve(userGroupSaved)
        }
        catch (err) {
            console.error(err)
            return reject("An error occurred when finding a group")
        }
    })

}

module.exports = {generateGroup}