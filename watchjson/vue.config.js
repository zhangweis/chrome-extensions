let HtmlWebpackPlugin = require('html-webpack-plugin');
let HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
module.exports = {
       publicPath: '.',
  devServer:{
    host:'0.0.0.0'
  },
  filenameHashing: false,
  configureWebpack: {
    plugins: [
      new HtmlWebpackInlineSourcePlugin()
    ]
  },
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].inlineSource = '.(js|css)$'
        return args
      });
      config.plugin('inlinehtml')
      .use(HtmlWebpackInlineSourcePlugin);
  }
};
