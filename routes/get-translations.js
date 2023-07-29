const TranslationModel = require('../models/TranslationModel')
const AzureApiKey = "d2ecbca4fc4442f0b95303df2909a6ed"

// currently takes word in target language, returns the native lang translation for the word
function getTranslation(targetWords, nativeLang, targetLang) {
  const endpoint = "https://api.cognitive.microsofttranslator.com"
  const path = '/translate'
  const constructed_url = endpoint + path

  const url = new URL(constructed_url);
  url.searchParams.append('api-version', '3.0');
  url.searchParams.append('from', targetLang);
  url.searchParams.append('to', nativeLang);

  let headers = {
    'Ocp-Apim-Subscription-Key': AzureApiKey,
    'Ocp-Apim-Subscription-Region': 'eastus',
    'Content-Type': "application/json"
  }

  let data = targetWords.map(word => {
    return {text: word}
  })

  let options = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  }

  return new Promise((resolve, reject) => {
    fetch(url, options)
    .then(async (response) => {
      response = await response.json()
      if (response.error) {
        return reject(response)
      }
      return resolve(response)
    })
  })
}

module.exports = (router) => {
  /**
   *
   * @openapi
   *
   * /get-translations:
   *  post:
   *    produces:
   *      - application/json
   *    description: gets translations from words in target language to words in native language
   *    body:
   *      targetLanguage: string,
   *      nativeLanguage: string,
   *      targetWords: [string]
   */
  router.post('/get-translations', async (req, res) => {
    if (!req.body.targetLanguage || !req.body.nativeLanguage || !req.body.targetWords) {
      return res.status(400).json("You must specify targetLanguage, nativeLanguage, targetWords")
    }

    // of the form {targetWord => nativeWord}
    let translations = new Map()
    // find all translations we know of
    try {
      console.log("Finding translations in backend")
      let translationArrays = await Promise.all([
        // search the 1st field for the word
        TranslationModel.find({
          language1: req.body.targetLanguage,
          language2: req.body.nativeLanguage,
          word1: req.body.targetWords
        }).lean(),
        // search the 2nd field for the word
        TranslationModel.find({language2: req.body.targetLanguage,
          language1: req.body.nativeLanguage,
          word2: req.body.targetWords
        }).lean()
      ])

      // start setting up the mapping
      for (let translation of translationArrays[0]) {
        translations.set(translation.word1, translation.word2)
      }
      // reverse for the other mapping
      for (let translation of translationArrays[1]) {
        translations.set(translation.word2, translation.word1)
      }
    } catch (err) {
      console.error(err)
      return res.status(500).json("An error occurred when polling our database for translations")
    }
    
    // find any words we don't yet have translations for
    let otherWords = [[]]
    let otherWordsArrayIdx = 0                    // only allow groups of up to 1000 words
    let otherWordsCount = 0
    for (let word of req.body.targetWords) {
      if (!translations.has(word)) {
        otherWords[otherWordsArrayIdx].push(word)
        otherWordsCount++
        if (otherWords[otherWordsArrayIdx] > 1000) {
          otherWords.push([])
          otherWordsArrayIdx++
        }
      }
    }
  
    // look up additional words in AZURE API
    let azureTranslations = new Map()
    try {
      if (otherWordsCount > 0) {
        console.log("Getting additional words from Azure")
        let azureData = await Promise.all(otherWords.map(targetWords => getTranslation(targetWords, req.body.nativeLanguage, req.body.targetLanguage)))
        // go over all azureData and match it with the request information
        for (let clusterIdx=0; clusterIdx < azureData.length; clusterIdx++) {
          for (let translationIdx=0; translationIdx < azureData[clusterIdx].length; translationIdx++) {
            // assume only 1 element
            azureTranslations.set(otherWords[clusterIdx][translationIdx], azureData[clusterIdx][translationIdx].translations[0].text)
          }
        }
      }
    } catch (err) {
      console.error(err)
      return res.status(500).json("Failed to get additional words from the Azure API")
    }
    
    // log those words back to Mongo & make updates
    try {
      await TranslationModel.insertMany(Array.from(azureTranslations, ([targetWord, nativeWord]) => {
        return {
          language1: req.body.targetLanguage,
          word1: targetWord,
          language2: req.body.nativeLanguage,
          word2: nativeWord,
        }
      }))
    }
    catch (err) {
      console.error(err)
      return res.status(500).json("An error occurred when inserting Azure translations into Mongo")
    }
    
    // send response map back to user
    for (let [targetWord, nativeWord] of azureTranslations) {
      translations.set(targetWord, nativeWord)
    }
    return res.status(200).json({
      targetLanguage: req.body.targetLanguage,
      nativeLanguage: req.body.nativeLanguage,
      translations: Array.from(translations, ([targetWord, nativeWord]) => {
        return {
          targetWord, nativeWord
        }
      })
    })
  })
}