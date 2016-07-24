NEWSCHEMA('Account').make(function(schema) {

	schema.define('photo', 'String(30)');
	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('company', 'String(50)');
	schema.define('position', 'String(50)');
	schema.define('isnotification', Boolean);
	schema.define('password', 'String(30)');
	schema.define('ispassword', Boolean);

	schema.setGet(function(error, model, controller, callback) {

		var sql = DB(error);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.where('id', controller.user.id);
			builder.fields('photo', 'name', 'email', 'company', 'position', 'isnotification');
			builder.first();
		});

		sql.validate('item', 'error-user-404');
		sql.exec((err, response) => callback(response), 'item');
	});

	schema.setSave(function(error, model, controller, callback) {

		var sql = DB(error);

		sql.update('item', 'tbl_user').make(function(builder) {
			builder.set(model);
			builder.rem('password');
			builder.rem('ispassword');

			if (model.ispassword)
				builder.set('password', model.password.sha1());

			builder.set('dateupdated', F.datetime);
			builder.inc('countupdates');

			builder.where('id', controller.user.id);
		});

		sql.validate('item', 'error-user-404');
		sql.exec((err, response) => callback(SUCCESS(true)), 'user');
	});


	schema.addWorkflow('minutes', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.push('minutes', 'SELECT SUM(minutes) as minutesspent FROM tbl_time').make(function(builder) {
			builder.where('month', F.datetime.getMonth() + 1);
			builder.where('year', F.datetime.getFullYear());
			builder.where('iduser', controller.user.id);
			builder.first();
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();
			response.minutes.minutesspent = response.minutes.minutesspent || 0;
			response.minutes.minutesuser = controller.user.minutes;
			callback(response.minutes);
		});
	});

});