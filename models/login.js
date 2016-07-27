NEWSCHEMA('Login').make(function(schema) {

	schema.define('email', 'Email', true);
	schema.define('password', 'String(30)', true);

	schema.addWorkflow('exec', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.fields('id', 'isactivated', 'isconfirmed');
			builder.where('email', model.email);
			builder.where('password', model.password.sha1());
			builder.where('isremoved', false);
			builder.first();
		});

		sql.validate('item', 'error-user-credentials');

		sql.exec(function(err, response) {
			if (err)
				return callback();

			if (!response.isactivated)
				error.push('error-user-activated');
			if (!response.isconfirmed)
				error.push('error-user-confirmed');

			response.isconfirmed && response.isactivated && controller.cookie(CONFIG('auth.cookie'), F.encrypt({ id: response.id, date: F.datetime.getTime(), ip: controller.ip }, CONFIG('auth.secret')), '1 month');
			callback(SUCCESS(true));
		}, 'item');
	});

});