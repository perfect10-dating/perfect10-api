const UserModel = require("../../models/UserModel");
const {findClosestGroup} = require("../userGroup/findClosestGroup");
const {generateGroup} = require("../userGroup/generateGroup");
const {joinProperGroups} = require("../userGroup/joinProperGroups");
const {createUtility} = require("./create-utility");

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
            // use the creation utility rather than doing this ourselves
            const savedUser = await createUtility({
                identity, age, lookingFor, cognitoId, phoneNumber, firstName, unixBirthDate, location, ageRange, referringUser
            })

            return res.status(200).json(savedUser._id)
        }
        catch (err) {
            console.error("CREATE-USER: User creation failed")
            console.error(err)
            return res.status(500).json("CREATE-USER: User creation failed")
        }
    })
}