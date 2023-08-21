// Command to create the bundle: npx webpack

const path = require('path');
const webpack = require('webpack');


module.exports = {
  entry: './encryption-script.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    fallback: {
      "stream": require.resolve('stream-browserify'),
      "buffer": require.resolve('buffer'),
    },
  },
  // plugins: [
        // // Work around for Buffer is undefined:
        // // https://github.com/webpack/changelog-v5/issues/10
        // new webpack.ProvidePlugin({
            // Buffer: ['buffer', 'Buffer'],
        // }),
        // new webpack.ProvidePlugin({
            // process: 'process/browser',
        // }),
    // ],
  mode: 'production'
};