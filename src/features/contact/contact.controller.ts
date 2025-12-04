import { Body, Controller, Post, Query, Get } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async submitContact(@Body() body: ContactDto) {
    return this.contactService.submitContactForm(body);
  }

  @Get('enquiries')
  async getEnquiries(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.contactService.getAllEnquiries(+page, +limit);
  }
}
