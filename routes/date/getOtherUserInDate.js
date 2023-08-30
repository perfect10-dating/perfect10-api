/**
 * Returns the ID, or user object, of the other user in the date
 */
function getOtherUserInDate(date, userId) {
    if (date.setupResponsibleUser) {
        let setupResponsibleUserId = date.setupResponsibleUser._id
        if (!setupResponsibleUserId) {
            setupResponsibleUserId = date.setupResponsibleUser
        }
        if (userId+"" !== setupResponsibleUserId+"") {
            return date.setupResponsibleUser
        }
    }

    for (let userInArr of date.users) {
        let userIdInArr = userInArr._id
        if (!userIdInArr) {
            userIdInArr = userInArr
        }
        // case -- the id is a string
        if (userIdInArr+"" === userId+"") {
            return userInArr
        }
    }
}

module.exports = {getOtherUserInDate}