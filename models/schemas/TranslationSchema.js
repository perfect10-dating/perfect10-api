const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

const requiredString = { type: String, required: true }

// just a simple mapping from a word in the 1st language to the second language
const TranslationSchema = new mongoose.Schema({
  language1: requiredString,
  // spend a little extra memory for really fast word lookups
  word1: { type: String, required: true, index: true },
  
  language2: requiredString,
  // spend a little extra memory for really fast word lookups
  word2: { type: String, required: true, index: true },
  
}, {timestamps: true})

module.exports = TranslationSchema
