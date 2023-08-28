/*
Views any dates that you or other users proposed
 */
const UserModel = require("../../models/UserModel");
const DateModel = require("../../models/DateModel");
const {userInDate} = require("../date/userInDate");
const {calculateDistanceBetweenCoords} = require("./calculateDistanceBetweenCoords");
const ConversationModel = require("../../models/ConversationModel");
module.exports = (router) => {
    router.get('/display-room', async (req, res) => {
        try {
            let cognitoId = res.locals.user.sub

            if (!cognitoId) {
                return res.status(400).json("Specify your cognitoId")
            }

            // get your own ID, populating both sides of your room (which will be returned for you to view)
            let user = await UserModel.findOne({cognitoId})
                .select(["_id", "isTemporarilyLocked", "mustReviewDate", "currentRoom", "location"])
                .populate({
                    path: "currentRoom",
                    select: ["sideOne", "sideOneIdentity", "sideTwo", "sideTwoIdentity"],
                    populate: [{
                        path: "sideOne",
                        select: ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
                    }, {
                        path: "sideTwo",
                        select: ["_id", "firstName", "identity", "age", "location", "photoLinks", "shortTerm"]
                    }]
                })
                .lean().exec()
            if (!user) {
                return res.status(400).json("Invalid cognitoID")
            }

            if (user.isTemporarilyLocked || user.mustReviewDate) {
                return res.status(400).json("User is currently locked and may not see room")
            }

            if (!user.currentRoom) {
                return res.status(500).json("User is not in a room")
            }

            let idArray = []
            for (let userGroup of [user.currentRoom.sideOne, user.currentRoom.sideTwo]) {
                for (let userObj of userGroup) {
                    // for date collection
                    idArray.push(userObj._id)
                    // calculate the distance to that user
                    userObj.distance = Math.round(calculateDistanceBetweenCoords({
                        longitude: user.location.coordinates[0],
                        latitude: user.location.coordinates[1],
                    }, {
                        longitude: userObj.location.coordinates[0],
                        latitude: userObj.location.coordinates[1],
                    }))
                    // clear the location field to prevent stalking
                    userObj.location = undefined
                }
            }

            // ============================ BEGIN: Getting dates ===========================
            /**
             * https://stackoverflow.com/questions/49554129/mongoose-find-all-documents-with-array-field-which-is-included-in-another-array
             *
             * We find the intersection of the ids and the user arrays for each date
             * Only allow user arrays with no additional users
             */
            let dates = await DateModel.aggregate([
                {
                    $addFields: {
                        matchingElements: { $setIntersection: [ idArray, "$users" ] }
                    }
                },
                {
                    $redact: {
                        $cond: {
                            if: { $eq: [ { $size: "$users" }, { $size: "$matchingElements" } ] },
                            then: "$$KEEP",
                            else: "$$PRUNE"
                        }
                    }
                },
                {
                    $project: {
                        matchingElements: 0
                    }
                }
            ])

            // remove setups from outside the group
            let datesPruned = []
            for (let date of dates) {
                // if the searching user is not in the date, and the date is not accepted, do not display it
                if (!userInDate(date, user._id) && !date.isAccepted) {
                    continue
                }

                // non-setups are valid
                if (date.users.length === 2) {
                    datesPruned.push(date)
                }
                else {
                    // setups from within the group are valid
                    for (let id of idArray) {
                        if (id + "" === date.setupResponsibleUser + "") {
                            datesPruned.push(date)
                            break
                        }
                    }
                }
            }

            // ====================== BEGIN: getting conversations ======================/
            // this is exactly the same as dates, but without post-processing
            let conversations = await ConversationModel.aggregate([
                {
                    $addFields: {
                        matchingElements: { $setIntersection: [ idArray, "$users" ] }
                    }
                },
                {
                    $redact: {
                        $cond: {
                            if: { $eq: [ { $size: "$users" }, { $size: "$matchingElements" } ] },
                            then: "$$KEEP",
                            else: "$$PRUNE"
                        }
                    }
                },
                {
                    $project: {
                        matchingElements: 0
                    }
                }
            ])

            return res.status(200).json({room: user.currentRoom, dates: datesPruned, conversations})
        } catch (err) {
            console.error(err)
            return res.status(500).json(err)
        }
    })
}