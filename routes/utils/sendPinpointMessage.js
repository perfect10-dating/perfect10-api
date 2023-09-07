
'use strict';

const AWS = require('aws-sdk');
// const aws_region = "us-east-1";

// The phone number or short code to send the message from. The phone number
// or short code that you specify has to be associated with your Amazon Pinpoint
// account. For best results, specify long codes in E.164 format.
const originationNumber = "+18889742216";

// The Amazon Pinpoint project/application ID to use when you send this message.
// Make sure that the SMS channel is enabled for the project or application
// that you choose.
const applicationId = "73d5287cf9de455ca63279dc97ef1542";

// // The type of SMS message that you want to send. If you plan to send
// // time-sensitive content, specify TRANSACTIONAL. If you plan to send
// // marketing-related content, specify PROMOTIONAL.
// const messageType = "PROMOTIONAL";

// // The registered keyword associated with the originating short code.
// const registeredKeyword = "myKeyword";

// The sender ID to use when sending the message. Support for sender ID
// varies by country or region. For more information, see
// https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms-countries.html
const senderId = "rizzly";

AWS.config.loadFromPath('./routes/utils/pinpoint-credentials.json')

// // Specify that you're using a shared credentials file, and optionally specify
// // the profile that you want to use.
// const credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
// AWS.config.credentials = credentials;
// // Specify the region.
// AWS.config.update({region:aws_region});

//Create a new Pinpoint object.
const pinpoint = new AWS.Pinpoint();

/**
 * send a single message via AWS Pinpoint to destinationNumber
 */
async function sendPinpointMessage({messageType, destinationNumber, message}) {
    return new Promise((resolve, reject) => {
        // Specify the parameters to pass to the API.
        const params = {
            ApplicationId: applicationId,
            MessageRequest: {
                Addresses: {
                    [destinationNumber]: {
                        ChannelType: 'SMS'
                    }
                },
                MessageConfiguration: {
                    SMSMessage: {
                        Body: message,
                        // Keyword: registeredKeyword,
                        MessageType: messageType,
                        OriginationNumber: originationNumber,
                        SenderId: senderId,
                    }
                }
            }
        };

        console.log("SEND-PINPOINT-MESSAGE: attempting to send the message")
        //Try to send the message.
        pinpoint.sendMessages(params, function(err, data) {
            // If something goes wrong, print an error message.
            if(err) {
                reject(err)
                // Otherwise, show the unique ID for the message.
            } else {
                resolve()
            }
        });
    })
}

module.exports = {sendPinpointMessage}

