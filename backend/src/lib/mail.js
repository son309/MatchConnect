// import nodemailer from "nodemailer";
import { Resend } from "resend";
import { ENV } from "./env.js";

// export const transporter = nodemailer.createTransport({
//   host: ENV.EMAIL_HOST, 
//   port: parseInt(ENV.EMAIL_PORT), 
//   secure: true, 
//   auth: {
//     user: ENV.EMAIL_USER, 
//     pass: ENV.EMAIL_PASS,
//   },
// });

export const resend = new Resend(ENV.RESEND_API_KEY); 