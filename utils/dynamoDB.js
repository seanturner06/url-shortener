const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize clients outside the function handler for connection reuse (best practice)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TableName = process.env.URL_TABLE_NAME;

/**
 * Writes the short code and original URL mapping to DynamoDB.
 * @param {string} shortCode
 * @param {string} originalUrl
 * @returns {Promise<void>}
 */
async function putItem(shortCode, originalUrl) {
    const command = new PutCommand({
        TableName,
        Item: {
            shortCode,
            originalUrl,
            createdAt: new Date().toISOString(), 
            expiration: Math.floor(Date.now() / 1000) + 30*24*60*60, // 30 days from now
            click_count:0,
        },
        // ConditionCheck: Only execute the PutItem if an item with this shortCode (PK) 
        // does not yet exist.
        ConditionExpression: "attribute_not_exists(shortCode)", 
    });
    // This is "synchronous": the handler waits for this promise to resolve
    await docClient.send(command);
}

/**
 * Retrieves the original URL based on the short code.
 * @param {string} shortCode
 * @returns {Promise<string|null>} The original URL or null if not found.
 */
async function getItem(shortCode) {
    const command = new GetCommand({
        TableName,
        Key: { shortCode },
    });
    
    const response = await docClient.send(command);
    
    return response.Item ? response.Item.originalUrl : null;
}

/**
 * Updates the click count for a given short code.
 * @param {string} shortCode
 * @returns {Promise<void>}
 */
async function incrementClickCount(shortCode) {
    const command = new UpdateCommand({
        TableName, 
        Key: { shortCode },
        ExpressionAttributeNames: {
            '#cc': 'click_count'
        },
        ExpressionAttributeValues: {
            ':inc': 1
        },
        UpdateExpression: 'ADD #cc :inc',
    });
    // Don't await this, for faster redirects
    await docClient.send(command).catch(err => {
        console.error('Failed to update click count:', err);
    });
}


module.exports = {
    putItem,
    getItem,
    incrementClickCount,
};