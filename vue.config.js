module.exports = {
  configureWebpack: {
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /lib/,
          type: "javascript/auto"
        }
      ]
    }
  },
  transpileDependencies: [
    'vuetify'
  ]
}
