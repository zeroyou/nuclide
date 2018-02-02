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

import type {AgentOptions} from '../../common/types';

import request from 'request';

export type RequestOptions = {
  uri: string,
  agentOptions?: AgentOptions,
  useQuerystring?: boolean,
  timeout?: number,
};

export type ResponseBody = {body: string, response: HttpResponse};
type HttpResponse = {statusCode: number};

/**
 * Promisified version of the request function:
 * https://www.npmjs.com/package/request#requestoptions-callback
 * Defaults to using the node's querystring module to encode the url query parameters.
 * If you want to use the npm's qs module to encode the query parameters, explicitly provide
 * the option:
 * {useQuerystring: false}
 */
export default function asyncRequest(
  options: RequestOptions,
): Promise<ResponseBody> {
  return new Promise((resolve, reject) => {
    if (options.useQuerystring === undefined) {
      options.useQuerystring = true;
    }
    // TODO(t8118670): This can cause an uncaught exception.
    // Likely requires a fix to 'request'.
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else if (response.statusCode < 200 || response.statusCode >= 300) {
        let errorJson = body;
        if (typeof body !== 'object') {
          try {
            errorJson = JSON.parse(body);
          } catch (e) {
            // 404 responses aren't currently JSON.
            errorJson = {message: body};
          }
        }
        // Cast to Object for use of code field below...
        const err: Object = new Error(errorJson.message);
        // Success http status codes range from 200 to 299.
        err.code = errorJson.code || response.statusCode;
        reject(err);
      } else {
        resolve({body, response});
      }
    });
  });
}
