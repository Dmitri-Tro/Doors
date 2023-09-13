var connect = require('connect');
var serveStatic = require('serve-static');
var rewriteModule = require('http-rewrite-middleware');
connect().use(rewriteModule.getMiddleware([
    // ... list of rules here
    {from: '^/index_production.html$', to: '/index.html'}
]))
    .use(serveStatic(__dirname))
    .listen(3000, function(){
        console.log('Server running on 3000...');
    });
