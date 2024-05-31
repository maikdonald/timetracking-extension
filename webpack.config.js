const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    popup: path.resolve("src/popup/index.tsx"),
    contentScript: path.resolve("src/contentScript/index.tsx"),
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: { noEmit: false },
            },
          },
        ],
        exclude: /node_modules/,
      },
      { test: /\.css$/, use: [{loader: "style-loader"}, {loader: "css-loader"}] },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
          {
            from: path.resolve("public"),
            to: path.resolve("../extension"),
          },
      ],
    }),
    ...getHtmlPlugins(["popup"])
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "..", "extension"),
  },
};

function getHtmlPlugins(chunks) {
  return chunks.map(
      (chunk) =>
          new HtmlPlugin({
              title: "Chrome Extension with ReactJs",
              filename: `${chunk}.html`,
              chunks: [chunk],
          })
  );
}