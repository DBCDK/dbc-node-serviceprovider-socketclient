'use strict';

import SocketClient from '../ServiceProviderSocketClient.js';
import {expect} from 'chai';

describe('Testing ServiceProviderSocketClient', () => {

  it('Ensure we get the expected methods returned from constructor', () => {
    const socketClient = SocketClient();
    expect(socketClient).to.have.all.keys(['addListener', 'request', 'response', 'responseOnce']);
  });
});
