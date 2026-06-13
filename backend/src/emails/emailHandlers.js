// import { transporter } from "../lib/mail.js";
// import { createWelcomeEmailTemplate } from "./WelcomeemailTemplate.js";
// import { createOTPEmailTemplate } from "./OTPEmailTemplate.js";
// import { ENV } from "../lib/env.js";

// export const sendWelcomeEmail = async (email, name, clientURL) => {
//   try {
//     await transporter.sendMail({
//       from: `"Team 24 of IT4409" <${ENV.EMAIL_USER}>`, 
//       to: email,
//       subject: "Welcome to ChatWeb",
//       html: createWelcomeEmailTemplate(name, clientURL), 
//     });
//     console.log("Welcome Email has been successfully sent.");
//   } catch (error) {
//     console.error("Error sent welcome email:", error);
//   }
// };

// export const sendOTPEmail = async (email, name, otp) => {
//   try {
//     await transporter.sendMail({
//       from: `"Team 24 of IT4409" <${ENV.EMAIL_USER}>`,
//       to: email,
//       subject: "OTP code to reset your password",
//       html: createOTPEmailTemplate(name, otp),
//     });
//   } catch (error) {
//     console.error("Error sent mail OTP:", error);
//     throw new Error("Can't sent email OTP");
//   }
// };



import { resend } from "../lib/mail.js"; // Đảm bảo lib/mail.js đã export const resend = new Resend(...)
import { createWelcomeEmailTemplate } from "./WelcomeemailTemplate.js";
import { createOTPEmailTemplate } from "./OTPEmailTemplate.js";
import { ENV } from "../lib/env.js";


const SENDER_EMAIL = `Team 24 <no-reply@thuminhngo.id.vn>`; 

export const sendWelcomeEmail = async (email, name, clientURL) => {
  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL, 
      to: [email],
      subject: "Welcome to ChatWeb",
      html: createWelcomeEmailTemplate(name, clientURL), 
    });

    if (error) {
      return console.error("Resend Error (Welcome):", error);
    }
    
    console.log("Welcome Email sent successfully:", data.id);
  } catch (error) {
    console.error("System Error sending welcome email:", error);
  }
};

export const sendOTPEmail = async (email, name, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `Security Team <otp@thuminhngo.id.vn>`, 
      to: [email],
      subject: "OTP code to reset your password",
      html: createOTPEmailTemplate(name, otp),
    });

    if (error) {
      console.error("Resend Error (OTP):", error);
      throw new Error("Failed to send OTP email via Resend");
    }

    console.log("OTP Email sent successfully:", data.id);
  } catch (error) {
    console.error("System Error sending mail OTP:", error);
    throw new Error("Can't send email OTP");
  }
};