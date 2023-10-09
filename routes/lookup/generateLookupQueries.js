const generateLookupQueries = ({userModel, queryEmail}) => {
  return (queryEmail || userModel.emailAddress) ?
    [{queryEmail: queryEmail || userModel.emailAddress, queryUser: userModel}] :
    [{queryUser: userModel}]
}

module.exports = {generateLookupQueries}