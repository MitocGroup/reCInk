'use strict';

const path = require('path');
const pify = require('pify');
const print = require('print');
const Spinner = require('recink/src/component/helper/spinner');
const E2ERunner = require('./e2e-runner');
const urlExists = require('url-exists');
const e2eEvents = require('./events');
const emitEvents = require('recink/src/component/emit/events');
const ContainerTransformer = require('recink/src/component/helper/container-transformer');
const DependencyBasedComponent = require('recink/src/component/dependency-based-component');

/**
 * End2End component
 */
class E2EComponent extends DependencyBasedComponent {
  /**
   * @param {*} args
   */
  constructor(...args) {
    super(...args);

    this._testAssets = [];
    this._stats = {
      total: 0,
      processed: 0,
      ignored: 0,
    };
  }

  /**
   * @returns {String}
   */
  get name() {
    return 'e2e';
  }
  
  /**
   * Add the components E2E depends on
   * @returns {String[]}
   */
  get dependencies() {
    return [ 'emit' ];
  }

  /**
   * @param {Emitter} emitter
   * @returns {Promise}
   * @private
   */
  _run(emitter) {
    const config = {
      reporter: this.container.get('reporter', E2ERunner.DEFAULT_REPORTER),
      browsers: this.container.get('browsers', E2ERunner.DEFAULT_BROWSERS),
      screenshotsPath: path.resolve(this.container.get('screenshot.path', process.cwd())),
      takeOnFail: this.container.get('screenshot.take-on-fail', false)
    };
    const e2eRunner = new E2ERunner(config);

    return this._waitUris()
      .then(() => emitter.emitBlocking(e2eEvents.assets.e2e.start))
      .then(() => {
        return e2eRunner.run(this._testAssets)
          .then(() => Promise.resolve(0))
          .catch(failed => Promise.resolve(failed));
      })
      .then(failedCount => {
        return e2eRunner.cleanup()
          .then(() => emitter.emitBlocking(e2eEvents.assets.e2e.end))
          .then(() => Promise.resolve(failedCount));
      });
  }

  /**
   * @returns {Promise}
   * @private
   */
  _waitUris() {
    const uris = this.container.get('wait.uri', []);

    if (uris.length <= 0) {
      return Promise.resolve();
    }

    const spinner = new Spinner(`Wait for the following URIs to be available: ${ uris.join(', ') }`);

    return spinner
      .then(`All URIs are available:\n\t${ uris.join('\n\t') }`)
      .catch(`Some of the following URIs are not available:\n\t${ uris.join('\n\t') }`)
      .promise(Promise.all(uris.map(uri => this._waitUri(uri))));
  }

  /**
   * @param {String} uri
   * @returns {Promise}
   * @private
   */
  _waitUri(uri) {
    return new Promise((resolve, reject) => {
      const timeout = parseInt(this.container.get('wait.timeout', E2EComponent.DEFAULT_WAIT_TIMEOUT));
      const interval = this.container.get('wait.interval', E2EComponent.DEFAULT_WAIT_INTERVAL);
      const failTime = Date.now() + timeout;

      const id = setInterval(() => {
        pify(urlExists)(uri).then(exists => {
          if (exists) {
            clearInterval(id);

            resolve();
          } else if (failTime <= Date.now()) {
            clearInterval(id);

            reject(new Error(`The max timeout limit of ${ timeout } reached`));
          }
        }).catch(error => {
          clearInterval(id);

          reject(error);
        });
      }, interval);
    });
  }

  /**
   * @param {Emitter} emitter
   * @returns {Promise}
   */
  run(emitter) {
    return new Promise((resolve, reject) => {
      emitter.onBlocking(emitEvents.module.emit.asset, payload => {
        if (!this._match(payload)) {
          return emitter.emitBlocking(e2eEvents.asset.e2e.skip, payload);
        }

        return emitter.emitBlocking(e2eEvents.asset.e2e.add, payload).then(() => {
          const { fileAbs } = payload;

          this._testAssets.push(fileAbs);
        });
      }, E2EComponent.DEFAULT_PRIORITY);

      emitter.on(emitEvents.modules.process.end, () => {
        process.nextTick(() => {
          if (this._testAssets.length <= 0) {
            this.logger.info(this.logger.emoji.beer, `Finished processing ${ this.stats.processed } e2e test assets`);
            this.logger.debug(this.dumpStats());

            return resolve();
          }

          this._run(emitter).then(failedCount => {
            if (failedCount > 0) {
              return Promise.reject(new Error(`There is/are ${ failedCount } end-to-end test case/s failed!`));
            }

            this.logger.info(this.logger.emoji.beer, `Finished processing ${ this.stats.processed } e2e test assets`);
            this.logger.debug(this.dumpStats());

            resolve();
          }).catch(error => reject(error));
        });
      });
    });
  }

  /**
   * @param {*} config
   * @param {String} configFile
   *
   * @returns {Container}
   */
  prepareConfig(config, configFile) {
    return super.prepareConfig(config, configFile)
      .then(container => {
        return (new ContainerTransformer(container))
          .addPattern('pattern')
          .addPattern('ignore')
          .transform();
      });
  }

  /**
   * @param {*} payload
   * @returns {Boolean}
   * @private
   */
  _match(payload) {
    const pattern = this.container.get('pattern', []);
    const ignore = this.container.get('ignore', []);

    const result = pattern.filter(p => this._test(p, payload.file)).length > 0
      && ignore.filter(i => this._test(i, payload.file)).length <= 0;

    if (result) {
      this.stats.processed++;
    } else {
      this.stats.ignored++;
    }

    this.stats.total++;

    return result;
  }

  /**
   * @param {String|RegExp} pattern
   * @param {String} value
   * @returns {Boolean}
   * @private
   */
  _test(pattern, value) {
    if (!(pattern instanceof RegExp)) {
      return value.indexOf(pattern.toString()) !== -1;
    }

    return pattern.test(value);
  }

  /**
   * @returns {*}
   */
  get stats() {
    return this._stats;
  }

  /**
   * @returns {String}
   */
  dumpStats() {
    return print(this.stats, {
      showArrayIndices: true,
      showArrayLength: true,
      sortProps: false,
    }).replace(/\t/g, '   ');
  }

  /**
   * @returns {Number}
   */
  static get DEFAULT_WAIT_INTERVAL() {
    return 200;
  }

  /**
   * @returns {Number}
   */
  static get DEFAULT_WAIT_TIMEOUT() {
    return 15000;
  }

  /**
   * @returns {Number}
   */
  static get DEFAULT_PRIORITY() {
    return 10;
  }
}

module.exports = E2EComponent;
