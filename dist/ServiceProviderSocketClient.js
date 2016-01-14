'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = ServiceProviderSocketClient;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _dbcNodeNewrelicWrapper = require('dbc-node-newrelic-wrapper');

var dbcrelic = _interopRequireWildcard(_dbcNodeNewrelicWrapper);

/**
 * A dummy socket client used for server side rendering.
 * @type {{on: Function, emit: Function}}
 */
var serverSideSocketDummy = {
  on: function on() {},
  emit: function emit() {}
};

var socket = undefined;
var clientHttpApiFallback = {
  listeners: [],
  on: function on(event, cb) {
    socket.listeners.push({ event: event, callback: cb });
  },
  emit: function emit(event, data) {
    var cleanEvent = event.replace('Request', '');
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        socket.listeners.forEach(function (listener) {
          if (listener.event === cleanEvent + 'Response') {
            JSON.parse(xmlhttp.responseText).forEach(function (resp) {
              resp.forEach(function (res) {
                listener.callback(res);
              });
            });
          }
        });
      }
    };

    xmlhttp.open('POST', '/api/' + cleanEvent);
    xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xmlhttp.send(JSON.stringify([data]));
  }
};

/**
 * Checks whether client has websockets.
 * Based on modernizr check
 * @returns truthy
 */
function checkWebSocket() {
  var protocol = 'https:' === location.protocol ? 'wss' : 'ws'; // eslint-disable-line
  var protoBin = undefined;

  if ('WebSocket' in window) {
    if (protoBin = 'binaryType' in WebSocket.prototype) {
      // eslint-disable-line
      return protoBin;
    }
    try {
      return !!new WebSocket(protocol + '://.').binaryType;
    } catch (e) {} // eslint-disable-line
  }

  return false;
}

if (typeof window !== 'undefined' && ('WebSocket' in window || 'MozWebSocket' in window)) {
  if (checkWebSocket()) {
    socket = require('socketcluster-client').connect();
  } else {
    socket = clientHttpApiFallback;
  }

  window.socket = socket;
} else {
  socket = serverSideSocketDummy;
}

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