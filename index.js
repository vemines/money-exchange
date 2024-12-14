const http = require('https');
const fs = require('fs');

function fetchAndSaveCurrencyData() {
  const request = http.get(process.env.APIURL, (response) => {
    if (response.statusCode !== 200) {
      console.error(`HTTP error! Status: ${response.statusCode}`);
      return;
    }

    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        const json = JSON.stringify({
          timestamp: jsonData.timestamp,
          base: jsonData.base,
          rates: jsonData.rates,
        });
        fs.writeFileSync('latest/data.json', json);

        console.log('Currency data updated');
      } catch (error) {
        console.error('Error parsing JSON:', error.message);
      }
    });
  });

  request.on('error', (error) => {
    console.error('Error making HTTP request:', error.message);
  });
}

// Call the function to fetch and save data
fetchAndSaveCurrencyData();
