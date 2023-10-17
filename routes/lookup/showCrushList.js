const UserModel = require("../../models/UserModel");
const LookupRequestModel = require("../../models/LookupRequestModel");
const {generateLookupQueries} = require("./generateLookupQueries");
const ConversationModel = require("../../models/ConversationModel");

/**
 * given a list of mutual lookup requests, get the list of other userIds or other emails
 * with which to find the people crushing on you.
 *
 * @param mutualCrushes
 * @param ownUserId
 * @param ownUserEmail
 * @returns {{emails: *[], userIds: *[]}}
 */
const getUserIdsAndEmails = ({mutualCrushes, ownUserId}) => {
  let userIds = []
  let emails = []

  for (let crush of mutualCrushes) {
    // you initiated the crush
    if (crush.lookingUser+"" === ownUserId+"") {
      if (crush.queryUser) {
        userIds.push(crush.queryUser)
      }
      if (crush.queryEmail) {
        userIds.push(crush.queryEmail)
      }
    }

    // the other person initiated the crush
    else {
      userIds.push(crush.lookingUser)
    }
  }

  return {userIds, emails}
}

module.exports = (router) => {
  router.get('/show-crush-list', async (req, res) => {
    try {
      let cognitoId = res.locals.user.sub
      let ownUser = await UserModel.findOne({cognitoId}).lean().exec()
      if (!ownUser) {
        return res.status(404).json("Please make sure you are logged in")
      }
  
      // find all users you have crushed on
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
        isMutual: false
      }).lean().exec()
  
      // find other users that are mutually interested in you
      let mutualLookupRequests = await LookupRequestModel.find({
        $or: [
          {lookingUser: ownUser, isMutual: true},
          {
            $or: generateLookupQueries({userModel: ownUser}),
            isMutual: true,
          }
        ]
      }).lean().exec()
      // console.log(mutualLookupRequests)

      // get the userIds and emails for the other person in the mutual crush
      const {userIds, emails} = getUserIdsAndEmails({
        mutualCrushes: mutualLookupRequests,
        ownUserId: ownUser._id
      })

      let userModels = await UserModel.find({_id: userIds}).select(
        ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
      ).lean().exec()
      let userModelsFromEmail = await UserModel.find({emailAddress: {$in: emails}}).select(
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