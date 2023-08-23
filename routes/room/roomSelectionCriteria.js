function roomSelectionCriteria({user, choice, identity, minScore, maxScore, checkProfileComplete, ageRange}) {
    let obj = {
        // not the same _id
        _id: {$ne: user._id},
        // matches new value
        isNew: user.isNew,
        // is looking for similar dates
        lookingFor: choice,
        shortTerm: user.shortTerm,
        // the user is looking for them
        identity: identity,
        // in the age range
        age: {$lte: user.ageRange.max, $gte: user.ageRange.min},
        // they are also less or equally selective than the user
        "ageRange.max": {$gte: ageRange.max},
        "ageRange.min": {$lte: ageRange.min},
        // make sure that they are within the score range for the room
        roomScore: {$gte: minScore, $lte: maxScore},

        location: {
            $near: {
                // convert distance in miles to meters, measure only radially
                $maxDistance: (user.maxDistance / 2) * 1609,
                    $geometry: {
                    type: "Point",
                        coordinates: user.location.coordinates
                }
            }
        },
    }

    if (checkProfileComplete) {
        // they have completed their profile (added photos...)
        obj["profileComplete"] = true
        obj["waitingForRoom"] = true
    }

    return obj
}

module.exports = {roomSelectionCriteria}