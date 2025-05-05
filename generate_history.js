const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = './data';
const HISTORY_DIR = './history';

// Define periods: lookback days and sampling rules
const HISTORY_PERIODS = {
  week: { days: 7, sampleRule: { type: 'gap', value: 1 } }, // Every day file found
  month: { days: 31, sampleRule: { type: 'gap', value: 2 } }, // Every 2nd day file found
  '6month': { days: 183, sampleRule: { type: 'daysOfMonth', values: [1, 11, 21] } }, // Target days 1, 11, 21
  year: { days: 366, sampleRule: { type: 'daysOfMonth', values: [1, 15] } }, // Target days 1, 15
  '2year': { days: 731, sampleRule: { type: 'dayOfMonth', value: 1 } }, // Target day 1 of each month
  '5year': { days: 1826, sampleRule: { type: 'firstDayOfNthMonth', value: 3 } }, // Target 1st of every 3rd month (Jan, Apr, Jul, Oct)
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
  return date.toISOString().slice(0, 10); // YYYY-MM-DD format
}

function getUTCMonthString(date) {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`; // YYYY-MM format
}

// --- Main Logic ---

function generateHistory() {
  console.log('Starting history generation...');
  ensureDirectoryExists(HISTORY_DIR);

  // 1. Read and Sort Available Daily Files (Oldest First)
  let allDailyFiles = [];
  try {
    const filenames = fs.readdirSync(DATA_DIR);
    allDailyFiles = filenames
      .map((filename) => ({ filename, date: parseDateFromFilename(filename) }))
      .filter((f) => f.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort oldest first
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

  // 2. Process Each History Period
  for (const [period, config] of Object.entries(HISTORY_PERIODS)) {
    console.log(`\nProcessing period: ${period}`);

    // Calculate cutoff date
    const cutoffDate = new Date(now);
    cutoffDate.setUTCDate(now.getUTCDate() - config.days);
    const cutoffTimestamp = cutoffDate.getTime();

    // Filter files within the lookback period (still sorted oldest first)
    const relevantFiles = allDailyFiles.filter((f) => f.date.getTime() >= cutoffTimestamp);

    if (relevantFiles.length === 0) {
      console.log(` -> No data files found within the last ${config.days} days. Skipping.`);
      continue;
    }
    console.log(` -> Found ${relevantFiles.length} files within the lookback period.`);

    // --- Apply Sampling Logic ---
    let sampledFiles = [];
    const rule = config.sampleRule;

    if (rule.type === 'gap') {
      sampledFiles = relevantFiles.filter((_, index) => index % rule.value === 0);
      console.log(` -> Selected ${sampledFiles.length} files using gap ${rule.value}.`);
    } else if (rule.type === 'daysOfMonth') {
      const targetDays = new Set(rule.values);
      const includedDates = new Set(); // Track YYYY-MM-DD
      sampledFiles = relevantFiles.filter((file) => {
        const dayOfMonth = file.date.getUTCDate();
        const dateStr = getUTCDateString(file.date);
        if (targetDays.has(dayOfMonth) && !includedDates.has(dateStr)) {
          includedDates.add(dateStr);
          return true;
        }
        return false;
      });
      console.log(
        ` -> Selected ${sampledFiles.length} files targeting days ${rule.values.join(',')}.`,
      );
    } else if (rule.type === 'dayOfMonth') {
      // e.g., first available day on or after the 1st of each month
      const targetDay = rule.value;
      const includedMonths = new Set(); // Track YYYY-MM
      sampledFiles = relevantFiles.filter((file) => {
        const monthStr = getUTCMonthString(file.date);
        const dayOfMonth = file.date.getUTCDate();
        if (dayOfMonth >= targetDay && !includedMonths.has(monthStr)) {
          includedMonths.add(monthStr);
          return true; // Take the first file found in this month that meets the criteria
        }
        return false;
      });
      console.log(
        ` -> Selected ${sampledFiles.length} files targeting first available on/after day ${targetDay} of each month.`,
      );
    } else if (rule.type === 'firstDayOfNthMonth') {
      // e.g., first available day in Jan, Apr, Jul, Oct
      const monthGap = rule.value;
      const includedMonths = new Set(); // Track YYYY-MM
      sampledFiles = relevantFiles.filter((file) => {
        const monthIndex = file.date.getUTCMonth(); // 0-indexed (Jan=0)
        const monthStr = getUTCMonthString(file.date);
        // Check if the month is one of the target months (0 % 3 === 0, 3 % 3 === 0, etc.)
        if (monthIndex % monthGap === 0 && !includedMonths.has(monthStr)) {
          includedMonths.add(monthStr);
          return true; // Take the first file found in this target month
        }
        return false;
      });
      console.log(
        ` -> Selected ${sampledFiles.length} files targeting first available in every ${monthGap} months.`,
      );
    }

    if (sampledFiles.length === 0) {
      console.warn(` -> No files selected after sampling for period ${period}. Skipping.`);
      continue;
    }

    // 3. Aggregate Data from Sampled Files
    const historicalRates = {};
    let latestTimestampUsed = 0;
    let baseCurrency = null;

    for (const fileInfo of sampledFiles) {
      // Process in chronological order
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
        } else {
          console.warn(` -> 'rates' object missing in file: ${fileInfo.filename}`);
        }
      } catch (readError) {
        console.warn(
          ` -> Warning: Failed to read/parse ${fileInfo.filename}. Skipping. Error: ${readError.message}`,
        );
      }
    }

    if (Object.keys(historicalRates).length === 0) {
      console.warn(` -> No valid rates extracted for ${period}. Skipping file generation.`);
      continue;
    }

    // 4. Write Output File
    const outputJson = {
      timestamp: latestTimestampUsed,
      base: baseCurrency || 'USD',
      rates: historicalRates,
    };
    const historyFilePath = path.join(HISTORY_DIR, `${period}.json`);
    try {
      fs.writeFileSync(historyFilePath, JSON.stringify(outputJson)); // Minified
      console.log(
        ` -> Successfully generated minified history file: ${historyFilePath} (${sampledFiles.length} data points)`,
      );
    } catch (writeError) {
      console.error(` -> Error writing history file ${historyFilePath}:`, writeError);
    }
  } // End period loop

  console.log('\nHistory generation finished.');
}

// --- Run ---
generateHistory();
