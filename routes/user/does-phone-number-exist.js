const UserModel = require("../../models/UserModel");
module.exports = (router) => {
    router.get('/does-phone-number-exist/:phoneNumber', async (req, res) => {
        try {
            let {phoneNumber} = req.params

            let user = await UserModel.findOne({phoneNumber}).select("_id").lean().exec()

            return res.status(200).json(!!user)
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when checking if a user has this phoneNumber")
        }
    })
}