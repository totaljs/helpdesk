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
};

function json_cdl() {
	var self = this;
	var model = {};

	var sql = DB();

	sql.select('labels', 'cdl_label');
	sql.select('projects', 'cdl_project');
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