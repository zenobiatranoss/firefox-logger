const sensitiveHeaders = new Set([
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-access-token",
    "x-refresh-token"
]);
const sensitiveKeys = new Set([
    "password",
    "passwd",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "apikey",
    "secret",
    "client_secret",
    "private_key",
    "session",
    "sessionid",
    "session_id",
    "cookie",
    "set-cookie"
]);
export function sanitizeHeaders(headers = []) {
    return headers.map(header => {
        if (sensitiveHeaders.has(header.name.toLowerCase())) {
            return {
                name: header.name,
                value: "[REDACTED]"
            };
        }
        return {
            name: header.name,
            value: header.value
        };
    });
}
export function sanitizeData(data) {
    return sanitizeValue(data);
}
function sanitizeValue(value, key) {
    if (key && sensitiveKeys.has(key.toLowerCase())) {
        return "[REDACTED]";
    }
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }
    if (value && typeof value === "object") {
        const result = {};
        for (const [childKey, childValue] of Object.entries(value)) {
            result[childKey] = sanitizeValue(childValue, childKey);
        }
        return result;
    }
    return value;
}
