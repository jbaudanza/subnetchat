const express = require('express');
const app = app = express();

app.use(express.static('public'));

const browserifyOptions = {
  transform: [['babelify', {presets: ["react", 'es2015']}]]
};

const browserify = require('browserify-middleware');
app.get('/chat.js', browserify('./js/index.js', browserifyOptions));

const sass = require('node-sass');

app.get('/style.css', function(req, res) {
  sass.render({
    file: 'style.scss',
  }, function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Service Error")
    } else {
      res.setHeader('Content-Type', 'text/css');
      res.send(result.css);
    }
  });
});

const server = app.listen((process.env['PORT'] || 5000), function() {
  console.log("HTTP server listening to", server.address().port);
});
