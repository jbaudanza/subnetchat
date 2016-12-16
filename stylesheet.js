const sass = require('node-sass');
const bourbon = require('node-bourbon');
const fs = require('fs');

const includePaths = [].concat(
  bourbon.includePaths,
  './node_modules/normalize.css/'
);

function build() {
  return new Promise(function(resolve, reject) {
    sass.render({
      file: 'style.scss',
      includePaths: includePaths
    }, function(err, result) {
      if (err)
        reject(err);
      else
        resolve(result.css);
    });
  });
}


function serve(req, res) {
  build().then(
    function(css) {
      res.setHeader('Content-Type', 'text/css');
      res.send(css);
    },
    function(err) {
      console.error(err);
      res.status(500).send("Internal Service Error")        
    }
  );
}

function writeFile(filename) {
  return build().then(function(css) {
    return new Promise(function(resolve, reject) {
      fs.writeFile(filename, css, function(err) {
        if (err)
          reject(err)
        else
          resolve();
      });
    });
  })
}

module.exports = {build, serve, writeFile};
