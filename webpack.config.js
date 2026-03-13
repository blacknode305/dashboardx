const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production', // 👈 ВАЖНО: включает сжатие JS
  entry: './client/js/index.js',
  output: {
    filename: 'script.js',
    path: path.resolve(__dirname, 'public'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'style.css' }),
    new HtmlWebpackPlugin({
      template: './client/index.html', // исходный HTML
      filename: 'index.html',           // результат в /public
    })
  ],
  target: 'web', // 👈 ГАРАНТИЯ, что Node API не попадут
  resolve: {
    fallback: {
      fs: false,
      net: false,
      tls: false
    }
  }
};