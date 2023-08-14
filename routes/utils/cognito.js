const {
    CognitoUserPool,
    CognitoUser
} = require('amazon-cognito-identity-js')

const getCognitoUser = (email) => {
    const poolData = {
        UserPoolId : 'us-east-1_7hq9OmpnT',
        ClientId : '70fo00fpob1sd133m98k7b0jan',
    }
    const userPool = new CognitoUserPool(poolData)
    const userData = {
        Username : email,
        Pool : userPool
    }
    return new CognitoUser(userData)
}

module.exports = { getCognitoUser }