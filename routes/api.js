const router = require('express').Router()
const CognitoExpress = require('cognito-express')
const { getCognitoUser } = require('./utils/cognito')
const CognitoRefreshToken = require('amazon-cognito-identity-js').CognitoRefreshToken;
// END IMPORT SECTION

// BEGIN COGNITO
// configure cognito-express
const cognitoExpress = new CognitoExpress({
  region: 'us-east-1',
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_dgaKxRACk',
  tokenUse: 'id', // access or id
  tokenExpiration: 1000 * 60 * 60 * 24 // one day
})
// END COGNITO

// BEGIN ROUTE AUTHENTICATION
// specify routes that permit unauthenticated access
const UNAUTHENTICATED_ROUTES = [
    '/create-user',
    '/log-qr-code',
    '/generate-random-users',
    '/form-room-test',
    '/test-send-message',
    '/get-user-analytics',
    '/does-phone-number-exist',
    '/test-send-email',
    '/email-everyone-uvm',
  '/remove-everyone-from-rooms',
  '/waiting-users-count'
]

const ADMIN_ROUTES = []

// auth wall
router.use(async function (req, res, next) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // we will authenticate even on unauthenticated routes if id-token is provided
  let idToken = req.headers['id-token']

  for (let route of UNAUTHENTICATED_ROUTES) {
    if (req.path.startsWith(route) && !idToken) {
      return next()
    }
  }

  if (!idToken) {
    let phoneNumber = req.headers['phoneNumber']
    let refreshToken = req.headers['refresh-token']
    if (!phoneNumber || !refreshToken) {
      return res.status(400).json("If you don't specify an idToken, you must specify both an phoneNumber and refreshToken")
    }
    let cognitoRefreshToken = new CognitoRefreshToken({ RefreshToken: refreshToken })
    idToken = await new Promise((resolve) => {
      getCognitoUser(phoneNumber).refreshSession(cognitoRefreshToken, (err, session) => {
        err ? resolve() : resolve(session.getIdToken().getJwtToken())
      })
    })

    if (!idToken) {
      return res.status(500).json("Could not refresh the session with this token. Did it expire?")
    }
  }

  cognitoExpress.validate(idToken, function (err, cognitoUser) {
    if (err) {
      return res.status(401).send(err)
    }

    for (let route of ADMIN_ROUTES) {
      if (req.path.startsWith(route)) {
        let isAdmin = cognitoUser['custom:role'] === 'admin'
        if (isAdmin) {
          break
        } else {
          return res.sendStatus(401)
        }
      }
    }

    res.locals.user = cognitoUser
    console.log("AUTH SUCCESSFUL")
    next()
  })
})
// END ROUTE AUTHENTICATION

// BEGIN CUSTOM ROUTE REGISTRATION
// conversation routes
require('./conversation/getMessages')(router)
require('./conversation/postMessage')(router)

// date routes
require('./date/accept')(router)
require('./date/acceptSetup')(router)
require('./date/propose')(router)
require('./date/proposeSetup')(router)
require('./date/reject')(router)
require('./date/review')(router)
require('./date/viewProposedDates')(router)

// logging
require("./logging/logQrCode")(router)

// room
require('./room/displayRoom')(router)
require('./room/formRoom')(router)

// user
require('./user/create')(router)
require('./user/does-phone-number-exist')(router)
require('./user/edit')(router)
require('./user/get-user')(router)
require('./user/readyJoinRoom')(router)
require('./user/switchRooms')(router)
require('./user/unlock')(router)
require('./user/generate-random-users')(router)

// upload images
require('./utils/util-route')(router)

// messages
require('./utils/testSendMessage')(router)

// analytics
require('./analytics/getUserAnalytics')(router)

// lookup
require('./lookup/lookup')(router)
require('./lookup/showCrushList')(router)

// emails
require('./mailing/testSendEmail')(router)
require('./mailing/emailEveryoneUVM')(router)

// utilities
require('./utils/removeEveryoneFromRooms')(router)

// END CUSTOM ROUTE REGISTRATION

module.exports = router
