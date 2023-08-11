const UserModel = require("../../models/UserModel");
const {findClosestGroup} = require("../userGroup/findClosestGroup");
const {generateGroup} = require("../userGroup/generateGroup");

module.exports = (router) => {
    router.post('/create-user', async (req, res) => {
        // TODO -- screen all the fields to make sure they all exist on the new user
        let location = {type: "Point", coordinates: req.body.locationCoords}

        if (req.body.age < 18 || req.body.age > 150) {
            return res.status(400).json("Age is too small or too large")
        }

        try {
            // find all sub-groups; i.e, looking for [men, women] --> looking for [[men], [women]]
            let groups = []
            for (let lookingForIdentity of req.body.lookingFor) {
                console.log("CREATE-USER: Attempting to find a nearby group")
                let group = await findClosestGroup(req.body.identity, req.body.lookingFor, req.body.age, req.body.locationCoords)
                if (!group) {
                    console.log("CREATE-USER: Attempting to generate a group")
                    group = await generateGroup(req.body.identity, req.body.lookingFor, req.body.age, location, req.body.isBeginner)
                    console.log("CREATE-USER: Group generated")
                }
                group.totalCount += 1
                groups.push(group)
            }

            // save the groups
            await Promise.all(groups.map(group => group.save()))

            let user = new UserModel({
                cognitoId: req.body.cognitoId,
                phoneNumber: req.body.phoneNumber,
                emailAddress: req.body.emailAddress,
                firstName: req.body.firstName,
                identity: req.body.identity,
                age: req.body.age,
                dateOfBirth: req.body.dateOfBirth,
                location,
                lookingFor: req.body.lookingFor,
                ageRange: req.body.ageRange,
                shortTerm: !!req.body.shortTerm,
                userGroups: groups,
            })

            let savedUser = await user.save()
            return res.status(200).json(savedUser._id)
        }
        catch (err) {
            console.error("CREATE-USER: User creation failed")
            console.error(err)
            return res.status(500).json("CREATE-USER: User creation failed")
        }
    })
}