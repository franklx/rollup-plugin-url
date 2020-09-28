'use strict';

var crypto = require('crypto');
var path = require('path');
var util = require('util');
var fs = require('fs');
require('make-dir');
var mime = require('mime');
var pluginutils = require('@rollup/pluginutils');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var util__default = /*#__PURE__*/_interopDefaultLegacy(util);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var mime__default = /*#__PURE__*/_interopDefaultLegacy(mime);

const fsStatPromise = util__default['default'].promisify(fs__default['default'].stat);
const fsReadFilePromise = util__default['default'].promisify(fs__default['default'].readFile);
const { posix, sep } = path__default['default'];
const defaultInclude = ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.gif'];

function url(options = {}) {
  const {
    limit = 14 * 1024,
    include = defaultInclude,
    exclude,
    publicPath = '',
    emitFiles = true,
    fileName = '[hash][extname]'
  } = options;
  const filter = pluginutils.createFilter(include, exclude);

  const copies = Object.create(null);

  return {
    name: 'url',
    load(id) {
      if (!filter(id)) {
        return null;
      }
      return Promise.all([fsStatPromise(id), fsReadFilePromise(id)]).then(([stats, buffer]) => {
        let data;
        if ((limit && stats.size > limit) || limit === 0) {
          const hash = crypto__default['default']
            .createHash('sha1')
            .update(buffer)
            .digest('hex')
            .substr(0, 16);
          const ext = path__default['default'].extname(id);
          const name = path__default['default'].basename(id, ext);
          // Determine the directory name of the file based
          // on either the relative path provided in options,
          // or the parent directory
          const relativeDir = options.sourceDir
            ? path__default['default'].relative(options.sourceDir, path__default['default'].dirname(id))
            : path__default['default']
                .dirname(id)
                .split(sep)
                .pop();

          // Generate the output file name based on some string
          // replacement parameters
          const outputFileName = fileName
            .replace(/\[hash\]/g, hash)
            .replace(/\[extname\]/g, ext)
            // use `sep` for windows environments
            .replace(/\[dirname\]/g, relativeDir === '' ? '' : `${relativeDir}${sep}`)
            .replace(/\[name\]/g, name);
          // Windows fix - exports must be in unix format
          data = `${publicPath}${outputFileName.split(sep).join(posix.sep)}`;
          copies[id] = outputFileName;
        } else {
          const mimetype = mime__default['default'].getType(id);
          const isSVG = mimetype === 'image/svg+xml';
          data = isSVG ? encodeSVG(buffer) : buffer.toString('base64');
          const encoding = isSVG ? '' : ';base64';
          data = `data:${mimetype}${encoding},${data}`;
        }
        return `export default "${data}"`;
      });
    },
    generateBundle: async function write(outputOptions) {
      // Allow skipping saving files for server side builds.
      if (!emitFiles) return;

      await Promise.all(
        Object.keys(copies).map(async (name) =>
          this.emitFile({
            type: "asset",
            name: path__default['default'].basename(name),
            fileName: copies[name],
            source: fs__default['default'].readFileSync(name),
          })
        )
      );
    }
  };
}

// https://github.com/filamentgroup/directory-encoder/blob/master/lib/svg-uri-encoder.js
function encodeSVG(buffer) {
  return (
    encodeURIComponent(
      buffer
        .toString('utf-8')
        // strip newlines and tabs
        .replace(/[\n\r]/gim, '')
        .replace(/\t/gim, ' ')
        // strip comments
        .replace(/<!--(.*(?=-->))-->/gim, '')
        // replace
        .replace(/'/gim, '\\i')
    )
      // encode brackets
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
  );
}

module.exports = url;
//# sourceMappingURL=index.js.map
