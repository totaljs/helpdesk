[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png?v=1)](https://www.totaljs.com/support/) [![Donate](https://www.totaljs.com/img/button-donate.png)](https://www.totaljs.com/#make-a-donation)

# Installation

__License__: [MIT](license.txt). __HelpDesk__ needs latest Total.js from NPM `+v2.0.1`.

- `npm install`
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

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt
