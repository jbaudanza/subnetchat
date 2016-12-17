module.exports = {
  entry: "./js/index.js",
  output: {
    filename: './public/chat.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ["es2015", "react"]
        }
      }
    ]
  }
};
