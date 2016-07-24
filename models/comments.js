NEWSCHEMA('Comment').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('idticket', 'UID', true);
	schema.define('idparent', 'UID');
	schema.define('body', String, true);

	schema.setSave(function(error, model, controller, callback) {

		var sql = DB(error);

		if (model.id && controller.user.iscustomer) {
			sql.select('comment', 'tbl_ticket_comment').make(function(builder) {
				builder.fields('iduser');
				builder.where('id', model.id);
				builder.first();
			});

			sql.validate(function(error, response, resume) {
				if (response.comment.iduser !== controller.user.id)
					error.push('error-privileges');
				resume();
			});
		}

		sql.save('item', 'tbl_ticket_comment', !model.id, function(builder, create) {

			builder.set('search', model.body.keywords(true, true).join(' ').max(300));

			if (create) {
				model.id = UID();
				builder.set(model);
				builder.set('ip', controller.ip);
				builder.set('iduser', controller.user.id);
				return;
			}

			builder.set('body', model.body);
			builder.set('dateupdated', F.datetime);
			builder.inc('countupdates');
			builder.where('idticket', model.idticket);
			builder.where('id', model.id);
		});

		sql.query('UPDATE tbl_ticket SET iduserlast={0}, countcomments=(SELECT COUNT(id) FROM tbl_ticket_comment WHERE tbl_ticket_comment.idticket=tbl_ticket.id AND tbl_ticket_comment.isremoved=false AND tbl_ticket_comment.operation=0)'.format(sql.escape(controller.user.id))).where('id', model.idticket);

		sql.exec(function(err, response) {
			if (err)
				return callback();
			HelpDesk.notify(9, controller.user, model.idticket, model.id);
			callback(SUCCESS(true));
		});
	});

	schema.setRemove(function(error, controller, callback) {

		var sql = DB(error);

		sql.select('comment', 'tbl_ticket_comment').make(function(builder) {
			builder.fields('idticket', 'iduser');
			builder.where('id', controller.id);
			builder.first();
		});

		sql.validate('comment', 'error-comment-404');

		if (controller.user.iscustomer) {
			sql.validate(function(error, response, resume) {
				if (response.comment.iduser !== controller.user.id)
					error.push('error-privileges');
				resume();
			});
		}

		sql.update('tbl_ticket_comment').make(function(builder) {
			builder.set('isremoved', true);
			builder.set('dateupdated', F.datetime);
			builder.where('id', controller.id);
		});

		sql.query('UPDATE tbl_ticket SET countcomments=(SELECT COUNT(id) FROM tbl_ticket_comment WHERE tbl_ticket_comment.idticket=tbl_ticket.id AND tbl_ticket_comment.isremoved=false AND tbl_ticket_comment.operation=0)').where('id', sql.expected('comment', 'idticket'));
		sql.exec(() => callback(SUCCESS(true)));
	});

	schema.addWorkflow('notify', function(error, model, controller, callback) {

	});

});