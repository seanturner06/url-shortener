const { getItem } = require('../utils/dynamoDB');

exports.handler = async (event) => {
    // 1. Get Short Code from Path
    const shortCode = event.pathParameters ? event.pathParameters.shortCode : null;

    if (!shortCode) {
        return { statusCode: 400, body: 'Missing short code.' };
    }

    try {
        // SYNCHRONOUS READ: Handler waits here for DynamoDB lookup
        const originalUrl = await getItem(shortCode);

        if (originalUrl) {
            // 2. Perform Redirect
            return {
                statusCode: 302, // The critical HTTP Redirect code
                headers: {
                    'Location': originalUrl, // Tells the browser where to go
                    'Cache-Control': 'max-age=3600, public' // Cache the redirect for fast re-visits
                },
                body: '' // Body is optional for a 302 redirect
            };
        } else {
            // 3. Not Found
            return { statusCode: 404, body: 'URL not found.' };
        }
    } catch (error) {
        console.error('Redirect Handler Error:', error);
        return { statusCode: 500, body: 'Internal server error during redirect.' };
    }
};