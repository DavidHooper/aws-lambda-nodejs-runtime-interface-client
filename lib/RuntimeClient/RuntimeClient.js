/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module defines the Runtime client which is responsible for all HTTP
 * interactions with the Runtime layer.
 */
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Errors = __importStar(require("../Errors"));
const XRayError = __importStar(require("../Errors/XRayError"));
const ERROR_TYPE_HEADER = "Lambda-Runtime-Function-Error-Type";
const XRAY_ERROR_CAUSE = "Lambda-Runtime-Function-XRay-Error-Cause";
function userAgent() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const version = require("../../package.json").version;
    return `aws-lambda-nodejs/${process.version}-${version}`;
}
/**
 * Objects of this class are responsible for all interactions with the Runtime
 * API.
 */
class RuntimeClient {
    constructor(hostnamePort, httpClient) {
        this.http = httpClient || require("http");
        this.userAgent = userAgent();
        const [hostname, port] = hostnamePort.split(":");
        this.hostname = hostname;
        this.port = parseInt(port, 10);
        this.agent = new this.http.Agent({
            keepAlive: true,
            maxSockets: 1,
        });
    }
    /**
     * Complete and invocation with the provided response.
     * @param {Object} response
     *   An arbitrary object to convert to JSON and send back as as response.
     * @param {String} id
     *   The invocation ID.
     * @param {function()} callback
     *   The callback to run after the POST response ends
     */
    postInvocationResponse(response, id, callback) {
        this._post(`/2018-06-01/runtime/invocation/${id}/response`, response, {}, callback);
    }
    /**
     * Post an initialization error to the Runtime API.
     * @param {Error} error
     * @param {function()} callback
     *   The callback to run after the POST response ends
     */
    postInitError(error, callback) {
        const response = Errors.toRuntimeResponse(error);
        this._post(`/2018-06-01/runtime/init/error`, response, { [ERROR_TYPE_HEADER]: response.errorType }, callback);
    }
    /**
     * Post an invocation error to the Runtime API
     * @param {Error} error
     * @param {String} id
     *   The invocation ID for the in-progress invocation.
     * @param {function()} callback
     *   The callback to run after the POST response ends
     */
    postInvocationError(error, id, callback) {
        const response = Errors.toRuntimeResponse(error);
        const xrayString = XRayError.toFormatted(error);
        this._post(`/2018-06-01/runtime/invocation/${id}/error`, response, {
            [ERROR_TYPE_HEADER]: response.errorType,
            [XRAY_ERROR_CAUSE]: xrayString
        }, callback);
    }
    /**
     * Get the next invocation.
     * @return {PromiseLike.<Object>}
     *   A promise which resolves to an invocation object that contains the body
     *   as json and the header array. e.g. {bodyJson, headers}
     */
    async nextInvocation() {
        const options = {
            hostname: this.hostname,
            port: this.port,
            path: "/2018-06-01/runtime/invocation/next",
            method: "GET",
            agent: this.agent,
            headers: {
                "User-Agent": this.userAgent,
            },
        };
        return new Promise((resolve, reject) => {
            const request = this.http.request(options, (response) => {
                let data = "";
                response
                    .setEncoding("utf-8")
                    .on("data", (chunk) => {
                    data += chunk;
                })
                    .on("end", () => {
                    resolve({
                        bodyJson: data,
                        headers: response.headers,
                    });
                });
            });
            request
                .on("error", (e) => {
                reject(e);
            })
                .end();
        });
    }
    /**
     * HTTP Post to a path.
     * @param {String} path
     * @param {Object} body
     *   The body is serialized into JSON before posting.
     * @param {Object} headers
     *   The http headers
     * @param {function()} callback
     *   The callback to run after the POST response ends
     */
    _post(path, body, headers, callback) {
        const bodyString = _trySerializeResponse(body);
        const options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: "POST",
            headers: Object.assign({
                "Content-Type": "application/json",
                "Content-Length": Buffer.from(bodyString).length,
            }, headers || {}),
            agent: this.agent,
        };
        const request = this.http.request(options, (response) => {
            response
                .on("end", () => {
                callback();
            })
                .on("error", (e) => {
                throw e;
            })
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                .on("data", () => { });
        });
        request
            .on("error", (e) => {
            throw e;
        })
            .end(bodyString, "utf-8");
    }
}
exports.default = RuntimeClient;
/**
 * Attempt to serialize an object as json. Capture the failure if it occurs and
 * throw one that's known to be serializable.
 */
function _trySerializeResponse(body) {
    try {
        return JSON.stringify(body === undefined ? null : body);
    }
    catch (err) {
        throw new Error("Unable to stringify response body");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUnVudGltZUNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SdW50aW1lQ2xpZW50L1J1bnRpbWVDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0dBS0c7QUFFSCxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVliLGtEQUFvQztBQUNwQywrREFBaUQ7QUFFakQsTUFBTSxpQkFBaUIsR0FBRyxvQ0FBb0MsQ0FBQztBQUMvRCxNQUFNLGdCQUFnQixHQUFHLDBDQUEwQyxDQUFDO0FBMEJwRSxTQUFTLFNBQVM7SUFDaEIsOERBQThEO0lBQzlELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUV0RCxPQUFPLHFCQUFxQixPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO0FBQzNELENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFxQixhQUFhO0lBUWhDLFlBQ0UsWUFBb0IsRUFDcEIsVUFBdUI7UUFFdkIsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFDN0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDL0IsU0FBUyxFQUFFLElBQUk7WUFDZixVQUFVLEVBQUUsQ0FBQztTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7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