NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('photo', 'String(30)');
	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('company', 'String(50)');
	schema.define('language', 'String(2)');
	schema.define('notes', 'String(200)');
	schema.define('minutes', Number);
	schema.define('position', 'String(50)');
	schema.define('projects', '[String(30)]');
	schema.define('iscustomer', Boolean);
	schema.define('ispriority', Boolean);
	schema.define('isactivated', Boolean);
	schema.define('isadmin', Boolean);
	schema.define('isnotification', Boolean);
	schema.define('iswelcome', Boolean);

	schema.setQuery(function(error, controller, callback) {

		if (!controller.user.isadmin)
			return error.push('error-privileges') && callback();

		var options = controller.query;

		options.page = U.parseInt(options.page) - 1;
		options.max = U.parseInt(options.max, 20);

		if (options.page < 0)
			options.page = 0;

		// Prepares searching
		if (options.search)
			options.search = options.search.keywords(true, true).join(' ');

		var take = U.parseInt(options.max);
		var skip = U.parseInt(options.page * options.max);

		var sql = DB(error);

		sql.listing('data', 'view_user').make(function(builder) {

			switch (options.type) {
				case '1':
					builder.where('iscustomer', true);
					break;
				case '2':
					builder.where('iscustomer', false);
					break;
				case '3':
					builder.where('isadmin', true);
					break;
			}

			options.search && builder.like('search', options.search, '*');
			options.project && builder.sql('EXISTS(SELECT tbl_user_project.name FROM tbl_user_project WHERE tbl_user_project.iduser=tbl_user.id AND tbl_user_project.name=? LIMIT 1)', [options.project]);
			builder.sort('datecreated', true);
			builder.skip(skip);
			builder.take(take);
		});

		sql.exec(function(err, response) {

			if (err)
				return callback();

			var data = response.data;
			data.limit = options.max;
			data.pages = Math.ceil(data.count / options.max);

			if (!data.pages)
				data.pages = 1;

			data.page = options.page + 1;
			callback(data);
		});

	});

	schema.setGet(function(error, model, controller, callback) {

		if (!controller.user.isadmin)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.where('id', controller.id);
			builder.where('isremoved', false);
			builder.first();
		});

		sql.select('projects', 'tbl_user_project').make(function(builder) {
			builder.where('iduser', controller.id);
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			response.item.projects = response.projects.map(n => n.name);
			callback(response.item);
		});
	});

	schema.setSave(function(error, model, controller, callback) {

		if (!controller.user.isadmin)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.save('item', 'tbl_user', !model.id, function(builder, create) {

			model.search = (model.name + ' ' + model.email + ' ' + model.company).keywords(true, true).join(' ').max(200);

			if (create) {
				model.id = UID();
				model.token = U.GUID(30);
				builder.set(model);
				builder.rem('projects');
				builder.rem('iswelcome');
				return;
			}

			builder.set(model);
			builder.set('dateupdated', F.datetime);
			builder.rem('id');
			builder.rem('projects');
			builder.rem('iswelcome');
			builder.where('id', model.id);
		});

		if (model.id)
			sql.remove('tbl_user_project').where('iduser', model.id);

		sql.prepare(function(error, response, resume) {
			for (var i = 0, length = model.projects.length; i < length; i++)
				model.projects[i] && sql.insert('tbl_user_project').primary('iduser').set('company', model.company).set('iduser', model.id).set('name', model.projects[i]);
			resume();
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();

			// Refresh user's session if exists
			var session = F.SESSION[model.id];
			if (session) {
				session.name = model.name;
				session.company = model.company;
				session.minutes = model.minutes;
				session.photo = model.photo;
				session.ispriority = model.ispriority;
				session.isadmin = model.isadmin;
				session.iscustomer = model.iscustomer;
				session.position = model.position;
			}

			callback(SUCCESS(true));
		});
	});

	schema.setRemove(function(error, controller, callback) {

		if (!controller.user.isadmin)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.update('tbl_user').make(function(builder) {
			builder.set('isremoved', true);
			builder.set('dateupdated', F.datetime);
			builder.where('id', controller.id);
		});

		sql.exec(() => callback(SUCCESS(true)));
	});

	schema.addWorkflow('stats', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.select('user', 'tbl_user').make(function(builder) {
			builder.fields('name', 'company', 'position', 'iscustomer', 'ispriority', 'minutes', 'photo');
			builder.where('id', controller.id);
			builder.first();
		});

		sql.validate('user', 'error-user-404');

		sql.prepare(function(error, response, resume) {

			sql.query('stats', 'SELECT COUNT(id) as count, SUM(minutes) as minutes, MAX(minutesuser) as minutesuser, month, year FROM tbl_time').make(function(builder) {

				if (response.user.iscustomer)
					builder.where('iduser', controller.id);
				else
					builder.where('idsolver', controller.id);

				builder.group('month', 'year');
				builder.sort('year', true);
				builder.sort('month', true);
			});

			resume();
		});

		sql.exec((err, response) => callback(response));
	});

	schema.addWorkflow('notify', function(error, model, controller, callback) {

		if (!model.iswelcome)
			return callback(SUCCESS(true));

		var sql = DB(error);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.fields('name', 'token', 'email', 'language');
			builder.where('id', model.id);
			builder.first();
		});

		sql.exec(function(err, response) {
			response && F.mail(response.email, '@(Welcome to HelpDesk)', '~mails/registration', response, response.language || 'default');
			callback(SUCCESS(true));
		}, 'item');
	});

});