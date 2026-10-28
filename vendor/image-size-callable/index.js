const fs = require("fs");
const { imageSize } = require("image-size");

function size(input) {
  if (typeof input === "string") return imageSize(fs.readFileSync(input));
  return imageSize(input);
}

module.exports = size;
module.exports.imageSize = size;
