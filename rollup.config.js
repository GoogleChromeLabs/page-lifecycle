/*
 Copyright 2018 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

const path = require('path');
const babel = require('rollup-plugin-babel');
const multiEntry = require('rollup-plugin-multi-entry');
const {terser} = require('rollup-plugin-terser');


const pkg = require('./package.json');

const BANNER = `/*!
 Copyright 2018 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/`;

const generateBundleOpts = (file, {transpile, useNatives} = {}) => {
  const plugins = [];

  if (useNatives) {
    plugins.push({
      resolveId: (importee, importer) => {
        if (importee.includes('/shims/')) {
          return path.resolve(
              path.dirname(importer),
              importee.replace('/shims/', '/natives/'));
        }
      },
    });
  }

  if (transpile) {
    plugins.push(babel({
      presets: [['env', {modules: false}]],
      plugins: ['external-helpers'],
    }));
  }

  const terserOpts = {
    output: {
      comments: /^!/,
    },
    compress: true,
    mangle: {
      toplevel: true,
    },
  };
  if (!transpile) {
    // Mangling properties doesn't work with the class transformations done
    // by Babel, since Babel defines class methods using their string names
    // .(passed to `Object.defineProperty()`) and strings are not minifed
    // by terser.
    terserOpts.mangle.properties = {
      regex: /^_/,
    };
  }
  plugins.push(terser(terserOpts));

  return {
    input: 'src/export.mjs',
    output: {
      file,
      format: transpile ? 'umd' : 'es',
      dir: 'dist',
      name: 'lifecycle',
      banner: `${BANNER}\n\n/*! ${file} v${pkg.version} */\n`,
      sourcemap: true,
    },
    plugins,
  };
};

module.exports = [
  generateBundleOpts('lifecycle.mjs'),
  generateBundleOpts('lifecycle.native.mjs', {useNatives: true}),
  generateBundleOpts('lifecycle.es5.js', {transpile: true}),

  {
    input: 'test/*-test.mjs',
    output: {
      file: 'test-bundle.js',
      format: 'iife',
      dir: 'test',
      sourcemap: true,
    },
    plugins: [
      multiEntry(),
      babel({
        presets: [['env', {modules: false}]],
        plugins: ['external-helpers'],
      }),
    ],
    watch: {
      include: ['src/**/*.mjs', 'test/**/*.mjs'],
    },
  },
];
