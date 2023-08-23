/**
 *
 * @param user
 * @param choice
 * @param identity
 * @param minScore
 * @param maxScore
 * @param checkProfileComplete
 * @param selectionAgeRange       -- age range that age must be between
 * @param ageRange                -- age range that the user must be more permissive than
 * @returns {{"ageRange.min": {$lte}, "ageRange.max": {$gte}, shortTerm: *, identity, roomScore: {$gte, $lte}, lookingFor, location: {$near: {$geometry: {coordinates, type: string}, $maxDistance: number}}, _id: {$ne}, isNew: *, age: {$gte, $lte}}}
 */
function roomSelectionCriteria({user, choice, identity, minScore, maxScore, checkProfileComplete, selectionAgeRange, ageRange}) {
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
        age: {$lte: selectionAgeRange.max, $gte: selectionAgeRange.min},
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