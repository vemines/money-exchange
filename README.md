# Money Exchange

A simple web application for currency exchange that fetches exchange rates hourly and allows users to convert between different currencies with real-time data.

🌐 **Live Demo**: [money-exchange](https://me.vemines.cc)

## 📋 Quick Navigation

- [🚀 Public API Endpoints](#-public-api-endpoints)
- [✨ Features](#-features)
- [🛠️ Setup Instructions](#️-setup-instructions-for-create-your-own-api)
- [📁 Project Structure](#-project-structure)
- [🔗 Links](#-links)
- [📄 License](#-license)

## 🚀 Public API Endpoints

Our fast, cached API powered by Cloudflare Workers:

**Base URL**: `https://currencies.fvemines.workers.dev`

### Available Endpoints

| Endpoint                      | Description                        | Cache TTL     |
| ----------------------------- | ---------------------------------- | ------------- |
| `/latest/data.json`           | Latest exchange rates              | 1 hour        |
| `/currencies/currencies.json` | All supported currencies           | 1 year        |
| `/data/YYYY-MM-DD.json`       | Historical rates for specific date | 1 year\*      |
| `/history/week.json`          | Last 7 days rates                  | Daily refresh |
| `/history/month.json`         | Last 30 days rates                 | Daily refresh |
| `/history/6m.json`            | Last 6 months rates                | Daily refresh |
| `/history/year.json`          | Last 365 days rates                | Daily refresh |
| `/history/2y.json`            | Last 2 years rates                 | Daily refresh |
| `/history/5y.json`            | Last 5 years rates                 | Daily refresh |

\*Current day data cached for 1 hour

### Example Usage

```bash
# Get latest exchange rates
curl https://currencies.fvemines.workers.dev/latest/data.json

# Get supported currencies
curl https://currencies.fvemines.workers.dev/currencies/currencies.json

# Get rates for specific date
curl https://currencies.fvemines.workers.dev/data/2025-04-30.json

# Get weekly historical data
curl https://currencies.fvemines.workers.dev/history/week.json
```

### GitHub Raw Data

Alternative direct access to data files:

- [Latest Data](https://raw.githubusercontent.com/vemines/money-exchange/main/latest/data.json)
- [Currencies List](https://raw.githubusercontent.com/vemines/money-exchange/main/currencies/currencies.json)
- [Custom Day Example](https://raw.githubusercontent.com/vemines/money-exchange/main/data/2025-04-30.json)
- [Historical Data](https://raw.githubusercontent.com/vemines/money-exchange/main/history/week.json)

> ⚠️ **Note**: Some recently added currencies from [openexchangerates.org](https://openexchangerates.org) might not have complete historical data available. Please verify data completeness before production use.

## ✨ Features

- 🔄 **Real-time Data**: Fetches currency data hourly from [openexchangerates.org](https://openexchangerates.org)
- 🎨 **User-friendly Interface**: Clean, responsive design for easy currency conversion
- ⚡ **Fast API**: Cloudflare Workers with intelligent caching
- 🤖 **Automated Updates**: GitHub Actions CI/CD pipeline for data refresh
- 📊 **Historical Data**: Access to years of historical exchange rates
- 🌍 **CORS Enabled**: Ready for cross-origin requests

## 🛠️ Setup Instructions For Create Your Own API

### 1. Clone & Setup Repository

```bash
git clone https://github.com/vemines/money-exchange.git
cd money-exchange
```

### 2. GitHub Personal Access Token

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **"Generate new token"**
3. Configure:
   - **Token name**: `PAT`
   - **Expiration**: Never expire
   - **Repository access**: Only select repositories → Choose your repo
   - **Permissions**: Contents (read/write), Pull requests (read/write)
4. **Generate token** and copy it immediately

### 3. Configure Repository Secrets

Go to your repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Required Secrets:

- `PAT`: Your GitHub Personal Access Token
- `APPID`: Your App ID from [openexchangerates.org](https://openexchangerates.org/account/app-ids)

#### R2 Secrets (for Cloudflare storage):

- `R2_ACCESS_KEY_ID`: From Cloudflare R2 API Token page
- `R2_ACCOUNT_ID`: Your Cloudflare Account ID
- `R2_BUCKET_NAME`: Your R2 bucket name
- `R2_SECRET_ACCESS_KEY`: From R2 API Token (copy immediately!)

> If not using R2, remove the R2 upload steps from `.github/workflows/run.yml`

### 4. Setup Cloudflare Worker (for Cloudflare storage):

1. Create a Cloudflare Worker
2. Copy `cf_worker.js` to your worker
3. Replace `R2_BASE` with your R2 public URL:
   ```javascript
   const R2_BASE = 'https://pub-YOUR-R2-BUCKET-ID.r2.dev';
   ```
4. Deploy the worker

### 5. Deploy & Run

1. **Push to GitHub**: Your code will trigger the workflow
2. **Enable GitHub Pages**: Settings → Pages → Source: Deploy from branch → Branch: (branch_name) → Folder: `/docs`
3. **Run Workflow**: Go to Actions tab and manually trigger `run.yml`

## 📁 Project Structure

```
money-exchange/
├── .github/workflows/run.yml    # GitHub Actions workflow
├── cf_worker.js                 # Cloudflare Worker code
├── docs/                        # GitHub Pages site (diffence branch for avoid rebuild when currencies updated)
├── latest/                      # Latest exchange rates
├── data/                        # Historical daily rates
├── history/                     # Aggregated historical data
├── currencies/                  # Currency metadata
└── README.md                    # This file
```

## 🔗 Links

- 🌐 [Live Demo](https://vemines.github.io/money-exchange)
- 📡 [Public API](https://currencies.fvemines.workers.dev/latest/data.json)
- 📊 [Data Source](https://openexchangerates.org)

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

💝 **Created by VeMines with love**. If you find this project useful, please give it a ⭐!
