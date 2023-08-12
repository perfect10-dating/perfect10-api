module.exports = (router) => {
    router.post('/get-user', async (req, res) => {
        // TODO -- do this based on auth
        let {cognitoId} = req.body
        if (!cognitoId) {
            return res.status(400).json("Not logged in")
        }

        try {
            let user = await UserModel.findOne({cognitoId}).select([
                "_id", "cognitoId", "phoneNumber", "emailAddress", "firstName", "lastName", "identity", "age", "dateOfBirth",
                "location", "photoLinks", "lookingFor", "shortTerm", "ageRange", "waitingForRoom", "currentRoom",
                "temporarilyLocked", "unlockTime", "mustReviewDate", "lockingDate"
            ]).populate("lockingDate").lean().exec()
            if (!user) {
                return res.status(404).json("User not found")
            }

            user.locationCoords = user.location.coordinates
            
            return res.status(200).json(user)
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when getting user information")
        }
    })
}