'use strict';

const fs = require('fs');
const path = require('path');
const pify = require('pify');
const md5File = require('md5-file');
const progress = require('progress-stream');
const AbstractDriver = require('./abstract-driver');
const AwsCredentials = require('../helper/aws-credentials');

/**
 * AWS S3 cache driver
 */
class S3Driver extends AbstractDriver {
  /**
   * @param {string} cacheDir
   * @param {string} path
   * @param {*} options
   * @param {boolean} includeNodeVersion
   */
  constructor(cacheDir, path, options, includeNodeVersion = true) {
    super(cacheDir);
    
    this._path = path;
    this._options = options;
    this._includeNodeVersion = includeNodeVersion;
    this._awsCredentials = new AwsCredentials(this.options);
    this._client = false;
  }

  /**
   * @returns {string}
   */
  get name() {
    return 's3';
  }
  
  /**
   * @returns {boolean}
   */
  get includeNodeVersion() {
    return this._includeNodeVersion;
  }
  
  /**
   * @returns {string}
   */
  get path() {
    return this._path;
  }

  /**
   * Get AWS.S3 client promise
   * @return {Promise}
   */
  get client() {
    if (this._client) {
      return Promise.resolve(this._client);
    }

    return this._awsCredentials.getAws().then(AWS => Promise.resolve(new AWS.S3()));
  }
  
  /**
   * @returns {*}
   */
  get options() {
    return this._options;
  }
  
  /**
   * @returns {Promise}
   * @private
   */
  _upload() {
    return this._packageSize.then(ContentLength => {
      if (ContentLength <= 0) {
        return Promise.resolve();
      }

      return this._hasChanged.then(hasChanged => {
        return new Promise((resolve, reject) => {
          if (!hasChanged) {
            return resolve();
          }

          const { Bucket, Key } = this._s3Location(this.path);
          const packageStream = fs.createReadStream(this._packagePath);

          packageStream.on('error', error => reject(error));

          const Body = this._track(packageStream, ContentLength);

          this.client
            .then(S3 => S3.upload({ Bucket, Key, Body }).promise())
            .then(() => resolve())
            .catch(error => reject(error));
        });
      });
    });
  }
  
  /**
   * @returns {Promise}
   * @private
   */
  get _hasChanged() {
    return pify(md5File)(this._packagePath).then(packageHash => {
      const { Bucket, Key } = this._s3Location(this.path);

      return this.client
        .then(S3 => S3.headObject({ Bucket, Key }).promise())
        .then(data => {
          const remoteHash = data.ETag.replace(/"/g, '');

          return Promise.resolve(packageHash !== remoteHash);
        })
        .catch(error => {
          if (this._isMissingObject(error)) {
            return Promise.resolve(true);
          }

          return Promise.reject(error);
        });
    });
  }
  
  /**
   * @returns {Promise}
   *
   * @private
   */
  _download() {
    return new Promise((resolve, reject) => {
      this.client.then(S3 => {
        const { Bucket, Key } = this._s3Location(this.path);
        const packageStream = fs.createWriteStream(this._packagePath);
        const remoteStream = S3.getObject({ Bucket, Key }).createReadStream();

        remoteStream.on('end', () => resolve());
        remoteStream.on('error', error => {
          if (this._isMissingObject(error)) {
            return resolve();
          }

          reject(error);
        });
        packageStream.on('error', error => reject(error));

        this._track(remoteStream).pipe(packageStream);
      });
    });
  }
  
  /**
   * @param {*} error
   *
   * @returns {boolean}
   * 
   * @private
   */
  _isMissingObject(error) {
    return [ 'NoSuchKey', 'NotFound' ].indexOf(error.code) !== -1;
  }
  
  /**
   * @param {ReadableStream} stream
   * @param {number} length
   * @param {number} time
   *
   * @returns {ReadableStream}
   * 
   * @private
   */
  _track(stream, length = null, time = 50) {
    const tracker = progress({ length, time, });
    
    tracker.on('progress', progress => {
      this._progress(progress.length, progress.transferred);
    });
        
    return stream.pipe(tracker);
  }
  
  /**
   * @param {string} s3Path
   *
   * @returns {*}
   *
   * @private
   */
  _s3Location(s3Path) {
    const matches = s3Path.match(
      /^(?:s3:\/\/|\/)?([^\/]+)(?:\/(.*))?$/i
    );
    
    if (matches.length === 2) {
      matches.push('');
    }
    
    const [ , Bucket, keyPrefix ] = matches;
    
    const Key = path.join(
      keyPrefix || '',
      this.includeNodeVersion ? process.version : '',
      path.basename(this._packagePath)
    ).replace(/\\+/g, '/'); // ensure path delimiter set to slash
    
    return { Bucket, Key };
  }
}

module.exports = S3Driver;
