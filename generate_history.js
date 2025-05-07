const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = './data';
const HISTORY_DIR = './history';

// Define periods: lookback days and sampling rules
const HISTORY_PERIODS = {
  week: { days: 7, sampleRule: { type: 'gap', value: 1 } },
  month: { days: 31, sampleRule: { type: 'gap', value: 2 } },
  '6m': { days: 183, sampleRule: { type: 'daysOfMonth', values: [1, 11, 21] } },
  year: { days: 366, sampleRule: { type: 'daysOfMonth', values: [1, 15] } },
  '2y': { days: 731, sampleRule: { type: 'dayOfMonth', value: 1 } },
  '5y': { days: 1826, sampleRule: { type: 'firstDayOfNthMonth', value: 3 } },
};

// --- Helper Functions ---

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    } catch (e) {
      console.error(`Error creating dir ${dirPath}:`, e);
      process.exit(1);
    }
  }
}

// Copied from index.js - consider making this a shared utility if you have many scripts
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
  }
  try {
    fs.writeFileSync(filePath, newDataString, 'utf8');
    console.log(`${logPrefix}Saved data to ${filePath}.`);
    return true; // Written
  } catch (writeError) {
    console.error(`${logPrefix}Error writing file ${filePath}:`, writeError);
    return false; // Failed to write
  }
}

function parseDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.json$/);
  if (!match) return null;
  const date = new Date(Date.UTC(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])));
  if (
    isNaN(date.getTime()) ||
    date.getUTCFullYear() !== parseInt(match[1]) ||
    date.getUTCMonth() !== parseInt(match[2]) - 1 ||
    date.getUTCDate() !== parseInt(match[3])
  ) {
    console.warn(`Skipping invalid date filename: ${filename}`);
    return null;
  }
  return date;
}

function getUTCDateString(date) {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getUTCMonthString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// --- Main Logic ---

function generateHistory() {
  console.log('Starting history generation...');
  ensureDirectoryExists(HISTORY_DIR);

  let allDailyFiles = [];
  try {
    const filenames = fs.readdirSync(DATA_DIR);
    allDailyFiles = filenames
      .map((filename) => ({ filename, date: parseDateFromFilename(filename) }))
      .filter((f) => f.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Data directory does not exist or is empty. Skipping history generation.');
      return;
    } else {
      console.error(`Error reading data directory:`, error);
      process.exit(1);
    }
  }

  if (allDailyFiles.length === 0) {
    console.log('No valid daily data files found in ./data. Skipping history generation.');
    return;
  }
  console.log(`Found ${allDailyFiles.length} total valid daily data files.`);
  const now = new Date();

  for (const [period, config] of Object.entries(HISTORY_PERIODS)) {
    console.log(`\nProcessing period: ${period}`);
    const cutoffDate = new Date(now);
    cutoffDate.setUTCDate(now.getUTCDate() - config.days);
    const cutoffTimestamp = cutoffDate.getTime();
    const relevantFiles = allDailyFiles.filter((f) => f.date.getTime() >= cutoffTimestamp);

    if (relevantFiles.length === 0) {
      console.log(` -> No data files found within the last ${config.days} days. Skipping.`);
      continue;
    }
    // console.log(` -> Found ${relevantFiles.length} files within the lookback period.`); // Less verbose

    let sampledFiles = [];
    const rule = config.sampleRule;

    if (rule.type === 'gap') {
      sampledFiles = relevantFiles.filter((_, index) => index % rule.value === 0);
    } else if (rule.type === 'daysOfMonth') {
      const targetDays = new Set(rule.values);
      const includedDates = new Set();
      sampledFiles = relevantFiles.filter((file) => {
        const dayOfMonth = file.date.getUTCDate();
        const dateStr = getUTCDateString(file.date);
        if (targetDays.has(dayOfMonth) && !includedDates.has(dateStr)) {
          includedDates.add(dateStr);
          return true;
        }
        return false;
      });
    } else if (rule.type === 'dayOfMonth') {
      const targetDay = rule.value;
      const includedMonths = new Set();
      sampledFiles = relevantFiles.filter((file) => {
        const monthStr = getUTCMonthString(file.date);
        const dayOfMonth = file.date.getUTCDate();
        if (dayOfMonth >= targetDay && !includedMonths.has(monthStr)) {
          includedMonths.add(monthStr);
          return true;
        }
        return false;
      });
    } else if (rule.type === 'firstDayOfNthMonth') {
      const monthGap = rule.value;
      const includedMonths = new Set();
      sampledFiles = relevantFiles.filter((file) => {
        const monthIndex = file.date.getUTCMonth();
        const monthStr = getUTCMonthString(file.date);
        if (monthIndex % monthGap === 0 && !includedMonths.has(monthStr)) {
          includedMonths.add(monthStr);
          return true;
        }
        return false;
      });
    }
    // console.log(` -> Selected ${sampledFiles.length} files after sampling.`); // Less verbose

    if (sampledFiles.length === 0) {
      console.warn(` -> No files selected after sampling for period ${period}. Skipping.`);
      continue;
    }

    const historicalRates = {};
    let latestTimestampUsed = 0;
    let baseCurrency = null;

    for (const fileInfo of sampledFiles) {
      const dateString = getUTCDateString(fileInfo.date);
      if (!dateString) continue;
      try {
        const filePath = path.join(DATA_DIR, fileInfo.filename);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const dailyData = JSON.parse(fileContent);
        if (!baseCurrency && dailyData.base) baseCurrency = dailyData.base;
        const currentTimestamp = dailyData.timestamp || Math.floor(fileInfo.date.getTime() / 1000);
        latestTimestampUsed = Math.max(latestTimestampUsed, currentTimestamp);
        if (dailyData.rates) {
          for (const [currencyCode, rate] of Object.entries(dailyData.rates)) {
            if (typeof rate !== 'number') continue;
            if (!historicalRates[currencyCode]) historicalRates[currencyCode] = [];
            historicalRates[currencyCode].push({ date: dateString, rate: rate });
          }
        }
      } catch (readError) {
        console.warn(
          ` -> Warn: Failed to read/parse ${fileInfo.filename}. Error: ${readError.message}`,
        );
      }
    }

    if (Object.keys(historicalRates).length === 0) {
      console.warn(` -> No valid rates extracted for ${period}. Skipping file generation.`);
      continue;
    }

    const outputObject = {
      // Renamed from outputJson to avoid confusion
      timestamp: latestTimestampUsed,
      base: baseCurrency || 'USD', // Default base if not found
      rates: historicalRates,
    };
    // IMPORTANT: Use consistent formatting for comparison to work.
    // Using 2-space indent for readability and better diffs.
    // If you prefer minified, ensure index.js also produces minified for its files.
    const outputString = JSON.stringify(outputObject, null, 0);
    const historyFilePath = path.join(HISTORY_DIR, `${period}.json`);

    writeDataIfChanged(historyFilePath, outputString, `[HISTORY/${period}] `);
  } // End period loop

  console.log('\nHistory generation finished.');
}

// --- Run ---
generateHistory();
