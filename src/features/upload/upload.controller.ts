import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('request-url')
  @UseGuards(LoggedInGuard)
  async requestUploadUrl(
    @Body() dto: RequestUploadUrlDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const uploadUrl = await this.uploadService.requestUploadUrl(dto, userId);
    console.log(uploadUrl);
    return uploadUrl;
  }

  @Post('complete')
  @UseGuards(LoggedInGuard)
  async completeUpload(
    @Body() dto: CompleteUploadDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return await this.uploadService.completeUpload(dto, userId);
  }

  @Get('my-uploads')
  @UseGuards(LoggedInGuard)
  async getUserUploads(@Request() req: any) {
    const userId = req.user?.id;
    return await this.uploadService.getUserUploads(userId);
  }

  @Delete(':uploadId')
  @UseGuards(LoggedInGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUpload(
    @Param('uploadId') uploadId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    await this.uploadService.deleteUpload(uploadId, userId);
  }

  // Public endpoint for requesting upload URL (for anonymous uploads)
  @Post('public/request-url')
  async requestPublicUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return await this.uploadService.requestUploadUrl(dto);
  }

  // Public endpoint for completing upload (for anonymous uploads)
  @Post('public/complete')
  async completePublicUpload(@Body() dto: CompleteUploadDto) {
    return await this.uploadService.completeUpload(dto);
  }
} 