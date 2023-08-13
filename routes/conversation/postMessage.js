const UserModel = require("../../models/UserModel");
const ConversationModel = require("../../models/ConversationModel");
const MessageModel = require("../../models/MessageModel");
module.exports = (router) => {
    router.post('/post-message', async (req, res) => {
        let {cognitoId, conversationId, text, isImage, imageUrl} = req.body()
        if (!cognitoId || !conversationId) {
            return res.status(400).json("You must be both logged in and specify a conversation")
        }

        if (!text && (!imageUrl || !isImage)) {
            return res.status(400).json("Message must contain either text or an image")
        }

        try {
            // make sure the user exists
            let user = await UserModel.findOne({cognitoId}).select("_id").lean().exec()
            if (!user) {
                return res.status(404).json("You appear to be logged in with an invalid user...")
            }

            // make sure that the conversation exists, and the posting user is part of it
            let conversation = await ConversationModel.findOne({users: user._id, _id: conversationId}).lean().exec()
            if (!conversation) {
                return res.status(404).json("Unable to find a conversation that you are in with this ID")
            }

            // create and save the message
            let message = new MessageModel({
                text,
                isImage,
                imageUrl,
                conversation: conversationId,
                user: user._id
            })

            await message.save()
            return res.status(200).json("Success")
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when posting your message")
        }
    })
}