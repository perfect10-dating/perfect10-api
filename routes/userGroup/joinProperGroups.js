const {findClosestGroup} = require("./findClosestGroup");
const {generateGroup} = require("./generateGroup");
const {rescoreGroup} = require("./rescoreGroup");

async function joinProperGroups({identity, age, lookingFor, location, userScore, dateChange}){
    return new Promise(async (resolve, reject) => {
        try {
            // find all sub-groups; i.e, looking for [men, women] --> looking for [[men], [women]]
            let groups = []
            for (let lookingForIdentity of lookingFor) {
                // avoid any undefined identities
                if (!lookingForIdentity) {
                    continue
                }

                console.log("JOIN-PROPER-GROUPS: Attempting to find a nearby group")
                let group = await findClosestGroup(identity, [lookingForIdentity], age, location.coordinates)
                if (!group) {
                    console.log("JOIN-PROPER-GROUPS: Attempting to generate a group")
                    group = await generateGroup(identity, [lookingForIdentity], age, location)
                    console.log("JOIN-PROPER-GROUPS: Group generated")
                }
                group.totalCount += 1

                if (userScore && dateChange) {
                    // add the user score and date count to the group
                    rescoreGroup(group, 0, userScore, dateChange)
                }

                groups.push(group)
            }

            console.log("Joining new groups...")
            // save the groups
            await Promise.all(groups.map(group => group.save()))

            resolve(groups)
        }
        catch (err) {
            return reject(err)
        }
    })
}

module.exports = {joinProperGroups}