const LookupRequestModel = require("../../models/LookupRequestModel");
const fetch = require("node-fetch");
const {sendEmail} = require("../mailing/sendEmail");
module.exports = (router) => {
  router.post('/email-everyone-uvm', async (req, res) => {
    // // this is only legal on test environments
    // if (process.env.MONGO_DB) {
    //   return res.status(400).json("Test environments only!")
    // }
    
    try {
      
      // we only get 600 cells per query
      for (let letter of ["a", "b", "c", "d", "e", "f", "g"]) {
        let uvmUsers = await (await fetch("https://www.uvm.edu/directory/api/query_results.php?name=a&department=&phone=&soundslike=0&request_num=1")).json()
        console.log(uvmUsers.data.length)
  
        for (let user of uvmUsers.data) {
          // skip teachers and freshmen
          if (!user.ou || (
            user.ou["0"] !== "Sophomore" && user.ou["0"] !== "Junior" && user.ou["0"] !== "Senior")
          ) {
            continue
          }
    
          if (!user.mail || !user.mail["0"]) {
            continue
          }
          
          let email = user.mail["0"]
    
          console.log(`Sending email to ${email}, who is a ${user.ou["0"]}`)
    
          let existingLookup = await LookupRequestModel.findOne({
            lookingUser: "64de6a32a6c5868e119f2356",
            queryEmail: email,
          })
    
          if (existingLookup) {
            continue
          }
    
          let newLookupRequest = new LookupRequestModel({
            lookingUser: "64de6a32a6c5868e119f2356",
            queryEmail: email,
          })

          await newLookupRequest.save()

          await sendEmail({
            to: email,
            subject: "Someone is crushing on you!",
            text: `You have a secret admirer! Curious? Look them up on https://www.rizz.ly/crush`
          })
    
          // wait for 4 mins between sends
          await new Promise(resolve => setTimeout(resolve, 4*60*1000))
        }
      }
    
      return res.status(200).json("All emails sent!")
      
    } catch (err) {
      console.error(err)
      return res.status(500).json("Error occurred")
    }
  })
}