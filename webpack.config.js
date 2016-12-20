module.exports = {
  entry: {
    chat: './js/chat',
    admin: './js/admin'
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/public'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: [["es2015", { "modules": false }], "react"]
        }
      }
    ]
  }
};
