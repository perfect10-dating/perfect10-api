// Convert from degrees to radians
function degreesToRadians(degrees) {
    let radians = (degrees * Math.PI)/180;
    return radians;
}

// Function takes two objects, that contain coordinates to a starting and destination location.
function calculateDistanceBetweenCoords(startingCoords, destinationCoords){
    let startingLat = degreesToRadians(startingCoords.latitude);
    let startingLong = degreesToRadians(startingCoords.longitude);
    let destinationLat = degreesToRadians(destinationCoords.latitude);
    let destinationLong = degreesToRadians(destinationCoords.longitude);

    // Radius of the Earth in miles
    let radius = 3958.8;

    // Haversine equation
    return Math.acos(Math.sin(startingLat) * Math.sin(destinationLat) +
        Math.cos(startingLat) * Math.cos(destinationLat) *
        Math.cos(startingLong - destinationLong)) * radius;
}

module.exports = {calculateDistanceBetweenCoords}
