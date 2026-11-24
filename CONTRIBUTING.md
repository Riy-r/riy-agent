# Contributing

Thanks for your interest in improving this project.

## Getting started

1. Install Node.js 20+.
2. Clone the repository and run `npm install`.
3. Copy `.env.example` to `.env` and add your OpenAI API key.
4. Run `npm start` and open the app with Expo Go.

## Before opening a pull request

- Run `npm run typecheck` and make sure it passes.
- Keep changes focused: one fix or feature per pull request.
- Never commit `.env` or any API key. If a key is committed by mistake, revoke it immediately at https://platform.openai.com/api-keys.
- For UI text, add both English and Arabic strings in `src/i18n/translations.ts`.

## Reporting issues

Open a GitHub issue and include:

- What you expected to happen and what happened instead.
- Your device model and Android version.
- Steps to reproduce the problem.
- Any error message shown in the app or the terminal.

## Security

Do not report security vulnerabilities in a public issue. Contact the maintainer directly.
