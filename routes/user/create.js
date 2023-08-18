const UserModel = require("../../models/UserModel");
const {findClosestGroup} = require("../userGroup/findClosestGroup");
const {generateGroup} = require("../userGroup/generateGroup");
const {joinProperGroups} = require("../userGroup/joinProperGroups");

const PRIORITY_TIME_INC_MS = 1000 * 60 * 60 * 24 * 30     // 1 month

module.exports = (router) => {
    router.post('/create-user', async (req, res) => {
        // TODO -- screen all the fields to make sure they all exist on the new user
        let {cognitoId, phoneNumber, firstName, identity, birthDate, longitude, latitude, lookingFor,
            referringUser} = req.body

        if (!cognitoId || !phoneNumber || !firstName || !identity || !birthDate || !longitude || !latitude ||
            !lookingFor
        ) {
            console.log("CREATE-USER: Rejecting because of unspecified fields")
            return res.status(400).json("Make sure you specify all required fields")
        }

        let locationCoords = [longitude, latitude]
        let location = {type: 'Point', coordinates: locationCoords}
        let unixBirthDate = (new Date(birthDate)).getTime()
        let age = Math.floor((Date.now() - unixBirthDate) / (1000 * 60 * 60 * 24 * 365))
        // create a placeholder age range that seems reasonable
        let ageRange = {
            min: Math.max(18, age-3),
            max: age+3
        }

        if (age < 18 || age > 150) {
            console.log(`CREATE-USER: rejecting because of out-of-bounds age ${age}`)
            return res.status(400).json("Age is too small or too large")
        }

        try {
            const groups = await joinProperGroups({
                identity, age, lookingFor, location, userScore: 0, dateChange: 0
            })

            console.log("CREATE-USER: Generating the user object")
            let user = new UserModel({
                // explicit fields
                cognitoId: req.body.cognitoId,
                phoneNumber: req.body.phoneNumber,
                firstName: req.body.firstName,
                identity: req.body.identity,
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

            return res.status(200).json(savedUser._id)
        }
        catch (err) {
            console.error("CREATE-USER: User creation failed")
            console.error(err)
            return res.status(500).json("CREATE-USER: User creation failed")
        }
    })
}