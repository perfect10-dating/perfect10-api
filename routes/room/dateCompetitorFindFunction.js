
const UserModel = require("../../models/UserModel");
const {roomSelectionCriteria} = require("./roomSelectionCriteria");
const DateModel = require("../../models/DateModel");

const ONE_SIDED_POTENTIAL_PARTNER_COUNT = 9
const ONE_SIDED_COMPETITOR_COUNT = 0
const TWO_SIDED_POTENTIAL_PARTNER_COUNT = 10
const TWO_SIDED_COMPETITOR_COUNT = 9

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
                                    searchCount, offset, checkProfileComplete, ageRange}) {
    return UserModelObject.find(
        roomSelectionCriteria(
            {
                user, choice, identity, minScore, maxScore, checkProfileComplete, ageRange
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
 * Screens userToScreen based on screeningUsers
 * (does this by getting dates that contain both a member of usersToScreen and screeningUsers)
 *
 * @param DateModelObject
 * @param usersToScreen
 * @param screeningUser
 * @returns {Promise<unknown>}
 */
async function screenUsers({DateModelObject, usersToScreen, screeningUsers}) {
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
                else {
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
 * users at lowest indexes get priority
 *
 * @param oldMin
 * @param oldMax
 */
function getNewAgeRangeAndFilterUsers({oldMin, oldMax, oldUserArray}) {
    let min = oldMin
    let max = oldMax
    let newUserArray = []

    for (let user of oldUserArray) {
        if (user.age < min) {
            min = user.age
        }
        if (user.age > max) {
            max = user.age
        }
    }

    let newAgeRange = {min: oldMin, max: oldMax}
    // now filter based on whether your ageRange is permissive enough
    for (let user of oldUserArray) {
        if (user.ageRange.min < min && user.ageRange.max > max) {
            newUserArray.push(user)

            // ironically, we need to recalculate this in case removed people change the range
            if (user.age < newAgeRange.min) {
                newAgeRange.min = user.age
            }
            if (user.age > newAgeRange.max) {
                newAgeRange.max = user.age
            }
        }
    }

    return {newUserArray, newAgeRange}
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
                while (potentialPartners.length < ONE_SIDED_POTENTIAL_PARTNER_COUNT) {
                    let newPotentialPartners = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: user.identity,
                        identity: choiceIdentity,
                        minScore: group1MinScore,
                        maxScore: group1MaxScore,
                        searchCount: 10,
                        offset,
                        checkProfileComplete,
                        ageRange
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newPotentialPartners.length < (ONE_SIDED_POTENTIAL_PARTNER_COUNT-potentialPartners.length)) {
                        return reject(`One-sided dating room generation failed: not enough eligible partners (found ${newPotentialPartners.length})`)
                    }

                    potentialPartners = potentialPartners.concat(
                        screenUsers({
                            DateModelObject,
                            usersToScreen: newPotentialPartners,
                            screeningUsers: potentialPartners.concat(newPotentialPartners)
                        })
                    )

                    // change the age range and filter if needed
                    const {newAgeRange, newUserArray} = getNewAgeRangeAndFilterUsers({
                        oldMin: ageRange.min, oldMax: ageRange.max, oldUserArray: potentialPartners
                    })
                    ageRange = newAgeRange
                    potentialPartners = newUserArray

                    console.log(`DATE-COMPETITOR-FIND: have ${potentialPartners.length} / ${ONE_SIDED_POTENTIAL_PARTNER_COUNT} partners for one-sided`)
                    offset += 10
                }

                return resolve({potentialPartners, competitors, ageRange})
            }

            // TWO-SIDED DATING
            else {
                // FIND PARTNERS
                let offset = 0
                while (potentialPartners.length < TWO_SIDED_POTENTIAL_PARTNER_COUNT) {
                    let newPotentialPartners = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: user.identity,
                        identity: choiceIdentity,
                        minScore: group1MinScore,
                        maxScore: group1MaxScore,
                        searchCount: 10,
                        offset,
                        checkProfileComplete
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newPotentialPartners.length < (TWO_SIDED_POTENTIAL_PARTNER_COUNT-potentialPartners.length)) {
                        return reject(`Two-sided dating room generation failed: not enough eligible partners (found ${newPotentialPartners.length}`)
                    }

                    potentialPartners = potentialPartners.concat(
                        screenUsers({
                            DateModelObject,
                            usersToScreen: newPotentialPartners,
                            screeningUsers: [user]
                        })
                    )

                    console.log(`DATE-COMPETITOR-FIND: have ${potentialPartners.length} / ${TWO_SIDED_POTENTIAL_PARTNER_COUNT} partners for two-sided`)
                    offset += 10
                }

                // TWO-SIDED DATING: Find competitors
                offset = 0
                while (competitors.length < TWO_SIDED_COMPETITOR_COUNT) {
                    let newCompetitors = await findUserFunction({
                        UserModelObject,
                        user,
                        choice: choiceIdentity,
                        identity: user.identity,
                        minScore: group2MinScore,
                        maxScore: group2MaxScore,
                        searchCount: 10,
                        offset,
                        checkProfileComplete
                    })

                    // we can't get enough new partners to fill the criteria
                    if (newCompetitors.length < (TWO_SIDED_COMPETITOR_COUNT-competitors.length)) {
                        return reject(`Two-sided dating room generation failed: not enough eligible partners (found ${competitors.length}`)
                    }

                    competitors = competitors.concat(
                        screenUsers({
                            DateModelObject,
                            usersToScreen: newCompetitors,
                            screeningUsers: potentialPartners
                        })
                    )

                    console.log(`DATE-COMPETITOR-FIND: have ${competitors.length} / ${TWO_SIDED_COMPETITOR_COUNT} competitors for two-sided`)
                    offset += 10
                }

                return resolve({potentialPartners, competitors, })
            }
        }
        catch (err) {
            console.error(err)
            reject(err)
        }
    })
}


module.exports = {dateCompetitorFindFunction}