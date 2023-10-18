const RoomModel = require("../../models/RoomModel");
const {sendPinpointMessage} = require("../utils/sendPinpointMessage");

module.exports = (router) => {
  router.post('/text-everyone', async (req, res) => {
    let room = await RoomModel.findOne().populate(["sideOne", "sideTwo"]).exec()
  
    console.log("Texting everyone in room")
    console.log(room)
    
    await Promise.all([room.sideOne, room.sideTwo].map(userArray => {
      return Promise.all(userArray.map(indUser => {
        return sendPinpointMessage({
          messageType: "PROMOTIONAL",
          destinationNumber: indUser.phoneNumber,
          message:
            `Hi ${indUser.firstName}! This is Rizzly, letting you know that we created a room for you. View your matches now at https://rizz.ly`
        })
      }))
    }))
    
    return res.status(200).json("success")
  })
}