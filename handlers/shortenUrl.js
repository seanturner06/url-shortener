const { generateShortCode } = require('../utils/generateShortCode');
const { putItem } = require('../utils/dynamoDB');
const { getRedisClient } = require('../utils/redisClient.js');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb'); // Import specific error
const { validateUrl } = require('../utils/validateUrl');

const MAX_RETRIES = 5;

console.log('Handler module loaded');

// Call but don't await yet
let redisClientPromise = getRedisClient(); 

exports.handler = async (event) => {
    console.log("event: ", event);
    console.log("event body", event.body); 
    const { url } = JSON.parse(event.body || '{}');

    if(!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing "url" in request body.' }),
        };
    }

    // Validate URL
    const isValid = await validateUrl(url);
    if (!isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid URL format.' }),
        };
    }

    // 1. Initialize Redis Client
    let redisClient; 

    // If we reach here, we have a unique shortCode and the item is stored
    // Store in Redis Cache
    try {
        redisClient = await redisClientPromise;
        console.log('Connecting to Redis...');
    } catch (cacheError) {
        console.error('Redis cache error:', cacheError);
    }

    // 2. Business Logic & Persistence with Retry Loop
    let shortCode;
    let success = false;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        shortCode = generateShortCode();
        console.log(`Attempt ${i+1}: Generated shortCode: ${shortCode}`);
        try {
            // Attempt to write the unique code
            await putItem(shortCode, url);
            console.log(`DynamoDB write succeeded for shortCode: ${shortCode}`);
            success = true; // Write succeeded!
            break; // Exit the loop
        } catch (error) {
            // Check if the error is a collision error
            if (error instanceof ConditionalCheckFailedException) {
                // Collision found, log it and the loop will retry with a new code
                console.warn(`Collision detected for shortCode: ${shortCode}. Retrying...`);
                continue;
            } else {
                // It's a different error (e.g., IAM, network), re-throw it
                console.error('Database write error:', error);
                return { statusCode: 500, body: JSON.stringify({ message: 'Database error during write.' }) };
            }
        }
    }

    if (!success) {
        return { statusCode: 507, body: JSON.stringify({ message: `Failed to generate a unique shortCode after ${MAX_RETRIES} attempts.` }) };
    }

    // 3. Store in Redis Cache (After successful DynamoDB write)
    if (redisClient) {
        try {
            // Check that redisClient is a functional object before calling set
            if (typeof redisClient.set === 'function') {
                console.log(`Storing in Redis: ${shortCode} -> ${url}`);
                await redisClient.set(shortCode, url, 'EX', 3600); // Set expiration to 1 day
                console.log(`Redis SET operation succeeded for code: ${shortCode}`); // Log Redis set success
            } else {
                console.error('Redis client object is not configured correctly for SET operation.');
            }
        } catch (cacheError) {
            console.error('Redis cache error during SET operation:', cacheError);
            // This is a cache failure, we proceed with success response.
        }
    }

    // 3. Success Response (using the successfully generated shortCode)
    const requestContext = event.requestContext || {};
        
    // Safely access properties, providing fallbacks for local testing
    const apiId = requestContext.apiId || process.env.API_GATEWAY_ID || 'local-api-id'; 
    const region = process.env.AWS_REGION || 'us-east-1'; 
    const stage = requestContext.stage || 'dev'; 
        
    const shortUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/${shortCode}`;
    
    return { 
        statusCode: 201, 
        body: JSON.stringify({ shortCode, longUrl: url, shortUrl }),
        headers: { 'Content-Type': 'application/json' }
    };
};