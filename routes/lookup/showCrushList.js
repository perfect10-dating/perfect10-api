const UserModel = require("../../models/UserModel");
const LookupRequestModel = require("../../models/LookupRequestModel");
const {generateLookupQueries} = require("./generateLookupQueries");
const ConversationModel = require("../../models/ConversationModel");

module.exports = (router) => {
  router.get('/show-crush-list', async (req, res) => {
    try {
      let cognitoId = res.locals.user.sub
      let ownUser = await UserModel.findOne({cognitoId}).lean().exec()
      if (!ownUser) {
        return res.status(404).json("Please make sure you are logged in")
      }
  
      // find all users you have crushed on, but have not reciprocated
      let yourCrushes = await LookupRequestModel.find({
        lookingUser: ownUser
      }).populate({
        path: 'queryUser',
        select: 'emailAddress'
      }).lean().exec()
      yourCrushes = yourCrushes.map(crush => {
        if (crush.queryUser) {
          return crush.queryUser.emailAddress
        }
        else {
          return crush.queryEmail
        }
      })
    
        // get the count of users that are interested in you, but you have not crushed on
      let peopleCrushingOnYou = await LookupRequestModel.find({
        $or: generateLookupQueries({userModel: ownUser}),
        mutualInterest: false
      }).lean().exec()
  
      // find other users that are mutually interested in you
      let mutualLookupRequests = await LookupRequestModel.find({lookingUser: ownUser, mutualInterest: true}).lean().exec()
      let userIds = mutualLookupRequests.filter(req => !!req.queryUser).map(req => req.queryUser)
      let emails = mutualLookupRequests.filter(req => !!req.queryEmail).map(req => req.queryEmail)
      
      let userModels = await UserModel.find({_id: userIds}).select(
        ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
      ).lean().exec()
      let userModelsFromEmail = await UserModel.find({emailAddress: emails}).select(
        ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
      ).lean().exec()
    
      userModels = userModels.concat(userModelsFromEmail)
  
      // ====================== BEGIN: getting conversations ======================/
      let conversations = await ConversationModel.find({$and: [
          {users: ownUser},
          {users: {$in: userModels}}
        ]}).lean().exec()
      
      return res.status(200).json({userModels, peopleCrushingOnYouCount: peopleCrushingOnYou.length, yourCrushes, conversations})
    }
    catch (err) {
      console.error(err)
      return res.status(500).json("An error occurred")
    }
  })
}