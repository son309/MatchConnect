export function createOTPEmailTemplate(name, otp) {
  return `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: auto;
      background-color: #ffe4ec;
      padding: 20px;
      border-radius: 8px;
    ">
      
      <h3 style="text-align: center; color: #b91c1c;">
        OTP Verification
      </h3>

      <p style="color: #333;">Hi <b>${name}</b>,</p>

      <p style="color: #444;">
        You requested to reset your password.
        Please use the OTP code below:
      </p>

      <div style="
        margin: 20px 0;
        padding: 14px;
        background-color: #fff;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 5px;
        border-radius: 6px;
        color: #e11d48;
      ">
        ${otp}
      </div>

      <p style="font-size: 14px; color: #555;">
        This code is valid for 10 minutes.
        If you did not request this, please ignore this email.
      </p>

      <p style="font-size: 12px; color: #777;">
        Thanks,
        <br />
        Web Project Team
      </p>
    </div>
  `;
}
