# Money Exchange

A simple web application for currency exchange that fetches exchange rates per hours and allows users to convert between different currencies.

You can view a live demo of the project at: [Live demo](https://vemines.github.io/money-exchange)

[Latest Data](https://raw.githubusercontent.com/vemines/money-exchange/main/latest/data.json) <br>
[Currencies List](https://raw.githubusercontent.com/vemines/money-exchange/main/currencies/currencies.json) <br> <br>
[Custom Day 2025-04-30](https://raw.githubusercontent.com/vemines/money-exchange/main/data/2025-04-30.json)<br>
[Week History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/week.json)<br>
[Month History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/month.json)<br>
[6 Months History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/6m.json)<br>
[Year History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/year.json)<br>
[2 Years History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/2y.json)<br>
[5 Years History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/5y.json)<br>

_Note: Be aware that some recently added currencies from openexchangerates.org might not have complete historical data available. Please verify carefully before use._

## Features

- Fetches currency data from an external from [openexchangerates.org](openexchangerates.org)
- Displays a user-friendly interface for currency conversion.
- Automatically saves latest data with GitHub Actions for CI/CD.

## Installation Github Action

1. Clone the repository:

   ```bash
   git clone https://github.com/vemines/money-exchange.git
   cd money-exchange
   ```

2. Create github repository

3. Click your logo -> "Your Organizations" -> "Developer Settings" -> "Personal access tokens" -> "Fine-grained-tokens" -> Click "Generate new token"

4. Create personal access token (PAT). Token name "PAT", never expire -> "Only select repositories" -> Choose your repository, Add permission access "read and write" for "Contents" and "Pull requests". Generate token (remember copy it)

5. Go to Settings tab of your project, click on "Secrets and variables" -> "Actions" -> "New repository secret". Name is "PAT". Add more "APPID" with app_id get from https://openexchangerates.org/account/app-ids

6. Create Cloudflare bucket R2. Add following repository secret (Optional, if not use should remove in .github/workflows/run.yml)

- `R2_ACCESS_KEY_ID`: (Found on the R2 API Token creation page in Cloudflare)
- `R2_ACCOUNT_ID`: (Your Cloudflare Account ID, often visible in the Cloudflare dashboard URL or your account overview page)
- `R2_BUCKET_NAME`: (The name you gave your R2 bucket)
- `R2_SECRET_ACCESS_KEY`: (Found on the R2 API Token creation page in Cloudflare – **copy this immediately as it's shown only once**)

7. Push code to your repository

8. Setup Github Pages to docs folder

9. Run your workflow https://github.com/username/repo-name/actions/workflows/run.yml

## License

This project is open-source and available under the [MIT License](LICENSE).

- Created by VeMines with love ❤️. If you like this project please star ⭐ it
