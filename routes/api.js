const router = require('express').Router()
const CognitoExpress = require('cognito-express')

// TODO -- do we need route auth?
// auth wall
router.use(async function (req, res, next) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  return next()
})
// END ROUTE AUTHENTICATION

// BEGIN CUSTOM ROUTE REGISTRATION
// conversation routs
require('./conversation/getMessages')(router)
require('./conversation/postMessage')(router)

// date routes
require('./date/accept')(router)
require('./date/acceptSetup')(router)
require('./date/propose')(router)
require('./date/proposeSetup')(router)
require('./date/review')(router)
require('./date/viewProposedDates')(router)
// entry routes
// require('./entry/gainQueuePriority')(router)
// require('./entry/joinQueue')(router)

// global
// require('./global/displayRoomOptions')(router)

// room
require('./room/displayRoom')(router)
require('./room/formRoom')(router)

// user
require('./user/create')(router)
// require('./user/edit')(router)
require('./user/get-user')(router)
require('./user/switchGroups')(router)
// require('./user/uploadPhotos')(router)

// END CUSTOM ROUTE REGISTRATION

module.exports = router
