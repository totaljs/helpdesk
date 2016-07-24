NEWSCHEMA('Solution').make(function(schema) {

	schema.define('idticket', 'UID', true);
	schema.define('idcomment', 'UID');

	schema.setSave(function(error, model, controller, callback) {

		if (controller.user.iscustomer)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.update('tbl_ticket_comment').make(function(builder) {
			builder.set('issolution', false);
			builder.where('idticket', model.idticket);
			builder.where('issolution', true);
		});

		if (model.idcomment) {

			sql.update('tbl_ticket_comment').make(function(builder) {
				builder.set('issolution', true);
				builder.where('idticket', model.idticket);
				builder.where('id', model.idcomment);
				builder.where('isremoved', false);
			});

			sql.update('tbl_ticket').make(function(builder) {
				builder.set('idsolution', model.idcomment);
				builder.where('id', model.idticket);
				builder.where('isremoved', false);
			});

		} else {

			sql.update('tbl_ticket').make(function(builder) {
				builder.set('idsolution', null);
				builder.where('id', model.idticket);
				builder.where('isremoved', false);
			});

		}

		sql.exec(() => callback(SUCCESS(true)));
	});

});