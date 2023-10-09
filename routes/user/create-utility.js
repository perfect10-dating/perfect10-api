const {joinProperGroups} = require("../userGroup/joinProperGroups");
const UserModel = require("../../models/UserModel");
const PRIORITY_TIME_INC_MS = 1000 * 60 * 60 * 24 * 30     // 1 month

async function createUtility({identity, age, lookingFor, cognitoId, phoneNumber, email, firstName,
                                 unixBirthDate, location, ageRange, referringUser}) {
    return new Promise(async (resolve, reject) => {
        try {
            const groups = await joinProperGroups({
                identity, age, lookingFor, location, userScore: 0, dateChange: 0
            })

            console.log("CREATE-USER: Generating the user object")
            let user = new UserModel({
                // explicit fields
                cognitoId: cognitoId,
                phoneNumber: phoneNumber,
                emailAddress: email,
                firstName: firstName,
                identity: identity,
                dateOfBirth: unixBirthDate,
                location,

                // emailAddress: req.body.emailAddress,

                age: age,
                ageRange,

                lookingFor: lookingFor.filter(lookingForElem => !!lookingForElem),
                // shortTerm: !!req.body.shortTerm,
                userGroups: groups,
            })

            // mark the referringUser if they exist
            if (referringUser) {
                user.referringUser = referringUser
            }

            console.log("CREATE-USER: Saving the user object")
            let savedUser = await user.save()

            // if referringUser exists, get them and increase their priority time
            if (referringUser) {
                const referringUserObject = await UserModel.findOne({_id})
                    .select(['priorityMode', 'priorityModeExpiryTime'])
                    .exec()

                if (referringUserObject) {
                    referringUserObject.priorityMode = true
                    // if an expiry time exists and it's in the future
                    if (referringUserObject.priorityModeExpiryTime &&
                        (new Date(referringUserObject.priorityModeExpiryTime).getTime()) > Date.now()) {
                        // expiry time is the old time plus 1 month
                        referringUserObject.priorityModeExpiryTime =
                            (new Date(referringUserObject.priorityModeExpiryTime).getTime()) + PRIORITY_TIME_INC_MS
                    }
                    else {
                        // otherwise, set it to now plus a month
                        referringUserObject.priorityModeExpiryTime = Date.now() + PRIORITY_TIME_INC_MS
                    }

                    await referringUserObject.save()
                }
            }

            return resolve(savedUser)
        }
        catch(err) {
            reject(err)
        }
    })
}

module.exports = {createUtility}