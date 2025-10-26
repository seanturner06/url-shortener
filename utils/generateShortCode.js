// @ts-check
const crypto = require('crypto');

// Base62 Alphabet (0-9, A-Z, a-z)
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE_LENGTH = ALPHABET.length; // 62
const SHORT_CODE_LENGTH = 7; 

/**
 * Generates a short code for a given URL.
 * @returns {string} - A short code derived from the URL.
 */
function generateShortCode(length= SHORT_CODE_LENGTH) {
    let result = '';
    
    // To ensure unbiased randomness for 7 characters (approx 41.65 bits), 
    // we generate a block of 10 random bytes (80 bits) as the source.
    const bytesToGenerate = 10; 
    
    // 1. Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(bytesToGenerate);

    // 2. Map the random bytes (0-255) to Base62 characters (0-61)
    for (const byte of randomBytes) {
        // Modulo operation maps the 256 possibilities down to 62
        const index = byte % BASE_LENGTH;
        result += ALPHABET[index];

        // Stop once the target length is reached
        if (result.length === length) {
            return result;
        }
    }
    
    // Fallback: should not be hit with 10 bytes of input
    return result.slice(0, length);
}

module.exports = {
    generateShortCode
};
