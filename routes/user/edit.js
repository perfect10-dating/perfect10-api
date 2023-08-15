const UserModel = require("../../models/UserModel");
const MIN_NUMBER_PHOTOS = 4

module.exports = (router) => {
    router.post('/edit-user', async (req, res) => {
        // TODO -- do this based on auth
        let cognitoId = res.locals.user.sub
        // editable fields: lookingFor, lastName, shortTerm, ageRange, photoLinks
        let {lookingFor, lastName, shortTerm, ageRange, photoLinks, location} = req.body

        try {
            let user = await UserModel.findOne({cognitoId})
            user.lookingFor = lookingFor || user.lookingFor
            user.lastName = lastName || user.lastName
            user.shortTerm = (shortTerm === undefined) ? user.shortTerm : shortTerm
            user.ageRange = ageRange || user.ageRange
            user.photoLinks = photoLinks || user.photoLinks
            user.location = location || user.location

            user.profileComplete = (user.lookingFor.length > 0 && user.photoLinks.length >= MIN_NUMBER_PHOTOS)

            await user.save()
            return res.status(200).json("Saved")
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when editing this profile")
        }
    })
}