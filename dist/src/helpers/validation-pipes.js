"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionalBoolPipe = exports.OptionalUUIDPipe = void 0;
const common_1 = require("@nestjs/common");
let OptionalUUIDPipe = class OptionalUUIDPipe extends common_1.ParseUUIDPipe {
    constructor(options) {
        super(options);
    }
    transform(value, metadata) {
        if (!value)
            return null;
        return super.transform(value, metadata);
    }
};
exports.OptionalUUIDPipe = OptionalUUIDPipe;
exports.OptionalUUIDPipe = OptionalUUIDPipe = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object])
], OptionalUUIDPipe);
let OptionalBoolPipe = class OptionalBoolPipe extends common_1.ParseBoolPipe {
    constructor(options) {
        super(options);
        if (options.default) {
            this.default = options.default;
        }
    }
    async transform(value, metadata) {
        if (!value)
            return this.default;
        return super.transform(value, metadata);
    }
};
exports.OptionalBoolPipe = OptionalBoolPipe;
exports.OptionalBoolPipe = OptionalBoolPipe = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object])
], OptionalBoolPipe);
//# sourceMappingURL=validation-pipes.js.map