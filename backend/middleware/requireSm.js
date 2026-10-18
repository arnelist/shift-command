// Only shift managers may open the dashboard (HTTP Basic authentication).
// Accounts come from the SM_USERS environment variable
const crypto = require("crypto");

function parseUsers(value) {
    const users = {};
    (value || "").split(",").filter(Boolean).forEach(pair => {
        const [name, ...rest] = pair.split(":");
        users[name.trim()] = rest.join(":");
    });
    return users;
}

const users = parseUsers(process.env.SM_USERS);

// Compares in constant time, so the response time doesn't reveal how much of the password matched
function safeEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function requireSm(req, res, next) {
    const [scheme, encoded] = (req.headers.authorization || "").split(" ");

    if (scheme === "Basic" && encoded) {
        const [name, ...rest] = Buffer.from(encoded, "base64").toString().split(":");
        const password = rest.join(":");

        if (users[name] !== undefined && safeEqual(password, users[name])) {
            return next();
        }
    }

    res.set("WWW-Authenticate", 'Basic realm="Shift Command", charset="UTF-8"');
    res.status(401).send("Authentication required");
}

module.exports = { requireSm };