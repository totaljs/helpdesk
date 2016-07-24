var common = {};

// Current page
common.page = '';

// Current form
common.form = '';

var renderer = new marked.Renderer();

renderer.heading = function(text, level) {
  return '<div class="h' + level + '">' + text + '</div>';
};

marked.setOptions({
	renderer: renderer,
	gfm: true,
	tables: true,
	breaks: true,
	pedantic: false,
	sanitize: true,
	smartLists: true,
	smartypants: false,
	header: false
});

AJAXCACHE('GET /api/cdl/', null, 'common.cdl', '5 minutes');

$(document).ready(function() {
	jR.clientside('.jrouting');
	FIND('loading', FN('() => this.hide(500)'));
});

function isError(arguments) {
	return false;
}

jR.route('/', function() {
	jR.redirect('/tickets/');
});

jR.route('/account/', function() {
	SET('common.page', 'account');
});

jR.route('/tickets/', function() {
	SET('common.page', 'tickets');
});

jR.route('/tickets/{id}/', function(id) {
	SETTER('loading', 'show');
	SET('common.page', 'tickets-detail');
});

jR.route('/users/', function() {
	if (!user.isadmin)
		return jR.redirect('/');
	SET('common.page', 'users');
});

jR.on('location', function(url) {
	var selected = url.split('/', 2).join('/');

	if (selected !== '/')
		selected += '/';

	var nav = $('header nav');
	nav.find('.selected').removeClass('selected');
	nav.find('a[href="' + selected + '"]').addClass('selected');
	$('header nav').removeClass('mainmenu-visible');
});

function success() {
	var el = $('#success');
	el.show();
	el.addClass('success-animation');
	setTimeout(function() {
		el.removeClass('success-animation');
		setTimeout(function() {
			el.hide();
		}, 1000);
	}, 1500);
	FIND('loading').hide(500);
}

Tangular.register('default', function(value, def) {
	if (value == null || value === '')
		return def;
	return value;
});

function getSelectionStartNode(context){
	if (!context.getSelection)
		return;
	var node = context.getSelection().anchorNode;
	var startNode = (node.nodeName == "#text" ? node.parentNode : node);
	return startNode;
}

function marked_video(selector) {
	selector.each(function() {
		var el = $(this);
		var html = el.html();
		if (html.indexOf('youtube') !== -1) {
			el.parent().replaceWith('<div class="video"><iframe src="https://www.youtube.com/embed/' + html.split('v=')[1] + '" frameborder="0" allowfullscreen></iframe></div>');
		} else if (html.indexOf('vimeo') !== -1) {
			el.parent().replaceWith('<div class="video"><iframe src="//player.vimeo.com/video/' + html.substring(html.lastIndexOf('/') + 1) + '" frameborder="0" allowfullscreen></iframe></div>');
		}
	});
}

function marked_iframe(selector) {
	selector.each(function() {
		var el = $(this);
		el.parent().replaceWith('<div class="iframe">' + el.html().replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>') + '</div>');
	});
}

function highlight(el) {
	$(el).find('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
}

function mainmenu() {
	$('header nav').toggleClass('mainmenu-visible');
}

Tangular.register('photo', function(value) {
	return value ? '/photos/{0}.jpg'.format(value) : '/img/face.jpg';
});

Tangular.register('markdown', function(value) {
	return marked(value).replace(/<img/g, '<img class="img-responsive img-rounded"');
});

Tangular.register('labels', function(value) {

	if (!value || !value.length)
		return '';

	var builder = [];
	value.split(',').trim().forEach(function(label) {
		var index = common.cdl.labels.indexOf(label);
		builder.push('<span class="label label-{1}">{0}</span>'.format(Tangular.helpers.encode(label), index === -1 || index > 8 ? 8 : index));
	});
	return builder.join('');
});

