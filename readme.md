# Installation

__HelpDesk__ needs latest Total.js from NPM `+v2.0.1`.

- `npm install total.js`
- `npm install pg`
- `npm install sqlagent`
- change database connection string in `config`
- run script `postgresql.sql` in your database
- run `node debug.js`

__Login__:
- user: `support@totaljs.com`
- password: `123456`

---

## How do I to translate HelpDesk?

- install Total.js as global module `npm install -g total.js`
- then open HelpDesk directory `cd helpdesk`
- then perform this command `totaljs --translate`
- translate translated file `translate.resource`
- and copy the content to `/resources/default.resource`
- run app