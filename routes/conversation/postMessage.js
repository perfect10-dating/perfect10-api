const UserModel = require("../../models/UserModel");
const ConversationModel = require("../../models/ConversationModel");
const MessageModel = require("../../models/MessageModel");

/**
 * Creates a conversation if none exists; otherwise adds a message to that conversation
 * @param router
 */
module.exports = (router) => {
    router.post('/post-message', async (req, res) => {
        let cognitoId = res.locals.user.sub

        let {otherUserId, conversationId, text, isImage, imageUrl} = req.body
        if (!cognitoId || ((!conversationId || conversationId === "") && !otherUserId)) {
            return res.status(400).json("You must be both logged in and specify a conversation or other user")
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

            // no conversation exists yet
            let conversation
            if (!conversationId || conversationId === "") {
                let conversationTemp = new ConversationModel({users: [user._id, otherUserId]})
                conversation = await conversationTemp.save()
            }
            else {
                // make sure that the conversation exists, and the posting user is part of it
                conversation = await ConversationModel.findOne({users: user._id, _id: conversationId}).lean().exec()
                if (!conversation) {
                    return res.status(404).json("Unable to find a conversation that you are in with this ID")
                }
            }

            // create and save the message
            let message = new MessageModel({
                text,
                isImage,
                imageUrl,
                conversation: conversation._id,
                sender: user._id
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