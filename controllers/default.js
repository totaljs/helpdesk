exports.install = function() {
	F.route('/*', 'index', ['authorize']);
	F.route('/', 'login', ['unauthorize']);
	F.route('/logoff', redirect_logoff, ['authorize']);

	F.file('/photos/*.jpg', file_photo);
	F.file('/download/*', file_download);

	F.localize('/templates/*.html', ['compress']);
};

function file_photo(req, res) {
	var id = req.split[1].substring(0, req.split[1].length - 4).split('x').first();
	var token = HelpDesk.filename(id, '.jpg');

	if (token !== req.split[1]) {
		res.throw404();
		return;
	}

	F.exists(req, res, 10, function(next, filename) {
		DB().readStream(id, function(err, stream, size) {

			if (err || !size) {
				next();
				return res.throw404();
			}

			var writer = require('fs').createWriteStream(filename);

			CLEANUP(writer, function() {
				res.image(filename, function(image) {
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

function file_download(req, res) {
	var id = req.split[1].substring(0, req.split[1].length - 4).split('x').first();
	var token = HelpDesk.filename(id, '.' + req.extension);

	if (token !== req.split[1]) {
		res.throw404();
		return;
	}

	F.exists(req, res, 10, function(next, filename) {
		DB().readStream(id, function(err, stream, size) {

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

function redirect_logoff() {
	var self = this;
	self.user.logoff(self);
	self.redirect('/');
}