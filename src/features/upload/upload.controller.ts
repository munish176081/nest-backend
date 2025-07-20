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
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { DeleteUploadByUrlDto } from './dto/delete-upload-by-url.dto';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Controller('uploads')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

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

  @Get('debug/all')
  @UseGuards(LoggedInGuard)
  async getAllUploads() {
    return await this.uploadService.getAllUploads();
  }

  @Post('debug/test-delete')
  @UseGuards(LoggedInGuard)
  async testDelete(@Body() body: { fileUrl: string }, @Request() req: any) {
    const userId = req.user?.id;
    try {
      await this.uploadService.deleteUploadByUrl(body.fileUrl, userId);
      return { success: true, message: 'Delete successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message,
        error: error.response?.data || error
      };
    }
  }

  @Post('debug/bulk-delete')
  @UseGuards(LoggedInGuard)
  async bulkDelete(@Body() body: { fileUrls: string[] }, @Request() req: any) {
    const userId = req.user?.id;
    try {
      const results = await this.uploadService.deleteMultipleUploadsByUrls(body.fileUrls, userId);
      return { 
        success: true, 
        message: `Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`,
        results
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message,
        error: error.response?.data || error
      };
    }
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

  @Delete('by-url')
  @UseGuards(LoggedInGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUploadByUrl(
    @Body() dto: DeleteUploadByUrlDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    await this.uploadService.deleteUploadByUrl(dto.fileUrl, userId);
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