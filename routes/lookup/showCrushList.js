const UserModel = require("../../models/UserModel");
const LookupRequestModel = require("../../models/LookupRequestModel");

module.exports = (router) => {
  router.get('/show-crush-list', async (req, res) => {
    try {
      let cognitoId = res.locals.user.sub
      let ownUser = await UserModel.findOne({cognitoId}).lean().exec()
      if (!ownUser) {
        return res.status(404).json("Please make sure you are logged in")
      }
      
      // find other users that are mutually interested in you
      let existingLookupRequests = await LookupRequestModel.find({lookingUser: ownUser, mutualInterest: true}).lean().exec()
      let userIds = existingLookupRequests.filter(req => !!req.queryUser).map(req => req.queryUser)
      let emails = existingLookupRequests.filter(req => !!req.queryEmail).map(req => req.queryEmail)
      
      let userModels = await UserModel.find({_id: userIds}).select(
        ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
      ).lean().exec()
      let userModelsFromEmail = await UserModel.find({emailAddress: emails}).select(
        ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
      ).lean().exec()
    
      userModels = userModels.concat(userModelsFromEmail)
      
      return res.status(200).json(userModels)
    }
    catch (err) {
      console.error(err)
      return res.status(500).json("An error occurred")
    }
  })
}