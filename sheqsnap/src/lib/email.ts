import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function sendChecklistReminder(
  assignment: { id: string; dueDate: Date },
  user: { name: string; email: string },
  template: { title: string; category: string },
  type: 'day-before' | 'day-of'
) {
  const transporter = createTransporter()
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const link = `${baseUrl}/checklists/${assignment.id}`
  const dueDateStr = assignment.dueDate.toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const subject = type === 'day-before'
    ? `Reminder: "${template.title}" checklist due tomorrow`
    : `Due today: "${template.title}" checklist`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">SHEQSnap</h1>
        <p style="color: #bbf7d0; margin: 4px 0 0;">Safety & Compliance Platform</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; margin-top: 0;">
          ${type === 'day-before' ? '⏰ Checklist Due Tomorrow' : '🔴 Checklist Due Today'}
        </h2>
        <p style="color: #374151;">Hi ${user.name},</p>
        <p style="color: #374151;">
          ${type === 'day-before'
            ? `This is a reminder that you have a checklist due <strong>tomorrow</strong>.`
            : `Your checklist is due <strong>today</strong>. Please complete it as soon as possible.`
          }
        </p>
        <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; color: #111827;"><strong>${template.title}</strong></p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Category: ${template.category}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Due: ${dueDateStr}</p>
        </div>
        <a href="${link}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 8px 0;">
          Complete Checklist
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          This is an automated reminder from SHEQSnap. Do not reply to this email.
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'SHEQSnap <noreply@sheqsnap.co.za>',
    to: user.email,
    subject,
    html,
  })
}
