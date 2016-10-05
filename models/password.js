NEWSCHEMA('Password').make(function(schema) {

	schema.define('email', 'Email', true);

	schema.addWorkflow('exec', function(error, model, controller, callback) {

		var sql = DB(error);
		var token = U.GUID(30);

		sql.select('item', 'tbl_user').make(function(builder) {
			builder.fields('id', 'isactivated', 'isconfirmed', 'language');
			builder.where('email', model.email);
			builder.where('isremoved', false);
			builder.first();
		});

		sql.validate('item', 'error-user-email');

		sql.update('tbl_user').make(function(builder) {
			builder.set('token', token);
			builder.where('id', sql.expected('item', 'id'));
		});

		sql.exec(function(err, response) {

			if (err)
				return callback();

			!response.isactivated error.push('error-user-activated');
			!response.isconfirmed error.push('error-user-confirmed');

			if (response.isconfirmed && response.isactivated) {
				response.token = token;
				F.mail(model.email, '@(Reset password)', '~mails/password', response, response.language || 'default');
			}

			callback(SUCCESS(true));

		}, 'item');
	});

});