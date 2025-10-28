// @ts-check
const { validateUrl } = require('../utils/validateUrl');
const { getItem, incrementClickCount, deleteItem } = require('../utils/dynamoDB');
const { getRedisClient } = require('../utils/redisClient.js');

/**
 * @typedef {import("../types").HandlerResponse} HandlerResponse
 * @typedef {import("../types").ValidateUrlResult} ValidateUrlResult
 * @typedef {import("../types").RedisClient} RedisClient
 */

/**
 * @param {import("../types").APIGatewayEvent} event
 * @returns {Promise<import("../types").HandlerResponse>}
 */
exports.handler = async (event) => {

    // 1. Get Short Code from Path
    /** @type {string|null} */
    const shortCode = event.pathParameters ? event.pathParameters.shortCode : null;

    if (!shortCode) {
        return { statusCode: 400, body: 'Missing short code.' };
    }

    // 0. Initialize Redis Client
    /** @type {RedisClient} */
    const redisClient = await getRedisClient();

    // See if we have a cached URL
    try {
        /** @type {string|null} */
        const cachedUrl = await redisClient.get(shortCode);

        // Cache Hit
        if(cachedUrl) {
            // Increment Click Count (fire-and-forget)
            incrementClickCount(shortCode).catch(err =>{
                console.error('Failed to increment click count:', err);
            });

            // Return Redirect Response
            return {
                statusCode: 302,
                headers: {
                    'Location': cachedUrl,
                    'Cache-Control': 'max-age=3600, public'
                },
                body: 'Redirecting...'
            };
        }
        // Cache Miss: Fetch from DynamoDB
        /** @type {string|null} */
        const originalUrl = await getItem(shortCode);

        if (!originalUrl) {
            return { statusCode: 404, body: 'Short code not found.' };
        }

        // Revalidate URL 
        /** @type {ValidateUrlResult} */
        const isValid = await validateUrl(originalUrl);
        if(!isValid.valid){
            // Remove invalid entry from DB
            await deleteItem(shortCode);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'The original URL is no longer valid: ' + (isValid.reason || 'Invalid URL format.') }),
            };
        }

        // Store in Redis Cache (fire-and-forget)
        redisClient.set(shortCode, originalUrl, 'EX', 3600 * 24).catch(err => {
            console.error('Failed to cache URL in Redis:', err);
        });

        // Increment Click Count (fire-and-forget)
        incrementClickCount(shortCode).catch(err =>{
            console.error('Failed to increment click count:', err);
        });

        // Return Redirect Response
        return {
            statusCode: 302,
            headers: {
                'Location': originalUrl,
                'Cache-Control': 'max-age=3600, public'
            },
            body: 'Redirecting...'
        };
    }catch(err) {
        console.error('Redis Cache Error:', err);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};