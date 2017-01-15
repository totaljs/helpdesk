const HelpDesk = global.HelpDesk = {};

/**
 * Signs filename
 * @param {Number} oid
 * @param {String} extension
 * @return {String}
 */
HelpDesk.filename = function(oid, extension) {

	var name = oid.toString();
	var count = 0;

	for (var i = 0, length = name.length; i < length; i++)
		count += name.charCodeAt(i);

	return name + 'x' + count + extension;
};

/**
 * Sends email (notification)
 * @param {Number} type Notification type.
 * @param {User} user User session.
 * @param {UID} idticket
 * @param {UID} idcomment Optional.
 * @return {HelpDesk}
 */
HelpDesk.notify = function(type, user, idticket, idcomment) {

	// 0 == create
	// 1 == close
	// 2 == reopen
	// 5 == assign
	// 9 == comment

	var sql = DB();

	sql.select('ticket', 'tbl_ticket').make(function(builder) {
		builder.fields('id', 'idsolver', 'iduser', 'name', 'project');
		builder.where('id', idticket);
		builder.first();
	});

	sql.validate('ticket', 'error-ticket-404');

	// Select all users according to comments
	type !== 5 && sql.query('users', 'SELECT a.iduser, b.email FROM tbl_ticket_comment a INNER JOIN tbl_user b ON b.id=a.iduser').make(function(builder) {
		builder.where('b.isnotification', true);
		builder.where('b.isremoved', false);
		builder.where('b.isactivated', true);
		builder.where('a.idticket', idticket);
		builder.group('iduser', 'email');
	});

	// Checks ticket solvers
	sql.prepare(function(error, response, resume) {

		if (type !== 5 && response.ticket.idsolver)
			return resume();

		sql.query('support', 'SELECT id as iduser, email, name FROM tbl_user').make(function(builder) {
			builder.where('iscustomer', false);
			builder.where('isnotification', true);
			builder.where('isremoved', false);
			builder.where('isactivated', true);
			builder.where('isconfirmed', true);
		});

		resume();
	});

	// Select owner
	sql.prepare(function(error, response, resume) {
		sql.select('owner', 'tbl_user').make(function(builder) {
			builder.fields('id as iduser', 'email', 'company', 'position');
			builder.where('id', response.ticket.iduser);
			builder.first();
		});
		resume();
	});


	sql.exec(function(err, response) {

		if (!response.users)
			response.users = [];

		response.user = user;

		var messages = [];
		var subject;
		var viewname;

		switch (type) {

			// create ticket
			case 0:
				subject = 'New ticket: {0}'.format(response.ticket.name.max(50));
				viewname = 'mails/notify-create';
				// Add owner
				response.owner && response.users.push(response.owner);
				break;

			// close ticket
			case 1:
				subject = 'Ticket has been closed: {0}'.format(response.ticket.name.max(50));
				viewname = 'mails/notify-close';
				// Add owner
				response.owner && response.users.push(response.owner);
				break;

			// re-open ticket
			case 2:
				subject = 'Ticket has been re-opened: {0}'.format(response.ticket.name.max(50));
				viewname = 'mails/notify-reopen';
				// Add owner
				response.owner && response.users.push(response.owner);
				break;

			// associate ticket
			case 5:
				subject = 'Ticket has been associated: {0}'.format(response.ticket.name.max(50));
				viewname = 'mails/notify-assign';
				break;

			// new comment
			case 9:
				response.idcomment = idcomment;
				subject = 'New comment: {0}'.format(response.ticket.name.max(50));
				viewname = 'mails/notify-comment';
				break;
		}

		response.users.forEach(function(item) {

			if (item.iduser === user.id)
				return;

			var message = Mail.create(subject, F.view(viewname, response));
			message.from(CONFIG('mail.address.from'));
			message.to(item.email);
			messages.push(message);
		});

		messages.length && Mail.send2(messages);
	});

	return HelpDesk;
};
