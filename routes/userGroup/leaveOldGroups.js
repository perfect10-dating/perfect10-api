const {rescoreGroup} = require("./rescoreGroup");

async function leaveOldGroups(user) {
    return new Promise(async (resolve, reject) => {
        try {
            await Promise.all(user.userGroups.map(group => {
                // remove the user from the group
                group.totalCount -= 1
                // change the group scores, removing this user and their dates
                rescoreGroup(group, user.totalRoomScore, 0, user.totalDates)

                return group.save()
            }))
        }
        catch (err) {
            return reject(err)
        }
    })
}

module.exports = {leaveOldGroups}