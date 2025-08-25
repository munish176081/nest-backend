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
exports.UploadRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const upload_entity_1 = require("./entities/upload.entity");
let UploadRepository = class UploadRepository {
    constructor(uploadRepository) {
        this.uploadRepository = uploadRepository;
    }
    async create(uploadData) {
        const upload = this.uploadRepository.create(uploadData);
        return await this.uploadRepository.save(upload);
    }
    async findById(id) {
        return await this.uploadRepository.findOne({ where: { id } });
    }
    async findByUploadId(uploadId) {
        return await this.uploadRepository.findOne({ where: { uploadId } });
    }
    async findByFinalUrl(finalUrl) {
        return await this.uploadRepository.findOne({ where: { finalUrl } });
    }
    async findByUrlPattern(urlPattern) {
        return await this.uploadRepository
            .createQueryBuilder('upload')
            .where('upload.finalUrl LIKE :urlPattern', { urlPattern: `%${urlPattern}%` })
            .getMany();
    }
    async findByUserId(userId) {
        return await this.uploadRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }
    async update(id, updateData) {
        await this.uploadRepository.update(id, updateData);
        return await this.findById(id);
    }
    async updateByUploadId(uploadId, updateData) {
        await this.uploadRepository.update({ uploadId }, updateData);
        return await this.findByUploadId(uploadId);
    }
    async delete(id) {
        await this.uploadRepository.delete(id);
    }
    async findPendingUploads() {
        return await this.uploadRepository.find({
            where: { status: 'pending' },
            order: { createdAt: 'ASC' }
        });
    }
    async findCompletedUploads() {
        return await this.uploadRepository.find({
            where: { status: 'completed' },
            order: { createdAt: 'DESC' }
        });
    }
    async findAll() {
        return await this.uploadRepository.find({
            order: { createdAt: 'DESC' }
        });
    }
};
exports.UploadRepository = UploadRepository;
exports.UploadRepository = UploadRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(upload_entity_1.Upload)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UploadRepository);
//# sourceMappingURL=upload.repository.js.map