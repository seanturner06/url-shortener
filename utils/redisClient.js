// @ts-check
const { Redis } = require("ioredis");
const { getSecret } = require("./secrets");

/**
 * @typedef {import("ioredis").Redis} RedisClient
 * @typedef {import("./secrets").SecretValue} SecretValue
 */

/** @type {RedisClient|null} */
let client = null; 

/**
 * Gets a Redis client instance.
 * @returns {Promise<RedisClient>} Redis Client
 */
async function getRedisClient() {
    if (!client) {

        if (!process.env.REDIS_ENDPOINT_NAME) {
            throw new Error('REDIS_ENDPOINT_NAME environment variable is not set.');
        }

        /** @type {SecretValue} */
        const secretValue = await getSecret(process.env.REDIS_ENDPOINT_NAME);

        const redisEndpoint = secretValue.REDIS_ENDPOINT;

        client = new Redis(
            {
                host: redisEndpoint,
                port: 6379,
                connectTimeout: 10000,
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) return null;
                    return Math.min(times * 200, 2000);
                },
                tls: {}, // Enable TLS
                lazyConnect: true,
            }
        );
        // Error listeners here to ensure silent failures are logged.
        client.on('error', (err) => {
            console.error("Redis Client Error:", err);
        });
        // Log to confirm client object creation (connection is lazy/on first command)
        console.log('Redis client object initialized.');
    }
    return client;
}

module.exports = { getRedisClient };
