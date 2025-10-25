const { isIP } = require('net');
const dns = require('dns').promises;

async function validateUrl(url) {
    let parsed; 

    try {
        parsed = new URL(url); 
    } catch (error) {
        return { valid: false, reason: 'Invalid URL' };
    }

    const hostName = parsed.hostname.toLowerCase(); 

    // Basic checks for valid protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, reason: 'Invalid protocol' };
    }
    
    // Block auth 
    if (parsed.username || parsed.password) {
        return { valid: false, reason: 'URL with authentication is not allowed' };
    }

    // IP validation 
    if(isIP(hostName)) {
        if(!isPublicIp(hostName)) {
            return { valid: false, reason: 'Private or invalid IP address' };
        }
    } else {
        // Domain validation via DNS lookup
        let ipv4Addresses = []; 
        let ipv6Addresses = [];

        try {
            ipv4Addresses = await dns.resolve4(hostName);
        } catch (error) {
            if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
                return { valid: false, reason: 'DNS resolution error' };
            }
        }

        try {
            ipv6Addresses = await dns.resolve6(hostName);
        } catch (error) {
            if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
                return { valid: false, reason: 'DNS resolution error' };
            }
        }

        if(ipv4Addresses.length === 0 && ipv6Addresses.length === 0) {
            return { valid: false, reason: 'Domain does not resolve' };
        }

        for( const ip of [...ipv4Addresses, ...ipv6Addresses]) {
            if(!isPublicIp(ip)) {
                return { valid: false, reason: 'Domain resolves to private IP address' };
            }
        }
    }

    return { valid: true };
}

function isPublicIp(ip) {
    if(ip.includes(':')) {
        return isPublicIpv6(ip);
    }

    const parts = ip.split('.').map(Number); 
    if(parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
        return false;
    }

    const [a, b] = parts;

    // Block private IP ranges
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 0 || a === 255) return false;
    if (a >= 224) return false;

    return true;
}

function isPublicIpv6(ip) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return false;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
    if (lower.startsWith('fe80:')) return false;
    if (lower.startsWith('ff')) return false;
    return true;
}

module.exports = {
    validateUrl,
};