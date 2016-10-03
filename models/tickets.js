NEWSCHEMA('Ticket').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('project', 'String(50)', true);
	schema.define('name', 'String(80)', true);
	schema.define('ispriority', Boolean);

	schema.setQuery(function(error, controller, callback) {

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

		sql.listing('data', 'view_ticket').make(function(builder) {

			options.search && builder.like('search', options.search, '*');
			options.project && builder.where('project', options.project);
			options.language && builder.where('language', options.language);

			if (options.labels instanceof Array) {
				builder.scope(function() {
					options.labels.forEach((label) => builder.like('labels', label, '*').or());
				});
			} else if (options.labels)
				builder.like('labels', options.labels, '*');

			controller.user.iscustomer && builder.where('iduser', controller.user.id);

			switch (options.state) {
				case '0':
					builder.where('issolved', false);
					builder.sort('ispriority', true);
					break;
				case '1':
					builder.where('issolved', true);
					break;
			}

			builder.fields('id', 'iduser', 'iduserlast', 'name', 'photo', 'user', 'email', 'company', 'project', 'issolved', 'ispriority', 'datecreated', 'dateupdated', 'labels', 'countcomments', 'minutes', 'idsolver');
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

		var sql = DB(error);

		sql.select('detail', 'view_ticket').make(function(builder) {
			builder.fields('id', 'iduser', 'idsolver', 'iduserlast', 'name', 'user', 'company', 'photo', 'labels', 'issolved', 'datecreated', 'minutes', 'minutesuser', 'position', 'ispriority');
			builder.where('id', controller.id);
			builder.first();
		});

		sql.validate('detail', 'error-ticket-404');

		sql.push('minutesspent', 'SELECT SUM(minutes) as minutes FROM tbl_time').make(function(builder) {
			builder.where('month', F.datetime.getMonth() + 1);
			builder.where('year', F.datetime.getFullYear());
			builder.where('iduser', sql.expected('detail', 'iduser'));
			builder.first();
		});

		sql.select('comments', 'view_ticket_comment').make(function(builder) {
			builder.where('idticket', controller.id);
			builder.sort('datecreated');
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			response.detail.minutesspent = response.minutesspent.minutes || 0;
			delete response.minutesspent;
			callback(response);
		});
	});

	schema.setSave(function(error, model, controller, callback) {

		if (model.ispriority && !controller.user.ispriority)
			return error.push('error-ticket-priority') && callback();

		var sql = DB(error);
		var create = !model.id;

		sql.save('item', 'tbl_ticket', create, function(builder, create) {

			model.search = model.name.keywords(true, true).join(' ').max(80);

			if (create) {
				model.id = UID();
				builder.set(model);
				builder.set('ip', controller.ip);
				builder.set('iduser', controller.user.id);
				builder.set('company', controller.user.company);
				return;
			}

			builder.set(model);
			builder.set('dateupdated', F.datetime);
			builder.rem('id');
			builder.where('id', model.id);
			controller.user.iscustomer && builder.where('iduser', controller.user.id);
		});

		sql.exec(function(err, response) {
			create && HelpDesk.notify(0, controller.user, model.id);
			callback(SUCCESS(true, model.id));
		});
	});

	schema.setRemove(function(error, controller, callback) {

		var sql = DB(error);

		sql.update('tbl_ticket').make(function(builder) {
			builder.set('isremoved', true);
			builder.set('dateupdated', F.datetime);
			builder.where('id', controller.id);
			controller.user.iscustomer && builder.where('iduser', controller.user.id);
		});

		sql.exec(() => callback(SUCCESS(true)));
	});

	schema.addWorkflow('close', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.update('item', 'tbl_ticket').make(function(builder) {
			builder.set('issolved', true);
			builder.set('datesolved', F.datetime);
			builder.where('id', controller.id);
			controller.user.iscustomer && builder.where('iduser', controller.user.id);
		});

		sql.validate('item', 'error-ticket-404');

		sql.insert('tbl_ticket_comment').make(function(builder) {
			builder.set('id', UID());
			builder.set('iduser', controller.user.id);
			builder.set('idticket', controller.id);
			builder.set('operation', 1);
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			HelpDesk.notify(1, controller.user, controller.id);
			callback(SUCCESS(true));
		});
	});

	schema.addWorkflow('open', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.update('item', 'tbl_ticket').make(function(builder) {
			builder.set('issolved', false);
			builder.where('id', controller.id);
			controller.user.iscustomer && builder.where('iduser', controller.user.id);
		});

		sql.validate('item', 'error-ticket-404');

		sql.insert('tbl_ticket_comment').make(function(builder) {
			builder.set('id', UID());
			builder.set('iduser', controller.user.id);
			builder.set('idticket', controller.id);
			builder.set('operation', 2);
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			HelpDesk.notify(2, controller.user, controller.id);
			callback(SUCCESS(true));
		});
	});

	schema.addWorkflow('assign', function(error, model, controller, callback) {

		if (controller.user.iscustomer)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.update('item', 'tbl_ticket').make(function(builder) {
			builder.set('idsolver', controller.user.id);
			builder.where('id', controller.id);
			builder.where('isremoved', false);
		});

		sql.validate('item', 'error-ticket-404');

		sql.insert('tbl_ticket_comment').make(function(builder) {
			builder.set('id', UID());
			builder.set('iduser', controller.user.id);
			builder.set('idticket', controller.id);
			builder.set('operation', 5);
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			HelpDesk.notify(5, controller.user, controller.id);
			callback(SUCCESS(true));
		});
	});

});