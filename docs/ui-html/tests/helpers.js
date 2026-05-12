const path = require('path');

const HTML_DIR = path.resolve(__dirname, '..');

function fileUrl(filename) {
  return 'file://' + path.join(HTML_DIR, filename);
}

module.exports = { fileUrl, HTML_DIR };
