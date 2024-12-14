const currencies = {};

const initData = async () => {
  const currenciesResponse = await fetch('./currencies.json');
  const currenciesData = await currenciesResponse.json();

  const apiResponse = await fetch(
    'https://raw.githubusercontent.com/vemines/money-exchange/main/latest/data.json',
  );
  const latestData = await apiResponse.json();

  // Update currencies object with symbols and rates from latest.json
  Object.entries(latestData.rates).forEach((entry) => {
    const [code, rate] = entry;

    if (currenciesData[code]) {
      currencies[code] = {
        name: currenciesData[code],
        rate: rate,
      };
    } else {
      console.log('missing code country: ', code);
    }
  });
};

// Function to populate currency dropdowns
function currencyDropdowns() {
  setupSelect('from-currency');
  setupSelect('to-currency');
}

function setupSelect(selectId) {
  const selectElement = document.getElementById(selectId);
  const dropdownElement = selectElement.querySelector('.dropdown');
  const selectItems = selectElement.querySelector('.select-items');
  const searchInput = selectItems.querySelector('input');

  for (const code in currencies) {
    // Create option
    const option = document.createElement('div');
    option.textContent = ` ${code} (${currencies[code].name})`;
    option.setAttribute('data-value', code);
    selectItems.appendChild(option);

    // Add event onClick
    option.addEventListener('click', function () {
      dropdownElement.textContent = this.textContent;
      dropdownElement.setAttribute('data-value', this.getAttribute('data-value'));
      selectItems.classList.add('hide');
      dropdownElement.classList.remove('active');

      convertCurrency(); // Trigger conversion
    });
  }

  // Toggle dropdown visibility
  dropdownElement.addEventListener('click', function () {
    selectItems.classList.toggle('hide');
    this.classList.toggle('active');
  });

  // Search currency
  searchInput.addEventListener('input', () => {
    const searchTerm = normalizeText(searchInput.value);
    const options = selectItems.querySelectorAll('div');

    options.forEach((option) => {
      const optionText = normalizeText(option.textContent);
      if (optionText.includes(searchTerm)) {
        option.style.display = 'block';
      } else {
        option.style.display = 'none';
      }
    });
  });
}

// Currency conversion
function convertCurrency() {
  const amount = parseFloat(document.getElementById('amount').value);
  const fromCurrency = document
    .getElementById('from-currency')
    .querySelector('.dropdown')
    .getAttribute('data-value');
  const toCurrency = document
    .getElementById('to-currency')
    .querySelector('.dropdown')
    .getAttribute('data-value');

  // Validation
  if (isNaN(amount) || amount <= 0 || !fromCurrency || !toCurrency) {
    document.getElementById('conversion-result').textContent = '';
    return;
  }

  // Conversion logic
  const fromRate = currencies[fromCurrency].rate;
  const toRate = currencies[toCurrency].rate;
  const convertedAmount = (amount / fromRate) * toRate;

  // Display the result
  const resultElement = document.getElementById('conversion-result');
  resultElement.textContent = `${amount} ${fromCurrency} = ${convertedAmount.toFixed(
    2,
  )} ${toCurrency}`;
}

// Normalize text for searching
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Function to set default dropdown values
function setDefaultDropdownValues() {
  const defaultFromCurrency = 'USD';
  const defaultToCurrency = 'EUR';

  if (Object.keys(currencies).length === 0) return;

  const fromSelect = document.getElementById('from-currency').querySelector('.dropdown');
  const toSelect = document.getElementById('to-currency').querySelector('.dropdown');

  fromSelect.textContent = `${defaultFromCurrency} (${currencies[defaultFromCurrency].name})`;
  fromSelect.setAttribute('data-value', defaultFromCurrency);

  toSelect.textContent = `${defaultToCurrency} (${currencies[defaultToCurrency].name})`;
  toSelect.setAttribute('data-value', defaultToCurrency);

  convertCurrency(); // Trigger conversion with default values
}

// Event listeners
window.addEventListener('DOMContentLoaded', async () => {
  await initData();
  currencyDropdowns();
  setDefaultDropdownValues();

  // Convert on input change
  document.getElementById('amount').addEventListener('input', convertCurrency);
});
