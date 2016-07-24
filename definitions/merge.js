// Merging static files
// Only CSS and JavaScript

// CSS
F.merge('/css/default.css', '/css/bootstrap.min.css', '/css/ui.css', '/css/default.css');
F.merge('/css/login.css', '/css/bootstrap.min.css', '/css/ui.css', '/css/login.css');

// JavaScript
// 'https://ajax.googleapis.com/ajax/libs/jquery/3.0.0/jquery.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/codemirror.min.js','https://cdnjs.cloudflare.com/ajax/libs/marked/0.3.5/marked.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/javascript/javascript.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/htmlmixed/htmlmixed.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/xml/xml.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/css/css.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/markdown/markdown.min.js','https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.13.2/mode/nginx/nginx.min.js',
F.merge('/js/default.js', '/js/jctajr.min.js', '/js/ui.js', '/js/default.js');
F.merge('/js/login.js', '/js/jctajr.min.js', '/js/ui.js');