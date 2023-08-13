/**
 * Checks to see if userId is in either the users array or setupResponsibleUser
 * @param date
 * @param userId
 */
function userInDate(date, userId) {
    if (userId+"" === date.setupResponsibleUser+"") {
        return true
    }
    for (let userIdInArr of date.users) {
        if (userIdInArr+"" === userId+"") {
            return true
        }
    }
}

module.exports = {userInDate}