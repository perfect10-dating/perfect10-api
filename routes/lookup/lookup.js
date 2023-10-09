const UserModel = require("../../models/UserModel");
const LookupRequestModel = require("../../models/LookupRequestModel");
const {generateLookupQueries} = require("./generateLookupQueries");

module.exports = (router) => {
  router.post('/lookup', async (req, res) => {
    try {
      let cognitoId = res.locals.user.sub
      let {lookupEmail} = req.body
      if (!lookupEmail) {
        return res.status(400).json("You must specify a lookup email")
      }
      let ownUser = await UserModel.findOne({cognitoId}).lean().exec()
      let otherUser = await UserModel.findOne({emailAddress: lookupEmail}).lean().exec()
      
      if (!ownUser) {
        return res.status(404).json("Please make sure you are logged in")
      }
      
      // STEP 0 -- make sure you haven't looked the other person up yet
      let ownExistingLookupRequest = await LookupRequestModel.findOne({lookingUser: ownUser,
        $or: generateLookupQueries({userModel: otherUser, queryEmail})
      })
      if (ownExistingLookupRequest) {
        return res.status(400).json("You have already crushed on this person")
      }
      
          // STEP 1 -- check to see if the other person already looked you up
      let existingLookupRequest = await LookupRequestModel.findOne({lookingUser: otherUser,
        $or: generateLookupQueries({userModel: ownUser})})
      
      // if so, set the lookup request to mutual (both people can see one another's profiles
      if (existingLookupRequest) {
        existingLookupRequest.isMutual = true
        await existingLookupRequest.save()
        return res.status(200).json("Mutual interest!")
      }
      
      // STEP 2 -- create a LookupRequest with either otherUser or ownUser
      let newLookupRequest = new LookupRequestModel({
        lookingUser: ownUser,
        queryUser: otherUser
      })
      if (!newLookupRequest.queryUser) {
        newLookupRequest.queryEmail = lookupEmail
      }
      await newLookupRequest.save()
      
      // TODO -- send an email to the email address telling them that they have a crush
      
      return res.status(200).json("Crush posted")
    }
    catch (err) {
      console.error(err)
      return res.status(500).json("An error occurred when conducting this lookup request")
    }
  })
}