'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = ServiceProviderSocketClient;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _dbcNodeNewrelicWrapper = require('dbc-node-newrelic-wrapper');

/**
 * A dummy socket client used for server side rendering.
 * @type {{on: Function, emit: Function}}
 */

var dbcrelic = _interopRequireWildcard(_dbcNodeNewrelicWrapper);

var serverSideSocketDummy = {
  on: function on() {},
  emit: function emit() {}
};

/**
 * socket.io-client cannot be loaded on the server, so if window object
 * @type {boolean|{on: Function, emit: Function}}
 */
var socket = typeof window !== 'undefined' && require('socket.io-client').connect() || serverSideSocketDummy;

/**
 * Reqistrer an event for the ServiceProvider
 *
 * Returns a class with a method for request and response which are wrappers
 * around the socket.emit and socket.on methods
 *
 * @param {String} event
 * @returns {{request: request, response: response}}
 * @constructor
 */

function ServiceProviderSocketClient(event) {
  function request(data) {
    var requestEvent = event + 'Request';
    socket.emit(requestEvent, data);
    dbcrelic.addPageAction(requestEvent, { request: data });
  }

  function addListener(listener) {
    listener(function (data) {
      return socket.emit(event + 'Request', data);
    });
  }

  function response(cb) {
    var responseEvent = event + 'Response';
    socket.on(responseEvent, function (data) {
      cb(data);
      dbcrelic.addPageAction(responseEvent, { response: data });
    });
  }

  return {
    addListener: addListener,
    request: request,
    response: response
  };
}

module.exports = exports['default'];