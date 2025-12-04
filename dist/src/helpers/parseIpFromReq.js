"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIpFromReq = void 0;
const requestIp = require("request-ip");
const parseIpFromReq = (req) => {
    const clientIp = requestIp.getClientIp(req);
    return clientIp;
};
exports.parseIpFromReq = parseIpFromReq;
//# sourceMappingURL=parseIpFromReq.js.map