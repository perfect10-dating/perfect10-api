/*
Given a set of scoring attributes,
 */
function generateScore(totalScore, totalDates, intelligent, trustworthy, attractive, pleasant, satisfied, secondDate) {
    // TODO -- more sophisticated function to determine the generated score?
    let singleDateScore = satisfied - 5.5

    // increase totalScore
    totalScore += singleDateScore
    totalDates += 1

    /*
    Here's where things get interesting. Scores go from -4.5 to 4.5 centered on 0.
    I'm opting to do roomScore = totalScore / (totalDates)^5/7
    This is useful because:
    1. It rewards people who are consistent and have similar (good) scores over many dates
    2. It is odd (produces negative values)

    Here's what a conversion table might look like:
    Total Score: 45
    Dates=10 ---> ~8.7 (best possible score in 10 dates)
    Dates=20 ---> ~5.3 (a upper-middle score of 2.25 does better after 20 dates than a top score does after 1 date)
    Dates=40 ---> ~3.2 (still a solid score for someone averaging 1.25)

    Similar curves are available for -45
     */
    let roomScore = totalScore / Math.pow(totalDates, 5/7)

    return {totalScore, totalDates, roomScore}
}

module.exports = {generateScore}