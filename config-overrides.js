const {
    override,
    addWebpackPlugin,
} = require('customize-cra');

const ThreadsPlugin = require("threads-plugin");


//how to: https://stackoverflow.com/questions/71523249/add-webpack-plugins-through-config-overrides-js
//and here too: https://github.com/criszz77/luna/blob/ccaac73f82574fb409b69843e260dd58a3f68f8c/template/config-overrides.js

const {DefinePlugin} = require('webpack');

module.exports = override(
    addWebpackPlugin(new ThreadsPlugin()),
    addWebpackPlugin(
        new DefinePlugin({
            // `process.env.NODE_ENV === 'production'` must be `true` for production
            // builds to eliminate development checks and reduce build size. You may
            // wish to include additional optimizations.
            'process.env.NODE_ENV': JSON.stringify(
                process.env.NODE_ENV || 'development',
            ),
            __DEV__: process.env.NODE_ENV !== 'production',
        }),
    ),
);