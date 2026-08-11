/**
 * Email Service - Gmail SMTP via nodemailer
 * Gratis menggunakan Gmail SMTP (500 email/hari)
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send subscription confirmation email
 */
async function sendSubscriptionConfirmed(email, name, plan, endDate) {
  try {
    const transporter = getTransporter();
    const planLabel = plan === 'annual' ? 'Pro Tahunan' : 'Pro Bulanan';
    const endDateStr = new Date(endDate).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    await transporter.sendMail({
      from: `"Expense Tracker Pro" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ Langganan Berhasil Diaktifkan - Expense Tracker Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">Selamat, ${name}!</h2>
          <p>Langganan <strong>${planLabel}</strong> Anda telah berhasil diaktifkan.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Paket:</strong> ${planLabel}</p>
            <p><strong>Aktif hingga:</strong> ${endDateStr}</p>
            <p><strong>Fitur:</strong> Pengguna tak terbatas, pengeluaran tak terbatas, laporan & analitik</p>
          </div>
          <p>Buka aplikasi: <a href="https://expense-tracker-pro-h4ru.vercel.app">Expense Tracker Pro</a></p>
          <hr>
          <p style="color: #6B7280; font-size: 12px;">Jika ada pertanyaan, balas email ini.</p>
        </div>
      `
    });

    logger.info('Subscription email sent', { email, plan });
  } catch (error) {
    logger.error('Failed to send subscription email', { error: error.message, email });
    // Non-critical — don't throw, just log
  }
}

/**
 * Send trial ending reminder (3 days before)
 */
async function sendTrialReminder(email, name, trialEndDate) {
  try {
    const transporter = getTransporter();
    const endDateStr = new Date(trialEndDate).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    await transporter.sendMail({
      from: `"Expense Tracker Pro" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '⏰ Trial Anda berakhir dalam 3 hari - Expense Tracker Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Halo, ${name}!</h2>
          <p>Trial gratis Anda akan berakhir pada <strong>${endDateStr}</strong>.</p>
          <p>Upgrade sekarang untuk tetap bisa menggunakan semua fitur:</p>
          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>💎 <strong>Pro Bulanan</strong> — Rp 25.000/bulan</p>
            <p>🏆 <strong>Pro Tahunan</strong> — Rp 250.000/tahun (hemat 17%)</p>
          </div>
          <a href="https://expense-tracker-pro-h4ru.vercel.app/settings"
             style="background: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Upgrade Sekarang
          </a>
          <hr>
          <p style="color: #6B7280; font-size: 12px;">Bayar dengan QRIS, GoPay, OVO, DANA, atau transfer bank.</p>
        </div>
      `
    });

    logger.info('Trial reminder email sent', { email });
  } catch (error) {
    logger.error('Failed to send trial reminder', { error: error.message, email });
  }
}

/**
 * Send invite code email
 */
async function sendInviteCode(ownerEmail, employeeEmail, code, businessName) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Expense Tracker Pro" <${process.env.SMTP_USER}>`,
      to: employeeEmail,
      subject: `Undangan bergabung ke ${businessName} - Expense Tracker Pro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Anda diundang bergabung!</h2>
          <p><strong>${ownerEmail}</strong> mengundang Anda bergabung ke <strong>${businessName}</strong> di Expense Tracker Pro.</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px;">Kode Undangan:</p>
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1D4ED8; margin: 10px 0;">${code}</p>
          </div>
          <p>Cara bergabung:</p>
          <ol>
            <li>Buka <a href="https://expense-tracker-pro-h4ru.vercel.app">Expense Tracker Pro</a></li>
            <li>Pilih "Daftar sebagai Karyawan"</li>
            <li>Masukkan kode undangan di atas</li>
          </ol>
        </div>
      `
    });

    logger.info('Invite email sent', { employeeEmail, code });
  } catch (error) {
    logger.error('Failed to send invite email', { error: error.message });
  }
}

module.exports = { sendSubscriptionConfirmed, sendTrialReminder, sendInviteCode };
