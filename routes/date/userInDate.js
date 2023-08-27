/**
 * Checks to see if userId is in either the users array or setupResponsibleUser
 * @param date
 * @param userId
 */
function userInDate(date, userId) {
    if (date.setupResponsibleUser) {
        let setupResponsibleUserId = date.setupResponsibleUser._id
        if (!setupResponsibleUserId) {
            setupResponsibleUserId = date.setupResponsibleUser
        }
        if (userId+"" === setupResponsibleUserId+"") {
            return true
        }
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