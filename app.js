// this is the entry point to the application

'use strict'
require('dotenv').config()

console.log('\nStarting Rizzly API server...\n')

var mongoose = require('mongoose')
var PORT = process.env.PORT || 3001,
    MONGO_DB = process.env.MONGO_DB || 'mongodb+srv://admin:ADMIN_PASS@cluster0.oxoembv.mongodb.net/test?retryWrites=true&w=majority' // todo: move to environment variable
    // MONGO_DB = 'mongodb://localhost/27017'

const executor = async () => {
  try {
    await mongoose.connect(MONGO_DB)
    var connection = mongoose.connection
    
    console.log('  Connected to MongoDB.\n')
    var server = require('./server')
    server.listen(PORT, () => console.log('\nRunning Rizzly API server on port ' + PORT))
    
    process.on('SIGINT', () => connection.close().then(() => process.exit(0)))
  }
  catch (err) {
    console.error(err)
    console.error('Failed to connect to MongoDB.')
  }
}

executor()

