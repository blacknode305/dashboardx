# Участие в развитии DashboardX / Contributing

DashboardX is an **MIT-licensed open-source project**. Everyone may study, use,
fork, modify and distribute the source under the terms in [LICENSE](LICENSE).

## Как помочь / Ways to contribute

- ⭐ Поставьте [звёздочку](https://github.com/blacknode305/dashboardx), если вам понравился проект (совершенно добровольно).
- Сообщите об ошибке или предложите виджет через GitHub Issues.
- Предлагайте исправления через Pull Requests, предварительно проверьте существующие тесты.
- Расскажите, какие функции пригодились и чего не хватает.
- Предложения о сотрудничестве и работе можно отправить через [профиль автора](https://github.com/blacknode305).

## Safety

Never attach API keys, credentials, customer data, private contacts, or
production databases to Issues or Pull Requests. OpenAI API access is BYOK:
each developer or organization should run **their own secure gateway**.
See [ai-gateway/README.md](ai-gateway/README.md).

## Development

The basic frontend runs as static files. Open the project root using a local
HTTP server such as `python3 -m http.server 8000`. Run dependency-free
tests using `node --test tests/*.test.js` with Node.js 22+.

Commercial use is allowed by MIT, but you must retain the copyright and
license notice. A GitHub star, endorsement, attribution link or payment
beyond these license conditions is **not required**.
