const {
    override,
    addWebpackPlugin,
} = require('customize-cra');

const ThreadsPlugin = require("threads-plugin");


//how to: https://stackoverflow.com/questions/71523249/add-webpack-plugins-through-config-overrides-js
//and here too: https://github.com/criszz77/luna/blob/ccaac73f82574fb409b69843e260dd58a3f68f8c/template/config-overrides.js

module.exports = override(
    addWebpackPlugin(new ThreadsPlugin()),
);