const fs = require('fs');
const path = require('path');

const LATEST_DIR = './latest';
const LATEST_FILE = path.join(LATEST_DIR, 'data.json');
const DAILY_DATA_DIR = './data';

// --- Helper Functions ---

function getCurrentDateString() {
  const now = new Date();
  // Get UTC date parts to ensure consistency regardless of server timezone
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
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

// Function to write file only if content has changed
function writeDataIfChanged(filePath, newDataString, logPrefix = '') {
  try {
    if (fs.existsSync(filePath)) {
      const existingDataString = fs.readFileSync(filePath, 'utf8');
      if (existingDataString === newDataString) {
        console.log(
          `${logPrefix}Content for ${path.basename(filePath)} has not changed. Skipping write.`,
        );
        return false; // No change, not written
      }
    }
  } catch (readError) {
    console.warn(
      `${logPrefix}Warning: Could not read existing file ${filePath} for comparison. Proceeding to write. Error: ${readError.message}`,
    );
    // If we can't read, we'll assume it needs to be written or is new
  }
  try {
    fs.writeFileSync(filePath, newDataString, 'utf8');
    console.log(`${logPrefix}Saved data to ${filePath}.`);
    return true; // Written
  } catch (writeError) {
    console.error(`${logPrefix}Error writing file ${filePath}:`, writeError);
    // Depending on severity, you might want to process.exit(1) here
    return false; // Failed to write
  }
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Assuming 'fetch' is available globally (e.g., Node.js 18+ or with a polyfill)
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not read error body');
        throw new Error(
          `HTTP error! Status: ${response.status} ${
            response.statusText
          }. Body: ${errorBody.substring(0, 200)}`,
        );
      }
      return await response.text(); // Return raw text
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

// --- Main Fetch Logic ---

async function fetchAndSaveCurrencyData() {
  const apiUrl = process.env.APIURL;
  if (!apiUrl) {
    console.error('Error: APIURL environment variable is not set.');
    process.exit(1);
  }

  console.log(`Fetching data from Open Exchange Rates...`);

  try {
    const rawData = await fetchWithRetry(apiUrl);
    let parsedApiData; // This will hold the full parsed API response
    let preparedJsonString; // This will be the string we intend to save

    try {
      parsedApiData = JSON.parse(rawData);
      // Prepare the specific structure you want to save
      preparedJsonString = JSON.stringify(
        {
          timestamp: parsedApiData.timestamp,
          base: parsedApiData.base,
          rates: parsedApiData.rates,
        },
        null, // No replacer function
        2, // Indent with 2 spaces for readability (optional, but good for diffs)
      );
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError.message);
      console.error('Received data sample (first 500 chars):', rawData.substring(0, 500));
      process.exit(1);
    }

    if (
      typeof parsedApiData.timestamp === 'undefined' ||
      typeof parsedApiData.base === 'undefined' ||
      typeof parsedApiData.rates === 'undefined'
    ) {
      console.error(
        'Error: Received JSON data is missing required fields (timestamp, base, rates).',
      );
      process.exit(1);
    }

    ensureDirectoryExists(LATEST_DIR);
    ensureDirectoryExists(DAILY_DATA_DIR);

    const currentDateStr = getCurrentDateString();
    const dailyFilePath = path.join(DAILY_DATA_DIR, `${currentDateStr}.json`);

    // Save latest data IF CHANGED
    writeDataIfChanged(LATEST_FILE, preparedJsonString, '[LATEST] ');

    // Save daily snapshot IF CHANGED (or if it's a new day's file)
    // For daily file, it's always "new" for that specific day or an update if run multiple times a day
    writeDataIfChanged(dailyFilePath, preparedJsonString, '[DAILY] ');
  } catch (error) {
    console.error('Error during fetch or save process:', error.message);
    process.exit(1);
  }
}

// --- Run ---
fetchAndSaveCurrencyData();
