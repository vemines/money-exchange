const fs = require('fs');
const path = require('path');

const LATEST_DIR = './latest';
const CURRENCIES_DIR = './currencies';
const DAILY_DATA_DIR = './data';

const LATEST_FILE = path.join(LATEST_DIR, 'data.json');
const CURRENCIES_FILE = path.join(CURRENCIES_DIR, 'currencies.json');

// --- Helper Functions ---

function getCurrentDateString() {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${year}-${month}-${day}`;
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      process.exit(1);
    }
  }
}

function writeDataIfChanged(filePath, newDataString, logPrefix = '') {
  try {
    if (fs.existsSync(filePath)) {
      const existingDataString = fs.readFileSync(filePath, 'utf8');
      if (existingDataString === newDataString) {
        console.log(
          `${logPrefix}Content for ${path.basename(filePath)} has not changed. Skipping write.`,
        );
        return false;
      }
    }
  } catch (readError) {
    console.warn(
      `${logPrefix}Warning: Could not read existing file ${filePath} for comparison. Proceeding to write. Error: ${readError.message}`,
    );
  }
  try {
    fs.writeFileSync(filePath, newDataString, 'utf8');
    console.log(`${logPrefix}Saved data to ${filePath}.`);
    return true;
  } catch (writeError) {
    console.error(`${logPrefix}Error writing file ${filePath}:`, writeError);
    return false;
  }
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body');
        throw new Error(
          `HTTP error! Status: ${response.status} ${
            response.statusText
          }. Body: ${errorBody.substring(0, 200)}`,
        );
      }
      return await response.text();
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        console.error(`Failed to fetch ${url} after ${retries} attempts.`);
        throw error;
      }
    }
  }
}

// --- New Function to Fetch Currency List ---
async function fetchAndSaveCurrencyList(appId) {
  const currenciesListApiUrl = `https://openexchangerates.org/api/currencies.json?app_id=${appId}`;
  console.log(`Fetching currency list from Open Exchange Rates: ${currenciesListApiUrl}`);

  try {
    const rawData = await fetchWithRetry(currenciesListApiUrl);
    let parsedApiData;

    try {
      parsedApiData = JSON.parse(rawData);
    } catch (parseError) {
      console.error('Error parsing currency list JSON response:', parseError.message);
      console.error('Received data sample (first 500 chars):', rawData.substring(0, 500));
      process.exit(1);
    }

    if (
      typeof parsedApiData !== 'object' ||
      parsedApiData === null ||
      Object.keys(parsedApiData).length === 0
    ) {
      console.error('Error: Received currency list data is not a valid non-empty object.');
      console.error('Received data:', parsedApiData);
      process.exit(1);
    }

    const preparedJsonString = JSON.stringify(parsedApiData, null, 0);
    writeDataIfChanged(CURRENCIES_FILE, preparedJsonString, '[CURRENCIES LIST]');
  } catch (error) {
    console.error('Error during currency list fetch or save process:', error.message);
    process.exit(1);
  }
}

// --- Modified Main Fetch Logic for Exchange Rates ---
async function fetchAndSaveExchangeRates(appId) {
  const latestRatesApiUrl = `https://openexchangerates.org/api/latest.json?app_id=${appId}`;
  console.log(`Fetching latest exchange rates from Open Exchange Rates: ${latestRatesApiUrl}`);

  try {
    const rawData = await fetchWithRetry(latestRatesApiUrl);
    let parsedApiData;
    let preparedJsonString;

    try {
      parsedApiData = JSON.parse(rawData);
      preparedJsonString = JSON.stringify(
        {
          timestamp: parsedApiData.timestamp,
          base: parsedApiData.base,
          rates: parsedApiData.rates,
        },
        null,
        0,
      );
    } catch (parseError) {
      console.error('Error parsing latest rates JSON response:', parseError.message);
      console.error('Received data sample (first 500 chars):', rawData.substring(0, 500));
      process.exit(1);
    }

    if (
      typeof parsedApiData.timestamp === 'undefined' ||
      typeof parsedApiData.base === 'undefined' ||
      typeof parsedApiData.rates === 'undefined'
    ) {
      console.error(
        'Error: Received latest rates JSON data is missing required fields (timestamp, base, rates).',
      );
      process.exit(1);
    }

    // ensureDirectoryExists calls moved to run() function
    const currentDateStr = getCurrentDateString();
    const dailyFilePath = path.join(DAILY_DATA_DIR, `${currentDateStr}.json`);

    writeDataIfChanged(LATEST_FILE, preparedJsonString, '[LATEST RATES] ');
    writeDataIfChanged(dailyFilePath, preparedJsonString, '[DAILY RATES] ');
  } catch (error) {
    console.error('Error during latest rates fetch or save process:', error.message);
    process.exit(1);
  }
}

// --- Main Execution ---
async function run() {
  const appId = process.env.OXR_APP_ID;
  if (!appId) {
    console.error(
      'Error: OXR_APP_ID environment variable is not set. Please set it to your Open Exchange Rates App ID.',
    );
    process.exit(1);
  }

  console.log('Ensuring all necessary directories exist...');
  ensureDirectoryExists(LATEST_DIR);
  ensureDirectoryExists(CURRENCIES_DIR);
  ensureDirectoryExists(DAILY_DATA_DIR);
  console.log('Directories are ready.');

  try {
    // Fetch and save the list of all currencies
    await fetchAndSaveCurrencyList(appId);

    // Fetch and save the latest exchange rates
    await fetchAndSaveExchangeRates(appId); // Renamed from fetchAndSaveCurrencyData for clarity

    console.log('\nAll data fetching and saving tasks completed successfully.');
  } catch (error) {
    // This catch is mostly for programming errors in run() itself,
    // as the sub-functions currently use process.exit() on error.
    console.error('A critical error occurred in the main execution flow:', error.message);
    process.exit(1);
  }
}

run();
