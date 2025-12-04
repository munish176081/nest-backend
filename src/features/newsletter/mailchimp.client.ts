import axios from 'axios';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MailchimpClient {
  private readonly apiKey = process.env.MAILCHIMP_API_KEY;
  private readonly serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  private readonly audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  private getSubscriberHash(email: string) {
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  private getAuthHeader() {
    const token = Buffer.from(`anystring:${this.apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async addMember(name: string, email: string) {
    const subscriberHash = this.getSubscriberHash(email);
    const url = `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${this.audienceId}/members/${subscriberHash}`;

    const payload = {
      email_address: email,
      status: 'subscribed',
      merge_fields: { FNAME: name || '' },
      email_type: 'html',
    };

    try {
      // 1️⃣ Try GET to see if subscriber exists
      const response = await axios.get(url, { headers: this.getAuthHeader() });
      const subscriber = response.data;
      if (subscriber.status === 'subscribed') {
        // Already subscribed
        return { success: false, message: 'Email is already subscribed' };
      }
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        // Subscriber does not exist → create new
        await axios.post(
          `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${this.audienceId}/members`,
          payload,
          { headers: this.getAuthHeader() },
        );
        return { success: true, message: 'Subscribed successfully' };
      } else {
        // Other errors
        console.error('Mailchimp error:', err.response?.data || err);
        return {
          success: false,
          message: err.response?.data?.detail || 'Failed to subscribe',
        };
      }
    }
  }
}
