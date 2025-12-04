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

  private async fetchJson(url: string, options: any) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);

    return { ok: res.ok, status: res.status, data };
  }

  async addMember(name: string, email: string) {
    const subscriberHash = this.getSubscriberHash(email);
    const baseUrl = `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${this.audienceId}/members`;
    const memberUrl = `${baseUrl}/${subscriberHash}`;

    const payload = {
      email_address: email,
      status: "subscribed",
      merge_fields: { FNAME: name || "" },
      email_type: "html",
    };

    // 1️⃣ GET subscriber → check existence
    const getRes = await this.fetchJson(memberUrl, {
      method: "GET",
      headers: this.getAuthHeader(),
    });

    // 👉 If exists
    if (getRes.ok) {
      const subscriber = getRes.data;

      if (subscriber.status === "subscribed") {
        return { success: false, message: "Email is already subscribed" };
      }

      // ❗ Exists but unsubscribed → update via PUT
      const putRes = await this.fetchJson(memberUrl, {
        method: "PUT",
        headers: this.getAuthHeader(),
        body: JSON.stringify(payload),
      });

      if (putRes.ok) {
        return { success: true, message: "Subscribed successfully" };
      }

      return {
        success: false,
        message: putRes.data?.detail || "Failed to update subscriber",
      };
    }

    // 2️⃣ If GET → 404 means "not found" → create with POST
    if (getRes.status === 404) {
      const postRes = await this.fetchJson(baseUrl, {
        method: "POST",
        headers: this.getAuthHeader(),
        body: JSON.stringify(payload),
      });

      if (postRes.ok) {
        return { success: true, message: "Subscribed successfully" };
      }

      return {
        success: false,
        message: postRes.data?.detail || "Failed to subscribe",
      };
    }

    // 3️⃣ Other errors
    return {
      success: false,
      message: getRes.data?.detail || "Mailchimp request failed",
    };
  }
}