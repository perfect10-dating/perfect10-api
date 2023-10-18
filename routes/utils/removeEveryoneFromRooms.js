const UserModel = require("../../models/UserModel");
const RoomModel = require("../../models/RoomModel");

module.exports = (router) => {
  router.post('/remove-everyone-from-rooms', async (req, res) => {
    // this is only legal on test environments
    if (!process.env.MONGO_DB) {
      let users = await UserModel.find({waitingForRoom: false}).exec()
      let rooms = await RoomModel.deleteMany({}).exec()
  
      for (let user of users) {
        user.waitingForRoom = true
        user.profileComplete = true
        user.currentRoom = undefined
      }
      
      await Promise.all(users.map(user => user.save()))
      
      return res.status(200).json("Success")
    }
  })
  
  router.get('/waiting-users-count' , async (req, res) => {
    try {
      let users = await UserModel.find({waitingForRoom: true}).lean().exec()
      let rooms = await RoomModel.find().lean().exec()
      
      let inRooms = 0
      for (let room of rooms) {
        inRooms += room.sideOneSize + room.sideTwoSize
      }
      
      return res.status(200).json({userCount: users.length, inRooms})
    } catch (err) {
      console.err(err)
      return res.status(500).json("an error occurred")
    }
  })
}