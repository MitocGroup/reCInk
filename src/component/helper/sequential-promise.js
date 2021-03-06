'use strict';

/**
 * Implements Promise.all() but sequential execution
 */
class SequentialPromise {
  /**
   * @param {function[]} promises
   * @param {*} value
   * 
   * @returns {Promise}
   */
  static all(promises, value = null) {
    const promisesCloned = [].concat(promises);
    
    return this._sequential(promisesCloned, value);
  }
  
  /**
   * @param {function[]} promises
   * @param {*} result
   * 
   * @returns {Promise}
   *
   * @private
   */
  static _sequential(promises, result) {
    if (promises.length <= 0) {
      return Promise.resolve(result);
    }
    
    return promises.shift()(result)
      .then(result => SequentialPromise._sequential(promises, result));
  }
}

module.exports = SequentialPromise;
