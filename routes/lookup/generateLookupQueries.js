const generateLookupQueries = ({userModel, queryEmail}) => {
  if (queryEmail) {
    return [{queryEmail}]
  }

  return userModel.emailAddress ?
    [{queryEmail: userModel.emailAddress}, {queryUser: userModel}] :
    [{queryUser: userModel}]
}

module.exports = {generateLookupQueries}