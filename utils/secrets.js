// @ts-check
const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * @typedef {import("../types").SecretValue} SecretValue
 */

/** @type {SecretValue|null} */
let cachedSecret = null;

/**
 * Retrieves a secret from AWS Secrets Manager.
 * @param {string} secretId - The ID of the secret to retrieve.
 * @returns {Promise<SecretValue>} - The secret value as a JSON object.
 */
async function getSecret(secretId) {
    if (cachedSecret) return cachedSecret;

    const res = await client.send(
        new GetSecretValueCommand({ SecretId: secretId })
    );

    if (!res.SecretString) {
        throw new Error(`Could not find secret.`);
    }

    /** @type {SecretValue} */ 
    cachedSecret = (JSON.parse(res.SecretString));
    if (!cachedSecret) {
        throw new Error('Secret is empty or invalid JSON.');
    }
    return cachedSecret;
}

module.exports = {
    getSecret,
};
