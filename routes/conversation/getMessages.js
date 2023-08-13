const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
const ConversationModel = require("../../models/ConversationModel");
const MessageModel = require("../../models/MessageModel");

module.exports = (router) => {
    router.get('/get-messages/:ownCognitoId/:otherUserId', async (req, res) => {
      let {ownCognitoId, otherUserId} = req.params
      if (!ownCognitoId || !otherUserId) {
          return res.status(400).json("You must be both logged in and specify another user")
      }

      try {
          let user = await UserModel.findOne({cognitoId: ownCognitoId}).select("_id").lean().exec()
          if (!user) {
              return res.status(404).json("You appear to be logged in with an invalid user...")
          }

          // use the same code as in displayRoom
          let conversations = await ConversationModel.aggregate([
              {
                  $addFields: {
                      matchingElements: { $setIntersection: [ [user._id, otherUserId], "$users" ] }
                  }
              },
              {
                  $redact: {
                      $cond: {
                          if: { $eq: [ { $size: "$users" }, { $size: "$matchingElements" } ] },
                          then: "$$KEEP",
                          else: "$$PRUNE"
                      }
                  }
              },
              {
                  $project: {
                      matchingElements: 0
                  }
              }
          ])

          if (conversations.length === 0) {
              console.log("GET-MESSAGES: no conversations found between these two users")
              // we have not yet created a conversation with this person. We will return no messages and no errors
              return res.status(200).json([])
          }

          else {
              let workingConversation = conversations[0]

              let messages = await MessageModel.find({conversation: workingConversation._id}).lean().exec()

              // sort the messages, with newest on the bottom
              let sortedMessages = messages.sort((message1, message2) => {
                  if (message1.createdAt < message2.createdAt) {
                      return -1
                  }
                  if (message1.createdAt > message2.createdAt) {
                      return 1
                  }
                  return 0
              })

              return res.status(200).json(sortedMessages)
          }
      }
      catch (err) {
          console.error(err)
          return res.status(500).json("An error occurred when trying to get your messages with this user")
      }
    })
}