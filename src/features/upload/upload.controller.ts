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
  Res,
  Query,
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

  @Post('bulk-delete')
  @UseGuards(LoggedInGuard)
  async bulkDeleteUploads(
    @Body() body: { fileUrls: string[] },
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const results = await this.uploadService.deleteMultipleUploadsByUrls(body.fileUrls, userId);
    
    // Return success: false if any files failed to delete
    const success = results.failed.length === 0;
    
    return { 
      success,
      message: `Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    };
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

  @Get('proxy/image')
  async proxyImage(@Query('url') imageUrl: string, @Res() res: any) {
    this.logger.log(`Proxy image request received for URL: ${imageUrl}`);
    
    if (!imageUrl) {
      this.logger.warn('Proxy image request missing URL parameter');
      return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
      // Validate that the URL is from our domains
      const allowedDomains = ['cdn.pups4sale.com.au', 'pups4sale.com.au', 'www.pups4sale.com.au'];
      const isAllowedDomain = allowedDomains.some(domain => imageUrl.includes(domain));
      
      if (!isAllowedDomain) {
        this.logger.warn(`Invalid image URL (not from allowed domain): ${imageUrl}`);
        return res.status(403).json({ error: 'Invalid image URL' });
      }

      this.logger.log(`Fetching image from R2: ${imageUrl}`);
      
      // Fetch the image from R2
      const response = await fetch(imageUrl);
      
      this.logger.log(`R2 response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        this.logger.error(`Failed to fetch image from R2: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }

      // Get the content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      this.logger.log(`Serving image with content-type: ${contentType}`);
      
      // Set CORS headers
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });

      // Stream the image data
      const buffer = await response.arrayBuffer();
      this.logger.log(`Image buffer size: ${buffer.byteLength} bytes`);
      
      res.send(Buffer.from(buffer));
      this.logger.log('Image served successfully');
      
    } catch (error) {
      this.logger.error('Error proxying image:', error);
      res.status(500).json({ error: 'Failed to proxy image' });
    }
  }

  @Get('proxy/test')
  async proxyTest(@Res() res: any) {
    this.logger.log('Proxy test endpoint called');
    res.json({ message: 'Proxy endpoint is working', timestamp: new Date().toISOString() });
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