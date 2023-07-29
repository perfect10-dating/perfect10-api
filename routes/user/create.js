const UserModel = require("../../models/UserModel");

module.exports = (router) => {
    router.post('/create-user', async (req, res) => {
        // TODO -- screen all the fields to make sure they all exist on the new user
        let user = new UserModel({
            cognitoId: req.body.cognitoId,
            phoneNumber: req.body.phoneNumber,
            emailAddress: req.body.emailAddress ? req.body.emailAddress : "",
            firstName: req.body.firstName,
            identity: req.body.identity,
            age: req.body.age,
            dateOfBirth: req.body.dateOfBirth,
            location: {type: "Point", coordinates: req.body.locationCoords},
            lookingFor: req.body.lookingFor,
            ageRange: req.body.ageRange,
        })

        user.save((err, savedUser) => {
            if (err) {
                console.error(err)
                return res.status(500).json("Failed to save a new user")
            }
            // return the new user _id
            return res.status(200).json(savedUser._id)
        })
    })
}