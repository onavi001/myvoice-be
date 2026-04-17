
import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS } from "../config";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}


// Sends an email using the configured provider
export async function sendEmail({ to, subject, html }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // O usa otro servicio como SendGrid
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });


  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
}