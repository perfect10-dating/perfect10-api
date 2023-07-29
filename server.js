const express = require('express')
const https = require('https')
const fs = require('fs')
const bodyParser = require('body-parser')
const logger = require('morgan')
const auth = require('@aws-amplify/auth')
const enableWs = require('express-ws')
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express')
require('dotenv').config()

const options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'qBraid API',
      version: '1.0.0',
      description: 'qBraid Express API',
    },
    servers: [
      {
        url: 'https://api.qbraid.com',
        description: 'Live Server'
      },
      {
        url: 'https://api-staging.qbraid.com',
        description: 'Staging Server'
      }
    ]
  },
  apis: ['./routes/*.js', './routes/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
const swaggerOptions = {
  swaggerOptions: {
    operationsSorter: (a, b) => {
      let methodsOrder = ["get", "post", "put", "patch", "delete", "options", "trace"];
      let result = methodsOrder.indexOf(a.get("method")) - methodsOrder.indexOf(b.get("method"));

      if (result === 0) {
        result = a.get("path").localeCompare(b.get("path"));
      }

      return result;
    }
  }
}

console.log('Starting express server...')
const server = express() // create express server
enableWs(server)

console.log('  Configuring express middleware...')
server.use(logger('dev')) // configure console logging of HTTP requests

// configure body formatting/parsing
server.set('json spaces', 2)
server.use(bodyParser.json({limit: '1mb', extended: false}))
server.use(bodyParser.urlencoded({extended: false}))
server.use(bodyParser.json())

// enable CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, id-token, refresh-token, email')
  next()
})

// configure amplify auth client
global.fetch = require('node-fetch') // required for amplify auth functionality
auth.default.configure({
  region: 'us-east-1',
  userPoolId: 'us-east-1_7hq9OmpnT',
  userPoolWebClientId: '70fo00fpob1sd133m98k7b0jan',
  authenticationFlowType: 'USER_SRP_AUTH'
})

// setup API router
console.log('  Configuring endpoints...')
server.use('/api', require('./routes/api'))
server.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions))

// handle GET to home route (needed for AWS Elastic Beanstalk enhanced health monitoring, which pings this route to check uptime)
server.get('/', (req, res) => res.sendStatus(200))

// handle 404s
server.use((req, res) => res.sendStatus(404))

// handle internal errors
server.use((err, req, res) => res.sendStatus(err.status || 500))
console.log('    Complete.')

module.exports = server
