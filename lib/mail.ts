import nodemailer from "nodemailer"

const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
}

const transporter = nodemailer.createTransport(smtpConfig)

export async function sendEmail({
    from = process.env.SMTP_FROM || '"ACR Library" <noreply@acr.ac.th>',
    to,
    subject,
    html,
}: {
    from?: string
    to: string
    subject: string
    html: string
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP_USER or SMTP_PASS not set. Email not sent.")
        console.log("To:", to)
        console.log("Subject:", subject)
        console.log("Body:", html)
        return
    }

    try {
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html,
        })
        console.log("Message sent: %s", info.messageId)
        return info
    } catch (error) {
        console.error("Error sending email:", error)
        throw error // re-throw so the caller knows it failed
    }
}
