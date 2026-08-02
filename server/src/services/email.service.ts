import { Resend } from "resend";
import { logger } from "../utils/logger";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_dev");

export class EmailService {
  async sendEventReminder(to: string, eventTitle: string, minutesBefore: number, eventTime: Date) {
    try {
      const timeStr = minutesBefore >= 60 
        ? `${Math.floor(minutesBefore / 60)} hours` 
        : `${minutesBefore} minutes`;

      logger.info(`?? Sending event reminder to ${to} for "${eventTitle}"`);
      
      if (!process.env.RESEND_API_KEY) {
        logger.warn("?? No RESEND_API_KEY found, skipping actual email send.");
        return;
      }

      await resend.emails.send({
        from: "Nexus AI <reminders@nexus.ai>", // Update this to your verified domain
        to,
        subject: `Reminder: ${eventTitle} is in ${timeStr}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Event Reminder</h2>
            <p>Your event <strong>${eventTitle}</strong> is starting in ${timeStr}!</p>
            <p><strong>Scheduled Time:</strong> ${eventTime.toLocaleString()}</p>
            <br/>
            <p style="color: #666; font-size: 12px;">This is an automated reminder from your Nexus Calendar.</p>
          </div>
        `
      });
    } catch (error: any) {
      logger.error("Failed to send email reminder", { error: error.message });
    }
  }
  async sendWelcomeEmail(to: string, name: string) {
    try {
      logger.info(`📧 Sending welcome email to ${to}`);
      
      if (!process.env.RESEND_API_KEY) {
        logger.warn("⚠️ No RESEND_API_KEY found, skipping actual email send.");
        return;
      }

      await resend.emails.send({
        from: "Nexus AI <welcome@nexus.ai>", 
        to,
        subject: `Welcome to Nexus AI, ${name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome, ${name}!</h2>
            <p>We're excited to help you take control of your finances with AI.</p>
            <p>Log in to your dashboard to set up your first goal, budget, and tracking preferences.</p>
            <br/>
            <p style="color: #666; font-size: 12px;">This is an automated welcome message from Nexus AI.</p>
          </div>
        `
      });
    } catch (error: any) {
      logger.error("Failed to send welcome email", { error: error.message });
    }
  }
}

export const emailService = new EmailService();
