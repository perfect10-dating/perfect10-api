const UserModel = require("../../models/UserModel");
const {createUtility} = require("./create-utility");
const AGE_CENTER_POINT = 25
const AGE_DISTRIBUTION = 5   // (+/- 5)
const AGE_RANGE_MAX_SPREAD = 5

module.exports = (router) => {
    router.post('/generate-random-users', async (req, res) => {
        // this is only legal on test environments
        if (!process.env.MONGO_DB) {
            let {userFirstNames, latitude, longitude} = req.body

            // only do these two for now
            const possibleIdentities = ['man', 'woman']
            let userObjects = userFirstNames.map(name => {
                let age = 25 + (2*AGE_DISTRIBUTION*(Math.random()-0.5))
                return {
                    identity: possibleIdentities[Math.floor(Math.random() * possibleIdentities.length)],
                    age,
                    lookingFor: [possibleIdentities[Math.floor(Math.random() * possibleIdentities.length)]],
                    cognitoId: (Math.random() * 1000000).toString(),
                    phoneNumber: (Math.random() * 1000000).toString(),
                    firstName: name,
                    unixBirthDate: 0,
                    location: {type: "Point", coordinates: [longitude, latitude]},
                    ageRange: {
                        min: age - (AGE_RANGE_MAX_SPREAD*(Math.random())),
                        max: age + (AGE_RANGE_MAX_SPREAD*(Math.random()))
                    }
                }
            })

            console.log(userObjects)

            try {
                let count = 0
                for (let userObject of userObjects) {
                    await createUtility(userObject)
                    console.log(`Created user ${count} out of ${userFirstNames.length}`)
                    count++
                }

                return res.status(200).json("All users generated")
            }
            catch (err) {
                console.error(err)
                return res.status(500).json("An error occurred when generating random users")
            }
        }
        else {
            return res.status(400).json("Nope.")
        }
    })
}