const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
const ConversationModel = require("../../models/ConversationModel");
const MessageModel = require("../../models/MessageModel");

module.exports = (router) => {
    router.get('/get-messages/:otherUserId', async (req, res) => {
        let ownCognitoId = res.locals.user.sub
      let {otherUserId} = req.params
      if (!ownCognitoId || !otherUserId) {
          return res.status(400).json("You must be both logged in and specify another user")
      }

      try {
          let user = await UserModel.findOne({cognitoId: ownCognitoId}).select("_id").lean().exec()
          if (!user) {
              return res.status(404).json("You appear to be logged in with an invalid user...")
          }

          // use the same code as in displayRoom
          let conversations = await ConversationModel.find({
              users: {$all: [user._id+"", otherUserId+""]},
          }).exec()

          if (conversations.length === 0) {
              console.log("GET-MESSAGES: no conversations found between these two users")
              // we have not yet created a conversation with this person. We will return no messages and no errors
              return res.status(200).json([])
          }

          else {
              console.log("GET-MESSAGES: at least one conversation found")
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

              // mark the workingConversation as read
              if (workingConversation.users[0]+"" === user._id+"") {
                  workingConversation.user0Read = true
              }
              else {
                  workingConversation.user1Read = true
              }
              await workingConversation.save()

              return res.status(200).json(sortedMessages)
          }
      }
      catch (err) {
          console.error(err)
          return res.status(500).json("An error occurred when trying to get your messages with this user")
      }
    })
}