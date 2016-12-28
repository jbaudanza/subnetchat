./node_modules/.bin/webpack --optimize-minimize
npm rebuild node-sass
node -e "require('./stylesheet').writeFile('public/style.css')"
