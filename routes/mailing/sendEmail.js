
const nodemailer = require("nodemailer");

const client = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "rizzly.crushes@gmail.com",
        pass: "czth jeow appy vqlv "
    }
});

function sendEmail({to, subject, text}) {
    return client.sendMail(
        {
            from: "rizzly.crushes@gmail.com",
            to,
            subject,
            text
        }
    )
}

module.exports = {sendEmail}
