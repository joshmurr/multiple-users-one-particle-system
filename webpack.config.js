const path = require('path');
const devMode = process.env.NODE_ENV !== 'production';
const webpack = require('webpack');

module.exports = {
    entry : './src/main.js',
    output : {
        filename : 'bundle.js',
        path : path.resolve(__dirname, 'dist'),
    },
    module : {
        rules : [
            {
                test: /\.glsl$/i,
                loader: ['webpack-glsl-loader'],
            },
        ],
    },
    devtool: 'source-map',
    plugins: [

    ],
    mode : devMode ? 'development' : 'production',
    watch: devMode,
};
