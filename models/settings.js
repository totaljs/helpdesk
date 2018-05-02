NEWSCHEMA('Settings').make(function (schema) {

    schema.define('type', 'String', true);
    schema.define('name', 'String', true);
    schema.define('value', 'String');

    schema.setValidate(function (name, value) {
        switch (name) {
            case 'type':
                return ['cdl_settings', 'cdl_label', 'cdl_project'].indexOf(value) !== -1;
            case 'name':
                return !value.match(/^.+_oauth2_callback$/);
        }
    });

    schema.setPrepare(function (name, value) {
        switch (name) {
            case 'type':
                switch (value) {
                    case 'global':
                        return 'cdl_settings';
                    case 'label':
                        return 'cdl_label';
                    case 'project':
                        return 'cdl_project';
                    default:
                        return '';
                }
        }
    });

    schema.setSave(function (error, model, controller, callback) {
        let sql = DB(error);

        let query;
        switch (model.type) {
            case 'cdl_settings':
                query = `INSERT INTO ${model.type} (name, value) \
                VALUES ({0}, {1}) \
                ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`.format(sql.escape(model.name), sql.escape(model.value));
                break;
            case 'cdl_label':
                query = `INSERT INTO ${model.type} (name) \
                VALUES ({0})`.format(sql.escape(model.name));
                break;
            case 'cdl_project':
                query = `INSERT INTO ${model.type} (name) \
                VALUES ({0}) \
                ON CONFLICT (name) DO NOTHING`.format(sql.escape(model.name));
                break;
        }

        sql.query('upsert', query);

        sql.exec(function (error) {
            if (error)
                return callback(error);

            callback(SUCCESS(true));
        })
    });

    schema.setRemove(function (error, controller, callback) {
        let sql = DB(error);

        sql.delete('rows', controller.type).make(function (builder) {
            builder.where('name', controller.name);
            builder.where('isconst', false);
        });

        sql.exec(function (error, response) {
            if (error)
                return callback(error);

            if (!response.rows)
                return controller.invalid().push('error-change-access');

            callback(SUCCESS(true));
        });
    });
});