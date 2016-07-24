exports.install = function() {
	// Tickets
	F.route('/api/tickets/',              json_query,            ['*Ticket']);
	F.route('/api/tickets/',              json_save,             ['*Ticket', 'post']);
	F.route('/api/tickets/{id}/',         json_read,             ['*Ticket']);
	F.route('/api/tickets/{id}/',         json_remove,           ['*Ticket', 'delete']);

	F.route('/api/tickets/{id}/close/',   json_tickets_close,    ['*Ticket']);
	F.route('/api/tickets/{id}/open/',    json_tickets_open,     ['*Ticket']);
	F.route('/api/tickets/{id}/assign/',  json_tickets_assign,   ['*Ticket']);
	F.route('/api/tickets/minutes/',      json_save,             ['*Minutes', 'post']);
	F.route('/api/tickets/labels/',       json_save,             ['*Labels', 'post']);

	// Comments
	F.route('/api/comments/',             json_save,             ['*Comment', 'post']);
	F.route('/api/comments/solution/',    json_save,             ['*Solution', 'post']);
	F.route('/api/comments/{id}/',        json_remove,           ['*Comment', 'delete']);

	// Account
	F.route('/api/account/',              json_read,             ['*Account']);
	F.route('/api/account/',              json_save,             ['*Account', 'post']);
	F.route('/api/account/minutes/',      json_account_time,     ['*Account']);

	// Users
	F.route('/api/users/',                json_query,            ['*User']);
	F.route('/api/users/',                json_users_save,       ['*User', 'post']);
	F.route('/api/users/{id}/',           json_read,             ['*User']);
	F.route('/api/users/{id}/',           json_remove,           ['*User', 'delete']);
	F.route('/api/users/{id}/stats/',     json_users_stats,      ['*User']);

	// Common
	F.route('/api/cdl/',                  json_cdl);
	F.route('/api/upload/',               json_upload,           ['upload'], 1024 * 2);
	F.route('/api/login/',                json_exec,             ['*Login', 'post']);
	F.route('/api/password/',             json_exec,             ['*Password', 'post']);
	F.route('/api/token/',                json_exec,             ['*Token', 'post']);
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