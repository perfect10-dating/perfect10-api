const {findClosestGroup} = require("./findClosestGroup");
const {generateGroup} = require("./generateGroup");
const {rescoreGroup} = require("./rescoreGroup");

async function joinProperGroups({identity, age, lookingFor, locationCoords, userScore, dateChange}){
    return new Promise(async (resolve, reject) => {
        try {
            // find all sub-groups; i.e, looking for [men, women] --> looking for [[men], [women]]
            let groups = []
            for (let lookingForIdentity of req.body.lookingFor) {
                // avoid any undefined identities
                if (!lookingForIdentity) {
                    continue
                }

                console.log("JOIN-PROPER-GROUPS: Attempting to find a nearby group")
                let group = await findClosestGroup(req.body.identity, req.body.lookingFor, req.body.age, locationCoords)
                if (!group) {
                    console.log("JOIN-PROPER-GROUPS: Attempting to generate a group")
                    group = await generateGroup(req.body.identity, [lookingForIdentity], req.body.age, location, req.body.isBeginner)
                    console.log("JOIN-PROPER-GROUPS: Group generated")
                }
                group.totalCount += 1

                if (userScore && dateChange) {
                    // add the user score and date count to the group
                    rescoreGroup(group, 0, userScore, dateChange)
                }

                groups.push(group)
            }

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