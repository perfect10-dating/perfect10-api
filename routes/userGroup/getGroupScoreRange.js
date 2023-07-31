/*
Get the range of permissible scores between (stdev_center-STDEV_RANGE and stdev_center+STDEV_RANGE
 */
function getGroupScoreRange(group, stdev_center, STDEV_RANGE) {
    let minScore = group.averageRoomScore + group.roomScoreStdDev*(stdev_center-(STDEV_RANGE/2))
    let maxScore = group.averageRoomScore + group.roomScoreStdDev*(stdev_center+(STDEV_RANGE/2))

    return {minScore, maxScore}
}

/*
Get the stdev of a user with respect to a group
 */
function getUserStdev(user, group) {
    return (user.roomScore - group.averageRoomScore) / group.roomScoreStdDev
}

module.exports = {getGroupScoreRange, getUserStdev}