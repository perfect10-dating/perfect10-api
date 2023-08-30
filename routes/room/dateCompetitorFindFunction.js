
const UserModel = require("../../models/UserModel");
const {roomSelectionCriteria} = require("./roomSelectionCriteria");
const DateModel = require("../../models/DateModel");
const {appConfiguration} = require("../../appConfiguration");


const USERS_TO_GET_PER_PASS = 20

/**
 * Run the query to find user objects
 *
 * @param UserModelType
 * @param user
 * @param choice
 * @param identity
 * @param minScore
 * @param maxScore
 * @param searchCount
 * @returns {Promise<*>}
 */
async function findUserFunction({UserModelObject, user, choice, identity, minScore, maxScore,
                                    searchCount, offset, checkProfileComplete, ageRange, selectionAgeRange}) {
    return UserModelObject.find(
        roomSelectionCriteria(
            {
                user, choice, identity, minScore, maxScore, checkProfileComplete, ageRange, selectionAgeRange
            }
        ))
        // gives priorityMode priority, then the last users to queue (smallest value)
        .sort({priorityMode: -1, roomEnqueueTime: 1})
        .skip(offset)
        .limit(searchCount)
        .select(["_id", "waitingForRoom", "identity", "currentRoom", "ageRange", "age"])
        .exec()
}

/**
 * Screens usersToScreen based on screeningUsers
 * (does this by getting dates that contain both a member of usersToScreen and screeningUsers)
 *
 * @param DateModelObject
 * @param usersToScreen
 * @param screeningUser
 * @param allowNonEmpty  -- For use with generating new rooms, this should be true
 * @returns {Promise<unknown>}
 */
async function screenUsers({DateModelObject, usersToScreen, screeningUsers, allowNonEmpty}) {
    return new Promise(async (resolve, reject) => {
        try {
            // look up dates for each of the usersToScreen based on the screeningUsers
            const screeningDates = await Promise.all(usersToScreen.map(user => {
                return DateModelObject.find({
                    $and: [
                        // this user is in usersToScreen
                        {users: user._id},
                        // there is one screeningUser (not including this user)
                        {users: {$in: screeningUsers.filter(userObj => userObj._id+"" !== user._id+"")}}
                    ]
                })
                    .select("users")
                    .lean()
                    .exec()
            }))

            // don't include dates that didn't happen
            screeningDates.filter(date => date.isAccepted)
            console.log(screeningDates)

            // create a Map for speedier screening
            const usersToScreenMap = new Map(usersToScreen.map((userObj, index) => {
                return [userObj, index]
            }))
            let screenedUsers = []
            let invalidIndexes = new Set()
            for (let i = 0; i < usersToScreen.length; i++) {
                // if there were no dates between this user and the screeningUsers, this person is OK
                if (screeningDates[i].length === 0) {
                    screenedUsers.push(usersToScreen[i])
                }

                // if there were dates, then...
                else if (allowNonEmpty) {
                    // if this index is already invalid, continue
                    if (invalidIndexes.has(i)) {
                        continue
                    }

                    let isValid = true
                    let temporaryInvalidIndexes = []
                    // check all the dates
                    for (let date of screeningDates[i]) {
                        let otherUser = getOtherUserInDate(date, usersToScreen[i]._id)
                        // if it is NOT another userToScreen, it MUST be solely a screeningUser, and we continue
                        if (!usersToScreenMap.has(otherUser+"")) {
                            isValid = false
                            break
                        }
                        else {
                            // otherwise, we mark the other userToScreen as invalid (temporarily...)
                            let otherUserIndex = usersToScreenMap.get(otherUser+"")
                            temporaryInvalidIndexes.push(otherUserIndex)
                        }
                    }

                    if (isValid) {
                        // say this user is screened, then mark invalid any indices that we need to
                        screenedUsers.push(usersToScreen[i])
                        for (let index of temporaryInvalidIndexes) {
                            invalidIndexes.add(index)
                        }
                    }
                }
            }

            return resolve(screenedUsers)
        }
        catch (err) {
            console.error(err)
            return reject(err)
        }
    })
}

/**
 * This is an optimization problem.
 * Out of users in oldUserArray, we want to find the "best" newUserAmount (if possible), where "best"
 * minimizes selectionAgeRange (the range of ages within this range of users) and maximizes ageRange
 * (the largest minimum and smallest maximum)
 *
 * We do this by:
 * 1. Finding the user which is close to setPointAge and has a wide ageRange including setPointAge
 * 2. Score all other users based on age distance to this user and ageRange within this boundingAgeRange
 *  (i.e., having a giant age range that is useless in this context is not rewarded), and get the best one
 * 3. Keep going until either all users are invalid (no ageRange overlap, or age is no longer in selectionAgeRange
 *
 * We make the following rules:
 * 1. selectionAgeRange contains all user.age
 * 2. ageRange also contains all user.age
 */
function getNewAgeRangeAndFilterUsers({setPointAge, oldUserArray, newUserAmount}) {
    if (oldUserArray.length === 0) {
        return {}
    }

    let invalidIndexSet = new Set()
    let newSelectionAgeRange
    let newAgeRange
    let referenceAge
    let newUserArray = []

    // Step 1: get the best user which is a balance of the closest age to setPointAge and broadest ageRange
    let bestScore = 0
    let bestScoreUserIndex = 0
    for (let i = 0; i < oldUserArray.length; i++) {
        let user = oldUserArray[i]

        // if the user doesn't include themselves in their own ageRange, they are an invalid seed
        if (user.age < user.ageRange.min || user.age > user.ageRange.max) {
            invalidIndexSet.add(i)
            continue
        }

        // otherwise, calculate score
        let score = -Math.abs(user.age-setPointAge)
            + Math.sqrt(user.age-user.ageRange.min)
            + Math.sqrt(user.ageRange.max-user.age)
        if (score > bestScore) {
            bestScore = score
            bestScoreUserIndex = i
        }
    }

    let bestScoringUser = oldUserArray[bestScoreUserIndex]
    newUserArray.push(bestScoringUser)
    newSelectionAgeRange = {min: bestScoringUser.age, max: bestScoringUser.age}
    newAgeRange = {min: bestScoringUser.ageRange.min, max: bestScoringUser.ageRange.max}
    referenceAge = bestScoringUser.age
    invalidIndexSet.add(bestScoreUserIndex)

    // now loop repeatedly, selecting the best score each time
    while (invalidIndexSet.size < oldUserArray.length && newUserArray.length < newUserAmount) {
        let bestScore = 0
        let bestScoreUserIndex = 0
        for (let i = 0; i < oldUserArray.length; i++) {
            if (invalidIndexSet.has(i)) {
                continue
            }

            let user = oldUserArray[i]

            // if the user age isn't in newAgeRange, the user is now invalid
            if (user.age < newAgeRange.min || user.age > newAgeRange.max) {
                invalidIndexSet.add(i)
                continue
            }
            // if the referenceAge isn't in the user age range, the user is now invalid
            if (referenceAge < user.ageRange.min || referenceAge > user.ageRange.max) {
                invalidIndexSet.add(i)
                continue
            }

            // otherwise, calculate score
            // first, calculate the proximityScoreComponent
            let proximityScoreComponent = 0
            // always negative
            if (user.age > newSelectionAgeRange.max) {
                proximityScoreComponent = newSelectionAgeRange.max-user.age
            }
            if (user.age < newSelectionAgeRange.min) {
                proximityScoreComponent = user.age-newSelectionAgeRange.min
            }

            let score = proximityScoreComponent
                // calculate difference between reference age and the more restrictive range
                + Math.sqrt(referenceAge-Math.max(user.ageRange.min, newAgeRange.min))
                // calculate difference between reference age and the more restrictive range
                + Math.sqrt(Math.min(user.ageRange.max, newAgeRange.max) - referenceAge)
            if (score > bestScore) {
                bestScore = score
                bestScoreUserIndex = i
            }
        }

        // update the ranges
        let bestScoringUser = oldUserArray[bestScoreUserIndex]
        newUserArray.push(bestScoringUser)
        newSelectionAgeRange = {min: Math.min(bestScoringUser.age, newSelectionAgeRange.min),
                                max: Math.max(bestScoringUser.age, newSelectionAgeRange.max)}
        newAgeRange = {min: Math.max(bestScoringUser.ageRange.min, newAgeRange.min),
                        max: Math.min(bestScoringUser.ageRange.max, newAgeRange.max)}
        invalidIndexSet.add(bestScoreUserIndex)
    }

    return {newUserArray, newAgeRange, newSelectionAgeRange}
}

/**
 * Cases:
 *  1. One-sided dating: return 9 valid users who have not been on dates with each other or the spawning user
 *      len(potentialPartners) = 9; len(competitors) = 0
 *  2. Two-sided dating: return 10 valid users who have not been on dates with the spawning user OR
 *      the 9 competitors that you also create
 *      len(potentialPartners) = 10; len(competitors) = 9
 *
 * @returns {Promise<unknown>}
 */
async function dateCompetitorFindFunction({user, choiceIdentity,
                                              group1MinScore, group1MaxScore, group2MinScore, group2MaxScore,
                                              // so that we can do test users and dates
                                              UserModelType, DateModelType,
                                              // false only for test cases
                                              checkProfileComplete
                                          }) {
    return new Promise(async (resolve, reject) => {
        try {
            let UserModelObject = UserModel
            let DateModelObject = DateModel
            if (UserModelType === "UserTestModel") {
                // TODO -- switch to test model if this is a test
            }
            if (DateModelType === "DateTestModel") {
                // TODO -- switch to test model if this is a test
            }

            let isOneSided = false
            if (user.identity === choiceIdentity) {
                isOneSided = true
            }

            let potentialPartners = []
            let competitors = []

            // ONE-SIDED DATING
            if (isOneSided) {
                let ageRange = {min: user.age, max: user.age}
                let offset = 0
                while (potentialPartners.length < appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT) {
                    let newPotentialPartners = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: user.identity,
                        identity: choiceIdentity,
                        minScore: group1MinScore,
                        maxScore: group1MaxScore,
                        searchCount: USERS_TO_GET_PER_PASS,
                        offset,
                        checkProfileComplete,
                        ageRange,
                        selectionAgeRange: user.ageRange
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newPotentialPartners.length < (appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT-potentialPartners.length)) {
                        return reject(`One-sided dating room generation failed: not enough eligible partners (found ${newPotentialPartners.length})`)
                    }

                    potentialPartners = potentialPartners.concat(
                        await screenUsers({
                            DateModelObject,
                            usersToScreen: newPotentialPartners,
                            screeningUsers: potentialPartners.concat(newPotentialPartners),
                            allowNonEmpty: true
                        })
                    )

                    // find the optimal age range and filter if needed
                    const {newUserArray, newSelectionAgeRange} = getNewAgeRangeAndFilterUsers({
                        // just the average of the ageRange; a pretty likely place for user ages to center
                        setPointAge: (user.ageRange.max-user.ageRange.min)/2,
                        oldUserArray: potentialPartners,
                        newUserAmount: appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT
                    })
                    // because this is one-sided: all users must be more permissive that the currently existing
                    // user age ranges
                    ageRange = newSelectionAgeRange
                    potentialPartners = newUserArray

                    console.log(`DATE-COMPETITOR-FIND: have ${potentialPartners.length} / ${appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT} partners for one-sided`)
                    offset += USERS_TO_GET_PER_PASS
                }

                return resolve({potentialPartners, competitors, sideOneAgeRange: ageRange})
            }

            // TWO-SIDED DATING
            else {
                // FIND PARTNERS
                let sideOneSelectionAgeRange
                let sideTwoSelectionAgeRange
                let offset = 0
                while (potentialPartners.length < appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT) {
                    let newPotentialPartners = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: user.identity,
                        identity: choiceIdentity,
                        minScore: group1MinScore,
                        maxScore: group1MaxScore,
                        searchCount: USERS_TO_GET_PER_PASS,
                        offset,
                        checkProfileComplete,
                        ageRange: {min: user.age, max: user.age},     // NOTE -- this doesn't change (for now),
                        selectionAgeRange: user.ageRange
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newPotentialPartners.length < (appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT-potentialPartners.length)) {
                        return reject(`Two-sided dating room generation failed: not enough eligible partners (found ${newPotentialPartners.length}`)
                    }

                    potentialPartners = potentialPartners.concat(
                        await screenUsers({
                            DateModelObject,
                            usersToScreen: newPotentialPartners,
                            screeningUsers: [user],
                            allowNonEmpty: true,
                        })
                    )

                    // find the optimal age range and filter if needed
                    const {newUserArray, newSelectionAgeRange, newAgeRange} = getNewAgeRangeAndFilterUsers({
                        // just the average of the ageRange; a pretty likely place for user ages to center
                        setPointAge: (user.ageRange.max-user.ageRange.min)/2,
                        oldUserArray: potentialPartners,
                        newUserAmount: appConfiguration.ONE_SIDED_POTENTIAL_PARTNER_COUNT
                    })
                    // because this is two-sided:
                    //  the newSelectionAgeRange (bounds the ages on sideOne) becomes the ageRange on sideTwo
                    //  the newAgeRange (bounds the age ranges on sideOne) becomes the selectionAgeRange on sideTwo
                    sideOneSelectionAgeRange = newSelectionAgeRange
                    sideTwoSelectionAgeRange = newAgeRange
                    potentialPartners = newUserArray

                    console.log(`DATE-COMPETITOR-FIND: have ${potentialPartners.length} / ${appConfiguration.TWO_SIDED_POTENTIAL_PARTNER_COUNT} partners for two-sided`)
                    offset += USERS_TO_GET_PER_PASS
                }

                // TWO-SIDED DATING: Find competitors
                offset = 0
                while (competitors.length < appConfiguration.TWO_SIDED_COMPETITOR_COUNT) {
                    let newCompetitors = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: choiceIdentity,
                        identity: user.identity,
                        minScore: group2MinScore,
                        maxScore: group2MaxScore,
                        searchCount: USERS_TO_GET_PER_PASS,
                        offset,
                        checkProfileComplete,
                        ageRange: sideOneSelectionAgeRange,
                        selectionAgeRange: sideTwoSelectionAgeRange
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newCompetitors.length < (appConfiguration.TWO_SIDED_COMPETITOR_COUNT-competitors.length)) {
                        return reject(`Two-sided dating room generation failed: not enough eligible competitors (found ${newCompetitors.length})`)
                    }

                    competitors = competitors.concat(
                        await screenUsers({
                            DateModelObject,
                            usersToScreen: newCompetitors,
                            screeningUsers: potentialPartners,
                            allowNonEmpty: true
                        })
                    )

                    // NOTE -- we don't calculate age range here because age selection is already done by
                    // leastPermissiveAgeRange, and ageRange is determined by sideOneAgeRange

                    console.log(`DATE-COMPETITOR-FIND: have ${competitors.length} / ${appConfiguration.TWO_SIDED_COMPETITOR_COUNT} competitors for two-sided`)
                    offset += USERS_TO_GET_PER_PASS
                }

                return resolve({potentialPartners, competitors, sideOneAgeRange: sideTwoSelectionAgeRange, sideTwoAgeRange: sideOneSelectionAgeRange})
            }
        }
        catch (err) {
            console.error(err)
            reject(err)
        }
    })
}


module.exports = {dateCompetitorFindFunction, screenUsers}