/**
 * Checks to see if userId is in either the users array or setupResponsibleUser
 * @param date
 * @param userId
 */
function userInDate(date, userId) {
    if (userId+"" === date.setupResponsibleUser+"") {
        return true
    }
    for (let userInArr of date.users) {
        let userIdInArr = userInArr._id
        if (!userIdInArr) {
            userIdInArr = userInArr
        }
        // case -- the id is a string
        if (userIdInArr+"" === userId+"") {
            return true
        }
    }
}

module.exports = {userInDate}