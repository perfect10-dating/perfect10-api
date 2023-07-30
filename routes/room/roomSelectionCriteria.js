function roomSelectionCriteria(user, choice, identity) {
    return ({
        // not the same _id
        _id: {$ne: user._id},
        // is waiting
        waitingForRoom: true,
            // matches beginner value
            isBeginner: user.isBeginner,
        // is looking for similar dates
        lookingFor: choice,
        shortTerm: user.shortTerm,
        // the user is looking for them
        identity: identity,
        // in the age range
        age: {$lte: user.ageRange.max, $gte: user.ageRange.min},
        // they are also less or equally selective than the user
        "ageRange.max": {$gte: user.ageRange.max},
        "ageRange.min": {$lte: user.ageRange.min},

        location: {
            $near: {
                // convert distance in miles to meters, measure only radially
                $maxDistance: (user.maxDistance / 2) * 1609,
                    $geometry: {
                    type: "Point",
                        coordinates: user.location.coordinates
                }
            }
        }
    })
}

module.exports = {roomSelectionCriteria}