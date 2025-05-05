# Money Exchange

A simple web application for currency exchange that fetches exchange rates per hours and allows users to convert between different currencies.

You can view a live demo of the project at: [Live demo](https://vemines.github.io/money-exchange)

[Latest Data](https://raw.githubusercontent.com/vemines/money-exchange/main/latest/data.json)
[Custom Day (5 years from now)](https://raw.githubusercontent.com/vemines/money-exchange/main/data/2025-04-30.json)
[Week History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/week.json)
[Month History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/month.json)
[6 Months History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/6m.json)
[Year History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/year.json)
[2 Years History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/2y.json)
[5 Years History](https://raw.githubusercontent.com/vemines/money-exchange/main/history/5y.json)

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

5. Go to Settings tab of your project, click on "Secrets and variables" -> "Actions" -> "New repository secret". Name is "PAT" then parse PAT from step 4 (customize in run.yml line 37). Add more "APIURL" with https://openexchangerates.org/api/latest.json?app_id=YOUR_APP_ID.

6. Push code to your repository

7. Setup Github Pages to docs folder

8. Run your workflow https://github.com/username/repo-name/actions/workflows/run.yml

## License

This project is open-source and available under the [MIT License](LICENSE).

- Created by VeMines with love ❤️. If you like this project please star ⭐ it
