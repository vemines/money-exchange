const fs = require('fs');
const path = require('path');

const LATEST_DIR = './latest';
const LATEST_FILE = path.join(LATEST_DIR, 'data.json');
const DAILY_DATA_DIR = './data';

// --- Helper Functions ---

function getCurrentDateString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${year}-${month}-${day}`;
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      process.exit(1); // Exit if we can't create necessary directories
    }
  }
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Log more details on HTTP errors
        const errorBody = await response.text().catch(() => 'Could not read error body');
        throw new Error(
          `HTTP error! Status: ${response.status} ${
            response.statusText
          }. Body: ${errorBody.substring(0, 200)}`,
        );
      }
      // IMPORTANT: Return the raw text response to preserve formatting
      return await response.text();
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff (optional)
      } else {
        console.error(`Failed to fetch ${url} after ${retries} attempts.`);
        throw error; // Re-throw the error after final attempt fails
      }
    }
  }
}

// --- Main Fetch Logic ---

async function fetchAndSaveCurrencyData() {
  // Use the provided API URL directly. Consider moving to an environment variable for production.
  const apiUrl =
    'https://openexchangerates.org/api/latest.json?app_id=db1a0b1520c9402b8cf3a774f6b30d76';
  // const apiUrl = process.env.APIURL; // Keep this commented if using the hardcoded one
  if (!apiUrl) {
    console.error('Error: APIURL environment variable is not set.');
    process.exit(1);
  }

  console.log(`Fetching data from Open Exchange Rates...`); // Generic log

  try {
    // Fetch the raw text data
    const rawData = await fetchWithRetry(apiUrl);

    // --- Optional: Basic Validation of the fetched data before saving ---
    // Try parsing to check if it's valid JSON, but save the rawData later
    let jsonData;
    let json;
    try {
      jsonData = JSON.parse(rawData);
      json = JSON.stringify(
        {
          timestamp: jsonData.timestamp,
          base: jsonData.base,
          rates: jsonData.rates,
        },
        0,
      );
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError.message);
      console.error('Received data sample (first 500 chars):', rawData.substring(0, 500));
      // Decide if you want to exit or maybe try saving the raw data anyway
      // For now, we exit if parsing fails, as it indicates a problem.
      process.exit(1);
    }

    // Basic validation on the parsed data (optional but recommended)
    if (
      typeof jsonData.timestamp === 'undefined' ||
      typeof jsonData.base === 'undefined' ||
      typeof jsonData.rates === 'undefined'
    ) {
      // Decide if this is a critical error.
      console.error('Error: Received JSON data is missing required fields.');
      process.exit(1);
    }
    // --- End Optional Validation ---

    // Ensure directories exist before writing files
    ensureDirectoryExists(LATEST_DIR);
    ensureDirectoryExists(DAILY_DATA_DIR);

    // Get the correctly formatted date string
    const currentDateStr = getCurrentDateString(); // Will be YYYY-MM-DD
    const dailyFilePath = path.join(DAILY_DATA_DIR, `${currentDateStr}.json`);

    // --- Save the raw data ---
    // This preserves original formatting, spacing, and all fields (disclaimer, license). No minification occurs.
    fs.writeFileSync(LATEST_FILE, json, 'utf8'); // Specify encoding
    console.log(`Saved latest data to ${LATEST_FILE}`);

    // Save/Overwrite the daily snapshot with the same raw data
    fs.writeFileSync(dailyFilePath, json, 'utf8'); // Specify encoding
    console.log(`Saved daily snapshot to: ${dailyFilePath}`);
  } catch (error) {
    // Catch errors from fetchWithRetry or file writing
    console.error('Error during fetch or save process:', error.message);
    process.exit(1); // Exit with an error code
  }
}

// --- Run ---
fetchAndSaveCurrencyData();
