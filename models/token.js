NEWSCHEMA('Token').make(function(schema) {

	schema.define('token', String, true);

	schema.addWorkflow('exec', function(error, model, controller, callback) {

		var sql = DB(error);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.fields('id', 'isactivated');
			builder.where('token', model.token);
			builder.first();
		});

		sql.validate('item', 'error-user-credentials');

		sql.update('tbl_user').make(function(builder) {
			builder.set('isconfirmed', true);
			builder.set('dateconfirmed', F.datetime);
			builder.where('id', sql.expected('item', 'id'));
			builder.where('isconfirmed', false);
		});

		sql.exec(function(err, response) {
			if (err)
				return callback();

			if (!response.isactivated)
				error.push('error-user-activated');

			response.isactivated && controller.cookie(CONFIG('auth.cookie'), F.encrypt({ id: response.id, date: F.datetime.getTime(), ip: controller.ip }, CONFIG('auth.secret')), '1 month');
			callback(SUCCESS(true));

		}, 'item');
	});
});