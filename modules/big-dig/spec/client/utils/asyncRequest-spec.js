/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

import http from 'http';
import asyncRequest from '../../../src/client/utils/asyncRequest';

describe('asyncRequest', () => {
  let server;

  beforeEach(() => {
    let connected = false;
    server = http.createServer((req, res) => {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('okay');
    });
    server.listen(36845, '127.0.0.1', 511 /* backlog */, () => {
      connected = true;
    });
    waitsFor(() => connected);
  });

  afterEach(() => {
    server.close();
  });

  it('can do http request in an async way', () => {
    waitsForPromise(async () => {
      const {body, response} = await asyncRequest({
        uri: 'http://127.0.0.1:36845/abc',
      });
      expect(body).toBe('okay');
      expect(response.statusCode).toBe(200);
    });
  });
});
