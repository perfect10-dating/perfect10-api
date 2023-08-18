/**
 * Rescores the group based on some operation with a user
 */
function rescoreGroup(group, oldUserScore, newUserScore, dateChange) {
    // calculate the new mean and std dev
    group.totalDates += dateChange
    console.log(`RE-SCORING with old score ${oldUserScore}, new score ${newUserScore}`)

    if (!isNaN(oldUserScore) && !isNaN(newUserScore)) {
        group.totalRoomScore += (newUserScore-oldUserScore)
        group.totalSquaredRoomScore += (Math.pow(newUserScore, 2) - Math.pow(oldUserScore, 2))
        group.averageRoomScore = group.totalRoomScore / (group.totalCount||1)
        // stDev = sqrt(E(X^2) - E(X)^2)
        group.roomScoreStdDev = Math.sqrt(
            group.totalSquaredRoomScore / (group.totalCount||1)
            - Math.pow(group.averageRoomScore, 2)
        )
    }

    else {
        console.log("RE-SCORING failed because at least one score was NaN")
    }
}

module.exports = {rescoreGroup: rescoreGroup}