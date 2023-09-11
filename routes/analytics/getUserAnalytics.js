const UserModel = require("../../models/UserModel");
const {calculateDistanceBetweenCoords} = require("../room/calculateDistanceBetweenCoords");

const REGION_RADIUS = 50

/**
 * Adds a single user to the signupList
 *
 * @param signupList
 * @param userDateObj
 */
const addToSignupList = ({signupList, userDateObj, userProfileComplete}) => {
    
    if (signupList.length > 0 && signupList[signupList.length - 1].date === userDateObj.toDateString()) {
        signupList[signupList.length - 1].count += 1
        signupList[signupList.length - 1].cumulative += 1
        if (userProfileComplete) {
            signupList[signupList.length - 1].cumulativeComplete += 1
        }
    }
    else {
        signupList.push({date: userDateObj.toDateString(), count: 1, cumulative: (
            // logic that sums the previous element in the array with the current user
            signupList.length > 0 ? signupList[signupList.length-1].cumulative+1 : 1
            ),
            
            cumulativeComplete: signupList.length > 0 ?
              signupList[signupList.length-1].cumulativeComplete+(userProfileComplete ? 1 : 0) : (userProfileComplete ? 1 : 0)
        })
    }
}

/**
 * Adds a single user to demographics
 *
 * @param demographicsObject
 * @param identity
 * @param lookingFor
 */
const updateDemographics = ({demographicsObject, identity, lookingFor}) => {
    // first, find the identity object
    let identityObject = undefined
    for (let key of Object.keys(demographicsObject)) {
        if (key === identity+"") {
            identityObject = demographicsObject[key]
            identityObject.count += 1
            break
        }
    }

    if (!identityObject) {
        identityObject = {
            count: 1,
            lookingFor: {}
        }
        demographicsObject[identity+""] = identityObject
    }

    // second, loop over lookingFor, adding to count
    for (let lookingForIdentity of lookingFor) {
        let lookingForFound = false
        for (let lookingForExisting of Object.keys(identityObject.lookingFor)) {
            if (lookingForExisting === lookingForIdentity+"") {
                lookingForFound = true
                identityObject.lookingFor[lookingForExisting] += 1
                break
            }
        }

        if (!lookingForFound) {
            identityObject.lookingFor[lookingForIdentity+""] = 1
        }
    }
}

module.exports = (router) => {
    /**
     * Gets analytics in the following form:
     * {
     *     overall: AnalyticsObject,
     *     regions: {
     *         {latitude: Number, longitude: Number}: AnalyticsObject
     *     },
     *     last10Users: UserMini
     * }
     *
     * where AnalyticsObject = {
     *     signups: [{date: Date, count: Number, cumulative: Number, cumulativeComplete: Number}],
     *     shortTerm: Number,
     *     demographics: {
     *         <identity>: {
     *             count: Number,
     *             lookingFor: {
     *                 <identity>: Number
     *             }
     *         }
     *     }
     * }
     */
    router.get('/get-user-analytics', async (req, res) => {
        try {
            const users = await UserModel.find()
                .select(["createdAt", "lookingFor", "identity", "firstName", "location", "_id", "shortTerm", "profileComplete"])
                .lean().exec()

            let returnObject = {
                overall: {
                    signups: [],
                    demographics: {},
                    shortTerm: 0,
                },
                regions: {},
                last10Users: users.slice(-10)
            }

            for (let user of users) {
                let userDateObj = new Date(user.createdAt)
                let userCoordsAsObject = {
                    latitude: user.location.coordinates[1], longitude: user.location.coordinates[0]}

                // STEP 1
                // first, find the region that this user is a part of
                let regionCoordinates = undefined
                let regionObject = undefined
                for (let key of Object.keys(returnObject.regions)) {
                    let jsKey = JSON.parse(key)
                    if (calculateDistanceBetweenCoords(userCoordsAsObject, jsKey) < REGION_RADIUS) {
                        regionCoordinates = key
                        regionObject = returnObject.regions[key]
                        break
                    }
                }

                // if the region doesn't exist, create it
                if (!regionCoordinates || !regionObject) {
                    regionCoordinates = userCoordsAsObject
                    regionObject = {
                        signups: [],
                        shortTerm: 0,
                        demographics: {}
                    }
                    returnObject.regions[JSON.stringify(userCoordsAsObject)] = regionObject
                }

                // STEP 2
                // add the user to the signups lists
                addToSignupList({
                    signupList: returnObject.overall.signups,
                    userDateObj,
                    userProfileComplete: user.profileComplete
                })
                addToSignupList({
                    signupList: regionObject.signups,
                    userDateObj,
                    userProfileComplete: user.profileComplete
                })

                // STEP 3
                // update the demographics for the user
                updateDemographics({
                    demographicsObject: returnObject.overall.demographics, identity: user.identity, lookingFor: user.lookingFor
                })
                updateDemographics({
                    demographicsObject: regionObject.demographics, identity: user.identity, lookingFor: user.lookingFor
                })

                if (user.shortTerm) {
                    returnObject.overall.shortTerm += 1
                    regionObject.shortTerm += 1
                }
            }

            return res.status(200).json(returnObject)
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when getting user analytics")
        }
    })
}