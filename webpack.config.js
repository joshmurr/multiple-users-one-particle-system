const path = require('path');
const devMode = process.env.NODE_ENV !== 'production';
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry : './src/main.js',
    output : {
        filename : 'bundle.js',
        path : path.resolve(__dirname, 'dist'),
    },
    module : {
        rules : [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    'style-loader',
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
            },
            {
                test: /\.glsl$/i,
                loader: ['webpack-glsl-loader'],
            },
        ],
    },
    devtool: 'source-map',
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Traces',
            template: 'index.html'
        })
    ],
    mode : devMode ? 'development' : 'production',
    watch: devMode,
};
