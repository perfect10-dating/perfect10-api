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
require('./get-translations')(router)
require('./get-recommendations')(router)
// END CUSTOM ROUTE REGISTRATION

module.exports = router
