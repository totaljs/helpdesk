const SESSION = {};

F.onAuthorize = function(req, res, flags, callback) {

	var cookie = req.cookie(CONFIG('auth.cookie'));
	var obj = F.decrypt(cookie, CONFIG('auth.secret'));
	if (!obj)
		return callback(false);

	var session = SESSION[obj.id];
	if (session) {
		session.date = F.datetime.getTime();
		return callback(true, session);
	}

	var sql = DB();

	sql.select('item', 'tbl_user').make(function(builder) {
		builder.fields('id', 'name', 'iscustomer', 'company', 'photo', 'ispriority', 'isadmin', 'position', 'minutes');
		builder.where('id', obj.id);
		builder.where('isremoved', false);
		builder.where('isconfirmed', true);
		builder.where('isactivated', true);
		builder.first();
	});

	sql.validate('item', 'error-user-404');

	sql.update('tbl_user').make(function(builder) {
		builder.inc('countlogins');
		builder.set('datelogged', F.datetime);
		builder.where('id', obj.id);
	});

	sql.exec(function(err, response) {
		if (err || !response)
			return callback(false);

		session = SESSION[obj.id] = response;
		session.date = F.datetime.getTime();
		session.logoff = function(controller) {
			delete SESSION[obj.id];
			controller && controller.cookie(CONFIG('auth.cookie'), '', '-1 day');
		};

		callback(true, session);
	}, 'item');
};

F.on('service', function(interval) {

	if (interval % 10 !== 0)
		return;

	var now = Date.now() - 600000;

	Object.keys(SESSION).forEach(function(key) {
		if (SESSION[key].date < now)
			delete SESSION[key];
	});

});