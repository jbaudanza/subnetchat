./node_modules/.bin/webpack
npm rebuild node-sass
node -e "require('./stylesheet').writeFile('public/style.css')"
