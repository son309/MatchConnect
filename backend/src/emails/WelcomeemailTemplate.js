export function createWelcomeEmailTemplate(name, clientURL) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome</title>
  </head>

  <body style="
    font-family: Arial, sans-serif;
    background-color: #ffe4ec;
    margin: 0;
    padding: 20px;
  ">
    <table width="100%" cellpadding="0" cellspacing="0" style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
    ">
      <!-- Header -->
      <tr>
        <td style="
          background-color: #f472b6;
          padding: 30px 20px;
          text-align: center;
        ">
          <h2 style="margin: 0; color: #ffffff;">
            Welcome to IT4409 Messenger
          </h2>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding: 30px; color: #333;">
          <p style="font-size: 16px;">
            Hi <strong>${name}</strong>,
          </p>

          <p>
            Thank you for joining <strong>CHATWEB with team 24</strong>.
            We are glad to have you here.
          </p>

          <div style="
            background-color: #fff0f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          ">
            <p style="margin-top: 0; font-weight: bold;">
              You can start by:
            </p>
            <ul style="padding-left: 20px; margin: 0;">
              <li>Updating your profile</li>
              <li>Finding friends by email</li>
              <li>Starting your first chat</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${clientURL}" style="
              background-color: #ec4899;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 28px;
              border-radius: 20px;
              font-weight: bold;
              display: inline-block;
            ">
              Go to Application
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            If you have any problems, feel free to contact us.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="
          background-color: #fce7f3;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #777;
        ">
          <p style="margin: 0;">
            © 2025 IT4409 Messenger
          </p>
          <p style="margin: 5px 0 0;">
            This email was sent from the system
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
