./node_modules/browserify/bin/cmd.js js/index.js  -t [ babelify --presets [ react es2015 ] ] -o public/chat.js

node -e "require('./stylesheet').writeFile('public/style.css')"
