const Async = require('async');
const Request = require('request');

exports.install = function() {
	// Tickets
	F.route('/api/tickets/',              json_query,            ['authorize', '*Ticket']);
	F.route('/api/tickets/',              json_save,             ['authorize', '*Ticket', 'post']);
	F.route('/api/tickets/{id}/',         json_read,             ['authorize', '*Ticket']);
	F.route('/api/tickets/{id}/',         json_remove,           ['authorize', '*Ticket', 'delete']);

	F.route('/api/tickets/{id}/close/',   json_tickets_close,    ['authorize', '*Ticket']);
	F.route('/api/tickets/{id}/open/',    json_tickets_open,     ['authorize', '*Ticket']);
	F.route('/api/tickets/{id}/assign/',  json_tickets_assign,   ['authorize', '*Ticket']);
	F.route('/api/tickets/minutes/',      json_save,             ['authorize', '*Minutes', 'post']);
	F.route('/api/tickets/labels/',       json_save,             ['authorize', '*Labels', 'post']);

	// Comments
	F.route('/api/comments/',             json_save,             ['authorize', '*Comment', 'post']);
	F.route('/api/comments/solution/',    json_save,             ['authorize', '*Solution', 'post']);
	F.route('/api/comments/{id}/',        json_remove,           ['authorize', '*Comment', 'delete']);

	// Account
	F.route('/api/account/',              json_read,             ['authorize', '*Account']);
	F.route('/api/account/',              json_save,             ['authorize', '*Account', 'post']);
	F.route('/api/account/minutes/',      json_account_time,     ['authorize', '*Account']);

	// Users
	F.route('/api/users/',                json_query,            ['authorize', '*User']);
	F.route('/api/users/',                json_users_save,       ['authorize', '*User', 'post']);
	F.route('/api/users/{id}/',           json_read,             ['authorize', '*User']);
	F.route('/api/users/{id}/',           json_remove,           ['authorize', '*User', 'delete']);
	F.route('/api/users/{id}/stats/',     json_users_stats,      ['authorize', '*User']);

	// Common
	F.route('/api/cdl/',                  json_cdl,              ['authorize']);
	F.route('/api/upload/',               json_upload,           ['authorize', 'upload'], 1024 * 2);
	F.route('/api/login/',                json_exec,             ['unauthorize', '*Login', 'post']);
	F.route('/api/password/',             json_exec,             ['unauthorize', '*Password', 'post']);
	F.route('/api/token/',                json_exec,             ['unauthorize', '*Token', 'post']);

    // Settings
    F.route('/api/settings/',              json_settings,        ['authorize', '*Labels']);
    F.route('/api/settings/', 			   json_save_settings,   ['authorize', '*Settings', 'post']);
    F.route('/api/settings/{type}/{name}/',json_remove_settings, ['authorize', '*Settings', 'delete']);
    F.route('/api/project/external/', 	   json_external_project,['authorize', 'json', 'post']);
};

function json_cdl() {
	var self = this;
	var model = {};

	var sql = DB();

	sql.select('labels', 'cdl_label');

	if (self.user.isadmin)
		sql.select('projects', 'cdl_project');
	else
		sql.select('projects', 'tbl_user_project').where('iduser', self.user.id);

	sql.select('languages', 'cdl_language');

	sql.exec(function(err, response) {

		if (err)
			return self.invalid().push(err);

		response.labels = response.labels.map(n => n.name);
		response.projects = response.projects.map(n => n.name);
		response.languages = response.languages.map(n => n.name);
		self.json(response);
	});
}

function json_settings() {
    let self = this;

    if (!self.user.isadmin)
        return self.invalid().push('error-privileges');

    let sql = DB();

    sql.select('labels', 'cdl_label');
    sql.select('projects', 'cdl_project');
    sql.select('settings', 'cdl_settings');

    sql.exec(function(err, response) {
        if (err)
            return self.invalid().push(err);

        let callback_url = '';
        for (let i = 0; i < response.settings.length; i++) {
            if (response.settings[i].name === 'website_url') {
                callback_url = `${response.settings[i].value}/auth/gitlab/callback`;
                break;
            }
        }

        response.settings = response.settings.concat({
            name: 'gitlab_oauth2_callback',
            value: callback_url,
            isconst: true
        }).sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );

        self.json({
			label: {
                count: response.labels.length,
                items: response.labels
            },
            project: {
                count: response.projects.length,
                items: response.projects
			},
			global: {
                count: response.settings.length,
                items: response.settings
            }
		});
    });
}

function json_save_settings() {
    let self = this;

    if (!self.user.isadmin)
        return self.invalid().push('error-privileges');

    self.$save(self, self.callback());
}

function json_remove_settings(type, name) {
    let self = this;

    if (!self.user.isadmin)
        return self.invalid().push('error-privileges');

    switch (type) {
        case 'global':
            self.type = 'cdl_settings';
            break;
        case 'label':
            self.type = 'cdl_label';
            break;
        case 'project':
            self.type = 'cdl_project';
            break;
        default:
            return self.invalid().push('error-settings-404');
    }

    self.name = name;
    self.$remove(self, self.callback());
}

function json_external_project() {
	let self = this;

    if (!self.user.isadmin)
        return self.invalid().push('error-privileges');

	if (!(self.body.hasOwnProperty('source') && self.body.hasOwnProperty('token') && self.body.source.match(/^[a-z]{2,20}/)))
        return self.invalid().push('error-privileges');

	let page = self.body.hasOwnProperty('page') && self.body.page.toString().match(/^[0-9]/) ? self.body.page : 1;

    let sql = DB();

    sql.select('project', 'cdl_settings').make(function (builder) {
    	builder.field('value');
		builder.where('name', self.body.source);
		builder.first();
    });

    Async.waterfall([
        (callback) => sql.exec((error, response) => callback(error, response)),
        (data, callback) => Request({
            method: 'get',
            url: `${data.project.value.slice(-1) === '/' ? data.project.value.slice(0, -1) : data.project.value}/api/v4/projects?simple=true&page=${page}&per_page=10`,
            headers: {
                'private-token': self.body.token
            },
            json: true
        }, (error, response, body) => {
            if (error)
                return callback(error);

            if (response.statusCode !== 200)
                return callback(body);

            callback(null, {
            	total: response.headers['x-total'],
				pages: response.headers['x-total-pages'],
				limit: response.headers['x-per-page'],
            	body: body
            });
        })
    ], function (error, response) {
        if (error)
            return self.invalid().push(error);

        let projects = [];
        for (let i = 0; i < response.body.length; i++) {
            // noinspection JSUnresolvedVariable
            projects.push({
				name: response.body[i].path_with_namespace,
				source: self.body.source
            });
        }

        self.json({
			count: response.body.length,
			items: projects,
			pages: response.pages,
			page: page,
			limit: response.limit,
			total: response.total
        });
    });
}

function json_query() {
	var self = this;
	self.$query(self, self.callback());
}

function json_read(id) {
	var self = this;
	self.id = id;
	self.$read(self, self.callback());
}

function json_save() {
	var self = this;
	self.$save(self, self.callback());
}

function json_remove(id) {
	var self = this;
	self.id = id;
	self.$remove(self, self.callback());
}

function json_tickets_close(id) {
	var self = this;
	self.id = id;
	self.$workflow('close', self, self.callback());
}

function json_tickets_open(id) {
	var self = this;
	self.id = id;
	self.$workflow('open', self, self.callback());
}

function json_users_save() {
	var self = this;
	self.$async(self.callback(), 0).$save(self).$workflow('notify', self);
}

function json_users_stats(id) {
	var self = this;
	self.id = id;
	self.$workflow('stats', self, self.callback());
}

function json_tickets_assign(id) {
	var self = this;
	self.id = id;
	self.$workflow('assign', self, self.callback());
}

function json_account_time() {
	var self = this;
	self.$workflow('minutes', self, self.callback());
}

function json_exec() {
	var self = this;
	self.$workflow('exec', self, self.callback());
}

function json_upload() {

	var self = this;
	var sql = DB();
	var id = [];

	self.files.wait(function(file, next) {

		var index = file.filename.lastIndexOf('.');

		if (index === -1)
			file.extension = '.dat';
		else
			file.extension = file.filename.substring(index).toLowerCase();

		sql.writeStream(file.stream(), function(err, oid) {
			if (err)
				return next();
			id.push(HelpDesk.filename(oid, file.extension));
			setTimeout(next, 100);
		});

	}, () => self.json(id));
}