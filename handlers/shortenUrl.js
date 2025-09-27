const { generateShortCode } = require('../utils/generateShortCode');
const { putItem } = require('../utils/dynamoDB');
const { ConditionalCheckFailedException } = require('@aws-sdk/client-dynamodb'); // Import specific error

const MAX_RETRIES = 5;

exports.handler = async (event) => {
    console.log(event.body); 
    const { url } = JSON.parse(event.body || '{}');

    if(!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing "url" in request body.' }),
        };
    }

    // 2. Business Logic & Persistence with Retry Loop
    let shortCode;
    let success = false;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        shortCode = generateShortCode();
        try {
            // Attempt to write the unique code
            await putItem(shortCode, url);
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

    // 3. Success Response (using the successfully generated shortCode)
    const apiId = event.requestContext.apiId;
    const region = process.env.AWS_REGION;
    const stage = process.env.NODE_ENV || 'dev'; 
    
    const shortUrl = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/${shortCode}`;
    
    return { 
        statusCode: 201, 
        body: JSON.stringify({ shortCode, longUrl: url, shortUrl }),
        headers: { 'Content-Type': 'application/json' }
    };
};