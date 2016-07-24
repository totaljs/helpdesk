NEWSCHEMA('Labels').make(function(schema) {

	schema.define('idticket', 'UID', true);
	schema.define('labels', '[String]');

	schema.setSave(function(error, model, controller, callback) {

		if (controller.user.iscustomer)
			return error.push('error-privileges') && callback();

		var sql = DB(error);

		sql.select('item', 'tbl_ticket').make(function(builder) {
			builder.fields('iduser', 'company');
			builder.where('id', model.idticket);
			builder.first();
		});

		sql.validate('item', 'error-ticket-404');

		sql.update('tbl_ticket').make(function(builder) {
			builder.set('labels', model.labels.join(','));
			builder.where('id', model.idticket);
		});

		sql.insert('tbl_ticket_comment').make(function(builder) {
			builder.set('id', UID());
			builder.set('iduser', controller.user.id);
			builder.set('idticket', model.idticket);
			builder.set('operation', 4);
			builder.set('body', model.labels.join(', '));
		});

		sql.exec(() => callback(SUCCESS(true)));
	});

});