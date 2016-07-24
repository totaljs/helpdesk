NEWSCHEMA('Minutes').make(function(schema) {

	schema.define('minutes', 'Number', true);
	schema.define('idticket', 'UID', true);

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

		sql.select('user', 'tbl_user').make(function(builder) {
			builder.fields('minutes');
			builder.where('id', sql.expected('item', 'iduser'));
			builder.first();
		});

		sql.insert('tbl_time').make(function(builder) {
			builder.set('id', UID());
			builder.set('idsolver', controller.user.id);
			builder.set('idticket', model.idticket);
			builder.set('iduser', sql.expected('item', 'iduser'));
			builder.set('company', sql.expected('item', 'company'));
			builder.set('minutes', model.minutes);
			builder.set('minutesuser', sql.expected('user', 'minutes'));
			builder.set('day', F.datetime.getDate());
			builder.set('month', F.datetime.getMonth() + 1);
			builder.set('year', F.datetime.getFullYear());
		});

		sql.push('UPDATE tbl_ticket SET minutes=(SELECT SUM(tbl_time.minutes) FROM tbl_time WHERE tbl_time.idticket=tbl_ticket.id)').where('id', model.idticket);

		sql.insert('tbl_ticket_comment').make(function(builder) {
			builder.set('id', UID());
			builder.set('iduser', controller.user.id);
			builder.set('idticket', model.idticket);
			builder.set('operation', 3);
			builder.set('body', model.minutes.toString());
		});

		sql.exec(() => callback(SUCCESS(true)));
	});
});