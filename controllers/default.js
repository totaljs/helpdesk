/**
 * @property use
 * @property initialize
 * @property authenticate
 */
const Passport = require('passport');
const GitLabStrategy = require('passport-gitlab2').Strategy;
const Request = require('request');
const Lo = require('sqlagent/pg-lo');
const Async = require('async');

let gitlab_service;

exports.install = function () {
    F.route('/*', 'index', ['authorize']);
    F.route('/*', 'login', ['unauthorize']);
    F.route('/auth/gitlab', oauth2_gitlab);
    F.route('/auth/gitlab/callback', oauth2_gitlab_callback);
    F.route('/logoff', redirect_logoff, ['authorize']);

    F.route('/test', function () {
        var self = this;

        self.json({ok: self.req.isAuthenticated()});
    }, ['unauthorize']);

    // Files
    F.file('/download/*', file_download);
    F.file('/photos/*.jpg', file_photo);

    // Templates
    F.localize('/templates/*.html', ['compress']);
};

function oauth2_gitlab() {
    let self = this;
    let sql = DB();

    sql.query('gitlab', `select json_object_agg(name, value) as oauth2 from cdl_settings where name IN ('gitlab', 'gitlab_oauth2_application_id', 'gitlab_oauth2_secret', 'website_url')`)
        .make(function (builder) {
            builder.first();
        });

    sql.exec(function (err, response) {
        if (err)
            return console.log(err);

        // noinspection JSUnresolvedVariable
        gitlab_service = response.gitlab.oauth2.gitlab;

        // noinspection JSUnresolvedVariable
        Passport.use(new GitLabStrategy({
                clientID: response.gitlab.oauth2.gitlab_oauth2_application_id,
                clientSecret: response.gitlab.oauth2.gitlab_oauth2_secret,
                callbackURL: `${response.gitlab.oauth2.website_url.slice(-1) === '/' ? response.gitlab.oauth2.website_url.slice(0, -1) : response.gitlab.oauth2.website_url}/auth/gitlab/callback`,
                baseURL: response.gitlab.oauth2.gitlab
            },
            (accessToken, refreshToken, profile, callback) => callback(null, profile)
        ));

        self.custom();

        Passport.initialize();
        Passport.authenticate('gitlab')(self.req, self.res);
    });
}

function oauth2_gitlab_callback() {
    /**
     *
     * @property self.user._json.name
     * @property self.user._json.username
     * @property self.user._json.email
     * @property self.user._json.avatar_url
     * @property self.user._json.is_admin
     */
    let self = this;

    Passport.authenticate('gitlab', {session: false})(self.req, self.res, function (err) {
        if (err)
            return self.redirect('/login');

        if (gitlab_service) {
            /**
             * Convert hash url with real gitlab address (if use docker for run gitlab)
             */
            gitlab_service = gitlab_service.slice(-1) === '/' ? gitlab_service : `${gitlab_service}/`;
            self.user._json.avatar_url = self.user._json.avatar_url.replace(/^https?:\/\/[^./]+\//, gitlab_service);
        }

        let index = self.user._json.avatar_url.lastIndexOf('.');
        let extension = '.png';
        if (index !== -1)
            extension = self.user._json.avatar_url.substring(index).toLowerCase();

        GETSCHEMA('Oauth2').make({
            name: self.user._json.name,
            username: self.user._json.username,
            email: self.user._json.email,
            photo: '',
            isadmin: self.user._json.is_admin,
            iscustomer: !self.user._json.is_admin
        }, function (error, entity) {
            if (error)
                return self.json(error);

            entity.$workflow('login', self, function (error, result, user) {
                if (error)
                    return self.json(error);

                if (!gitlab_service)
                    return self.redirect('/');

                let sql = DB();
                if (user.photo) {
                    /**
                     * For connect to pool database
                     */
                    sql.query('select 1');
                    sql.exec(function (error) {
                        if (error)
                            return self.json(error);

                        Lo.create(sql.db).unlink(user.photo.split('x')[0], function () {
                            addImageToDatabase(sql, user.id)
                        });
                    });
                } else
                    addImageToDatabase(sql, user.id)
            });
        });

        function addImageToDatabase(sql, user_id) {
            sql.writeStream(Request(self.user._json.avatar_url), function (error, oid) {
                if (error)
                    return self.json(error);

                sql.query('updateUserPhoto', 'UPDATE tbl_user SET photo = {0} WHERE id = {1}'
                    .format(sql.escape(HelpDesk.filename(oid, extension).replace(extension, '')), sql.escape(user_id)));

                sql.exec(function (error) {
                    self.redirect('/');

                    if (error) {
                        console.log(error.items);
                        setTimeout(() => Lo.create(sql.db).unlink(oid, error => error && console.log(error)), 300);
                    }
                }, 'updateUserPhoto')
            });
        }
    });
}

// Signs out the user
function redirect_logoff() {
    var self = this;
    delete F.SESSION[self.user.id];
    self.cookie(CONFIG('auth.cookie'), '', '-1 day');
    self.redirect('/');
}

// Reads photo from DB
function file_photo(req, res) {
    var id = req.split[1].substring(0, req.split[1].length - 4).split('x').first();
    var token = HelpDesk.filename(id, '.jpg');

    if (token !== req.split[1]) {
        res.throw404();
        return;
    }

    F.exists(req, res, 10, function (next, filename) {
        DB().readStream(id, function (err, stream, size) {

            if (err || !size) {
                next();
                return res.throw404();
            }

            var writer = require('fs').createWriteStream(filename);

            CLEANUP(writer, function () {
                res.image(filename, function (image) {
                    image.output('jpg');
                    image.quality(90);
                    image.resize(100, 100);
                    image.minify();
                }, undefined, next);
            });

            stream.pipe(writer);
        });
    });
}

// Performs file download
function file_download(req, res) {
    var id = req.split[1].substring(0, req.split[1].length - 4).split('x').first();
    var token = HelpDesk.filename(id, '.' + req.extension);

    if (token !== req.split[1]) {
        res.throw404();
        return;
    }

    F.exists(req, res, 10, function (next, filename) {
        DB().readStream(id, function (err, stream, size) {

            if (err || !size) {
                next();
                return res.throw404();
            }

            var writer = require('fs').createWriteStream(filename);
            CLEANUP(writer, () => res.file(filename));
            stream.pipe(writer);
        });
    });
}