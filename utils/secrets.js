const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

let cachedSecret = null;

/**
 * Retrieves a secret from AWS Secrets Manager.
 * @param {string} secretId - The ID of the secret to retrieve.
 * @returns {Promise<Object>} - The secret value as a JSON object.
 */
async function getSecret(secretId) {
    if (cachedSecret) return cachedSecret;

    const res = await client.send(
        new GetSecretValueCommand({ SecretId: secretId })
    );

    cachedSecret = JSON.parse(res.SecretString);
    console.log(`Secret ${secretId} retrieved and cached.`);
    return cachedSecret;
}

module.exports = {
    getSecret,
};
