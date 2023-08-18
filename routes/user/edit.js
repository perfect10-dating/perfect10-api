const UserModel = require("../../models/UserModel");
const {joinProperGroups} = require("../userGroup/joinProperGroups");
const {leaveOldGroups} = require("../userGroup/leaveOldGroups");
const MIN_NUMBER_PHOTOS = 4

module.exports = (router) => {
    router.post('/edit-user', async (req, res) => {
        // TODO -- do this based on auth
        let cognitoId = res.locals.user.sub
        // editable fields: lookingFor, lastName, shortTerm, ageRange, photoLinks
        let {lookingFor, lastName, shortTerm, ageRange, photoLinks, location} = req.body

        try {
            let user = await UserModel.findOne({cognitoId})

            // always update the user age
            let unixBirthDate = (new Date(user.dateOfBirth)).getTime()
            user.age = Math.floor((Date.now() - unixBirthDate) / (1000 * 60 * 60 * 24 * 365))

            user.lookingFor = lookingFor || user.lookingFor
            user.lastName = lastName || user.lastName
            user.shortTerm = (shortTerm === undefined) ? user.shortTerm : shortTerm
            user.ageRange = ageRange || user.ageRange
            user.photoLinks = photoLinks || user.photoLinks
            user.location = location || user.location

            user.profileComplete = (user.lookingFor.length > 0 && user.photoLinks.length >= MIN_NUMBER_PHOTOS)

            // if the user changes what they are looking for, change the groups the user is part of
            // TODO -- change groups if the person moves to a significantly different place
            if (lookingFor && lookingFor.length > 0) {
                if (user.userGroups.length > 0) {
                    // leave the old groups
                    await leaveOldGroups(user)
                }
                // join
                user.userGroups = await joinProperGroups({
                    identity: user.identity, age: user.age,
                    lookingFor, location: user.location,
                    userScore: user.totalScore, dateChange: user.totalDates
                })
            }

            await user.save()
            return res.status(200).json("Saved")
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when editing this profile")
        }
    })
}