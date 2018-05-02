NEWSCHEMA('Oauth2').make(function (schema) {

    schema.define('name', 'String', true);
    schema.define('username', 'String', true);
    schema.define('photo', 'String');
    schema.define('email', 'Email', true);
    schema.define('isadmin', Boolean, true);
    schema.define('iscustomer', Boolean);

    schema.setValidate(function (name, value) {
        switch (name) {
            case 'email':
                return value.isEmail();
        }
    });

    schema.setPrepare(function (name, value) {
        switch (name) {
            case 'email':
                return value.toLowerCase();
        }
    });

    schema.setSave(function (error, model, controller, callback) {
        let sql = DB(error);
        let create = !model.id;

        sql.save('item', 'tbl_user', create, function (builder, create) {
            model.isadmin = false;

            if (create) {
                model.id = UID();
                model.isnotification = true;
                model.isconfirmed = true;
                model.isactivated = true;

                builder.set(model);
                builder.rem('photo');

                return;
            }

            builder.set('dateupdated', F.datetime);
            builder.set(model);
            builder.rem('photo');
            builder.rem('id');
            builder.where('id', model.id);
        });

        sql.exec(function (error) {
            if (error)
                return callback(error);

            callback(null, model.id);
        });
    });

    schema.addWorkflow('login', function (error, model, controller, callback) {
        let sql = DB(error);

        sql.query('item', `SELECT id, photo, isactivated FROM tbl_user WHERE NOT isremoved AND (email = {0} or username = {1})`
            .format(sql.escape(model.email), sql.escape(model.username))
        ).first();

        // sql.validate('item', n => n.length < 2, 'error-gitlab-oauth2');

        sql.exec(function (err, response) {
            if (err)
                return callback();

            if (response) {
                if (!response.isactivated) {
                    error.push('error-user-activated');
                    callback();

                    return;
                }

                model.id = response.id;
                model.photo = response.photo;
            }

            model.$save(function (err, user_id) {
                if (err)
                    return callback(err);

                controller.cookie(CONFIG('auth.cookie'), F.encrypt({
                        id: user_id,
                        date: F.datetime.getTime(),
                        ip: controller.ip
                    }, CONFIG('auth.secret')), '1 month');

                callback(null);
            });
        }, 'item');
    });

});