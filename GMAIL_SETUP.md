# Gmail Email Setup Guide

This guide will help you configure Gmail to send emails from your application.

## Prerequisites

1. A Gmail account
2. 2-Step Verification enabled on your Google Account

## Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable 2-Step Verification (if not already enabled)

## Step 2: Generate App Password

1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
   - If you don't see "App passwords", make sure 2-Step Verification is enabled
3. Select **Mail** as the app
4. Select **Other (Custom name)** as the device
5. Enter a name like "Ecommerce Backend" or "Node.js App"
6. Click **Generate**
7. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

## Step 3: Configure Environment Variables

Add the following to your `.env` file:

```env
# Gmail Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # The 16-character app password (no spaces)
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Ecommerce API
CLIENT_URL=http://localhost:3000
```

**Important Notes:**
- Use the **App Password**, not your regular Gmail password
- Remove any spaces from the app password
- The `GMAIL_USER` should be your full Gmail address
- The `FROM_EMAIL` can be the same as `GMAIL_USER` or left empty (it will default to `GMAIL_USER`)

## Step 4: Test the Configuration

After setting up, test the forgot password endpoint:

```bash
POST /api/auth/forgotpassword
{
  "email": "user@example.com"
}
```

If configured correctly, the user should receive a password reset email.

## Troubleshooting

### Error: "Invalid login"
- Make sure you're using the App Password, not your regular Gmail password
- Verify the App Password has no spaces
- Ensure 2-Step Verification is enabled

### Error: "Less secure app access"
- Gmail no longer supports "Less secure app access"
- You **must** use App Passwords instead
- Make sure 2-Step Verification is enabled

### Error: "Connection timeout"
- Check your internet connection
- Verify firewall settings allow outbound connections on port 587
- Try using port 465 with `secure: true` (requires code modification)

### Emails going to spam
- This is normal for new email senders
- Consider setting up SPF and DKIM records for your domain
- For production, consider using a professional email service like SendGrid or AWS SES

## Alternative: Using OAuth2 (Advanced)

For production applications, consider using OAuth2 instead of App Passwords for better security. This requires additional setup with Google Cloud Console.

