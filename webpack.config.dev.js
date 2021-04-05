const path = require("path")
const { merge } = require("webpack-merge")

const common = require("./webpack.config.common")

module.exports = merge(common, {
    mode: "development",
    devtool: "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "./dist"),
        compress: true,
        port: 9000,
        mimeTypes: { 'application/json': ['babylon'] },
    },
    stats: {
      logging: 'verbose',
    },
})
