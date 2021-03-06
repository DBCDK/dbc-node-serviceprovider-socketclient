'use strict';

import * as dbcrelic from 'dbc-node-newrelic-wrapper';

/**
 * A dummy socket client used for server side rendering.
 * @type {{on: Function, emit: Function}}
 */
const serverSideSocketDummy = {
  on: function() {
  },
  emit: function() {
  }
};

let socket;
const clientHttpApiFallback = {
  listeners: [],
  on: function (event, cb) {
    socket.listeners.push({event: event, callback: cb});
  },
  off: function () {},
  emit: function (event, data) {
    let cleanEvent = event.replace('Request', '');
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState === 4 && xmlhttp.status !== 500 && xmlhttp.status !== 404) {
        socket.listeners.forEach((listener) => {
          if (listener.event === cleanEvent + 'Response') {
            JSON.parse(xmlhttp.responseText).forEach((resp) => {
              resp.forEach((res) => {
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
  let protocol = 'https:' === location.protocol ? 'wss' : 'ws'; // eslint-disable-line
  let protoBin;

  if ('WebSocket' in window) {
    if (protoBin = 'binaryType' in WebSocket.prototype) { // eslint-disable-line
      return protoBin;
    }
    try {
      return !!(new WebSocket(protocol + '://.').binaryType);
    }
    catch (e) {} // eslint-disable-line
  }

  return false;
}

if (typeof window !== 'undefined' && ('WebSocket' in window || 'MozWebSocket' in window)) {
  if (checkWebSocket()) {
    socket = require('socketcluster-client').connect();
  }
  else {
    socket = clientHttpApiFallback;
  }

  window.socket = socket;
}
else {
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
export default function ServiceProviderSocketClient(event) {
  let listening = false;

  function request(data) {
    const requestEvent = event + 'Request';
    socket.emit(requestEvent, data);
    dbcrelic.addPageAction(requestEvent, {request: data});
  }

  function addListener(listener) {
    listener(data => socket.emit(event + 'Request', data));
  }

  function response(cb) {
    const responseEvent = event + 'Response';
    const onResponse = (data) => {
      cb(data);
      dbcrelic.addPageAction(responseEvent, {response: data});
    };
    socket.on(responseEvent, onResponse);
    return {
      off() {
        socket.off(responseEvent, onResponse);
      }
    };
  }

  /**
   * Adds ONE (and only one) listener to this socket.
   * @param cb
   * @returns {*}
   */
  function responseOnce(cb) {
    if (!listening) {
      listening = response(cb);
    }

    return listening;
  }

  function subscribe(channel, cb) {
    socket.subscribe(channel);
    socket.on('message', (msg) => {
      if (msg.indexOf(`"channel":"${channel}"`) >= 0) {
        try {
          cb(JSON.parse(msg));
        }
        catch (e) {
          console.error(e); // eslint-disable-line no-console
        }
      }
    });
  }

  return {
    addListener,
    subscribe,
    request,
    response,
    responseOnce
  };
}
