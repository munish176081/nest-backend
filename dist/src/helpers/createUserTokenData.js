"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserTokenData = void 0;
const createUserTokenData = (user) => {
    return {
        id: user.id,
        email: user.email,
        name: user.name || user.username || 'User',
        username: user.username,
        status: user.status,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
    };
};
exports.createUserTokenData = createUserTokenData;
//# sourceMappingURL=createUserTokenData.js.map