/**
 * Rescores the group based on some operation with a user
 */
function rescoreGroup(group, oldUserScore, newUserScore, dateChange) {
    // calculate the new mean and std dev
    group.totalDates += dateChange
    group.totalRoomScore += (newUserScore-oldUserScore)
    group.totalSquaredRoomScore += (Math.pow(newUserScore, 2) - Math.pow(oldUserScore, 2))
    group.averageRoomScore = group.totalRoomScore / group.totalCount
    // stDev = sqrt(E(X^2) - E(X)^2)
    group.roomScoreStdDev = Math.sqrt(
        group.totalSquaredRoomScore / group.totalCount
        - Math.pow(group.averageRoomScore, 2)
    )
}

module.exports = {rescoreGroup: rescoreGroup}