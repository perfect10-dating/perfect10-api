const UserModel = require("../../models/UserModel");
const { PutObjectCommand, S3Client, S3ClientConfig } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

// const region = 'us-east-1'
// const bucketName = 'bellwether-media'
// const accessKeyId = 'AKIAZZMWSCXZZXFI6HGS'
// const secretAccessKey = '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'

const region = 'us-east-1'
const bucketName = 'perfect10-image-bucket'
const accessKeyId = 'AKIA4X7OMCUWMONUFBVH'
const secretAccessKey = '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'

const config = {
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
    region: region,
}

const s3 = new S3Client(config)

const generateUploadURL = async (_id) => {
    console.log(_id)
    const imageName = _id.toString() + "::::" + `${Math.floor(Math.random() * 1000000)}` + '.png'
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: imageName,
    })
    const url = await getSignedUrl(s3, command, { expiresIn: 60 })
    return { signedRequest: url, resourceUrl: `https://${bucketName}.s3.amazonaws.com/${imageName}` }
}

module.exports = (router) => {
    router.get('/s3-signed-url', async (req, res) => {
        let cognitoId = res.locals.user.sub

        try {
            // get the _id of the user
            let user = await UserModel.findOne({cognitoId}).select("_id").lean().exec()
            if (!user) {
                return res.status(404).json("User object not found")
            }

            // get the upload URL
            const result = await generateUploadURL(user._id)
            res.json(result)
        }
        catch (err) {
            console.error(err)
            return res.status(500).json("An error occurred when trying to upload this image")
        }
    })
}