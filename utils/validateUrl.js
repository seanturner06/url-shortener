async function validateUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch (error) {
        return false;
    }
}

module.exports = {
    validateUrl,
};