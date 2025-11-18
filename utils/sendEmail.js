const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');


const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.GOOGLE_USER,
      pass: process.env.GOOGLE_NODEMAILER_AUTH_PASSWORD,
    },
  });


const getEmailTemplate = (templateName, variables) => {
    const templatePath = path.join(__dirname, '../public/email-templates', templateName);
    
    try {
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // Replace all variables in the template
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(regex, variables[key]);
        });
        
        return template;
    } catch (error) {
        console.error('Error reading email template:', error);
        throw new Error('Failed to load email template');
    }
};

/**
 * Generic email sending function - can be used for any email template
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.template - Template file name
 * @param {Object} options.variables - Template variables
 * @returns {Promise}
 */
const sendEmail = async ({ to, subject, template, variables = {} }) => {
    try {
        // Add default variables
        const templateVars = {
            ...variables,
            appName: process.env.FROM_NAME || 'Ecommerce API',
            currentYear: new Date().getFullYear()
        };
        
        // Get email template
        const htmlContent = getEmailTemplate(template, templateVars);
        
        // Email options
        const fromEmail = process.env.FROM_EMAIL || process.env.GOOGLE_USER;
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'Ecommerce API'}" <${fromEmail}>`,
            to: to,
            subject: subject,
            html: htmlContent
        };
        
        // Send email using the global transporter
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send password reset email (convenience function that uses sendEmail internally)
 * This is a wrapper around sendEmail() specifically for password reset emails
 * @param {Object} options - Email options
 * @param {String} options.email - Recipient email
 * @param {String} options.name - Recipient name
 * @param {String} options.resetToken - Password reset token
 * @returns {Promise}
 */
const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
    // Construct reset URL with query parameter
    // const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?key=${resetToken}`;
    const resetUrl = `http://localhost:3001/auth/reset-password?key=${resetToken}`;

    // Use the generic sendEmail function with password reset specific parameters
    return await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        template: 'password-reset.html',
        variables: {
            userName: name,
            resetUrl: resetUrl
        }
    });
};

module.exports = {
    sendPasswordResetEmail,
    sendEmail
};

