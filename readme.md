[![MIT License][license-image]][license-url]

- __License__: [MIT](license.txt)

# Installation

- install [Node.js platfrom](https://nodejs.org/) v4+
- install [GraphicsMagick](http://www.graphicsmagick.org/) due to pictures
- `$ cd helpdesk` and `$ npm install`
- change database connection string in `config`
- run script `postgresql.sql` in your database
- run `node debug.js`

__Login__:
- user: `root@partdp.com`
- password: `123456`

#Gitlab oauth

If you wanna use gitlab oauth login see below article

[Gitlab docs](https://docs.gitlab.com/ce/integration/oauth_provider.html)

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
