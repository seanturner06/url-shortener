// Global type definitions

/**
 * The result of validating a URL.
 */
export type ValidateUrlResult = {
    valid: boolean;
    reason?: string;
};

/**
 * The shape of the secret value returned from AWS Secrets Manager for Redis.
 */
export type SecretValue = {
    REDIS_ENDPOINT: string;
};

/**
 * The Redis client interface (subset used in this project).
 */
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<any>;
}

/**
 * The request context object for API Gateway events.
 */
export type RequestContext = {
    apiId?: string;
    stage?: string;
};

/**
 * The event object for API Gateway Lambda handlers.
 */
export type APIGatewayEvent = {
    body?: string;
    requestContext?: RequestContext;
    pathParameters?: { [key: string]: string } | null;
};

/**
 * The response object for Lambda handlers.
 */
export type HandlerResponse = {
    statusCode: number;
    headers?: Record<string, string>;
    body: string;
};
