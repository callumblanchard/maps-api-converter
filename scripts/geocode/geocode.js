const googleMaps = require('@google/maps');
const csv = require('csv-parser');
const fs = require('fs');

function outputSchema(address, location) {
  return {
    address,
    lat: location.lat,
    lon: location.lng,
  };
}

Promise.delay = (t, val) => new Promise((resolve) => {
  setTimeout(resolve.bind(null, val), t);
});

Promise.raceAll = (promises, timeoutTime, timeoutVal) => Promise.all(
  promises.map((p) => Promise.race([p, Promise.delay(timeoutTime, timeoutVal)])),
);

class Geocode {
  constructor() {
    this.baseClient = googleMaps.createClient({
      key: process.env.MAPS_API_KEY,
      Promise,
    });
  }

  get client() {
    return this.baseClient;
  }

  findLatLon(address) {
    return new Promise((resolve, reject) => {
      this.client.geocode({
        address,
      }, (err, response) => {
        const { results } = response.json;
        if (!err) {
          resolve(outputSchema(address, results[0].geometry.location));
        } else {
          reject(console.log(err));
        }
      });
    });
  }
}

function processAddress(data) {
  const gc = new Geocode();

  const address = Object.values(data).reduce((acc, x) => {
    if (acc === '') return x;
    if (x === '') return acc;
    return `${acc}, ${x}`;
  });

  // // console.log('address :', address);
  return gc.findLatLon(address);
}

function writeLocations(results) {
  // Will set to null if promise isn't resolved after 5 seconds.
  Promise.raceAll(results, 5000, null)
    .then((result) => {
      // // console.log('result :', result);
      const json = JSON.stringify(result.filter((obj) => obj), null, 2);
      fs.writeFileSync('data/locations.json', json);
    })
    .catch((err) => {
      console.log('err :', err);
    });
}

function main() {
  const results = [];

  fs.createReadStream('data/addresses.csv')
    .pipe(csv())
    .on('data', (data) => results.push(processAddress(data)))
    .on('end', () => {
      // // console.log('results :', results);
      writeLocations(results);
    });
}

main();
