// =========================================================
// YazhGo — Backend server (Node.js + Express)
//
// Tariff Structure:
//  - Sedan (Etios, Swift Dzire): One-Way ₹15/km | Round-Trip ₹14/km (min 250km)
//  - SUV (Innova, Xylo, Marazzo, Ertiga): One-Way ₹20/km | Round-Trip ₹19/km (min 250km)
//  - Innova Crysta: One-Way ₹24/km | Round-Trip ₹23/km (min 250km)
// =========================================================

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const PARTNERS_FILE = path.join(__dirname, 'partners.json');

// ---------- Telegram Bot API config ----------
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ---------- Vehicle Rates (Source of Truth) ----------
const VEHICLE_RATES = {
  sedan: {
    name: 'Sedan (Dzire, Etios)',
    oneWayRate: 15,
    roundTripRate: 14,
    minKmRoundTrip: 250,
    driverBeta: 400
  },
  suv: {
    name: 'SUV (Innova, Ertiga, Xylo, Marazzo)',
    oneWayRate: 20,
    roundTripRate: 19,
    minKmRoundTrip: 250,
    driverBeta: 500
  },
  crysta: {
    name: 'Innova Crysta (Premium)',
    oneWayRate: 24,
    roundTripRate: 23,
    minKmRoundTrip: 250,
    driverBeta: 600
  },
  // Legacy aliases
  Sedan: {
    name: 'Sedan (Dzire, Etios)',
    oneWayRate: 15,
    roundTripRate: 14,
    minKmRoundTrip: 250,
    driverBeta: 400
  },
  SUV: {
    name: 'SUV (Innova, Ertiga, Xylo, Marazzo)',
    oneWayRate: 20,
    roundTripRate: 19,
    minKmRoundTrip: 250,
    driverBeta: 500
  },
  Premium: {
    name: 'Innova Crysta (Premium)',
    oneWayRate: 24,
    roundTripRate: 23,
    minKmRoundTrip: 250,
    driverBeta: 600
  }
};

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS Setup
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- File Database Helpers ----------
function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
  }
}

function generateId(prefix = 'YZG') {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${rand}`;
}

function sanitize(value) {
  return String(value || '').trim().replace(/[<>]/g, '');
}

// ---------- Telegram Notification Service ----------
async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env');
    return { sent: false, reason: 'not_configured' };
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error('[Telegram] API error:', JSON.stringify(result));
      return { sent: false, reason: 'api_error', details: result };
    }

    console.log('[Telegram] Notification sent successfully.');
    return { sent: true };
  } catch (err) {
    console.error('[Telegram] Request failed:', err.message);
    return { sent: false, reason: 'request_failed' };
  }
}

// ---------- Routes ----------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YazhGo Taxi Booking & Dispatch API',
    telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
    timestamp: new Date().toISOString()
  });
});

// 2. Create Ride Booking
app.post('/api/bookings', async (req, res) => {
  const name = sanitize(req.body.name);
  const phone = sanitize(req.body.phone);
  const pickup = sanitize(req.body.pickup);
  const drop = sanitize(req.body.drop);
  const vehicleKey = sanitize(req.body.vehicle || 'sedan');
  const tripType = sanitize(req.body.tripType || 'outstation');
  const tripMode = sanitize(req.body.tripMode || 'one-way');
  const pickupDate = sanitize(req.body.pickupDate || new Date().toISOString().split('T')[0]);
  const pickupTime = sanitize(req.body.pickupTime || 'Immediate');
  const returnDate = sanitize(req.body.returnDate || '');
  const distance = Number(req.body.distance) || 50;

  const errors = [];
  if (!name) errors.push('Customer name is required.');
  if (!/^[0-9]{10}$/.test(phone)) errors.push('Valid 10-digit phone number is required.');
  if (!pickup) errors.push('Pickup location is required.');
  if (!drop) errors.push('Drop location is required.');

  const vehicleConfig = VEHICLE_RATES[vehicleKey] || VEHICLE_RATES.sedan;

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(' ') });
  }

  // Exact Tariff Calculation based on One-Way vs Round-Trip Coverage
  let billableKm = distance;
  let ratePerKm = vehicleConfig.oneWayRate;
  let driverAllowance = vehicleConfig.driverBeta;

  if (tripMode === 'round-trip') {
    ratePerKm = vehicleConfig.roundTripRate;
    // Round trip has minimum 250 km coverage per day
    const roundDistance = distance * 2;
    billableKm = Math.max(roundDistance, vehicleConfig.minKmRoundTrip);
  }

  let totalFare = (billableKm * ratePerKm) + driverAllowance;
  const roundedFare = Math.round(totalFare / 10) * 10;
  const bookingId = generateId('YZG');

  const booking = {
    id: bookingId,
    name,
    phone,
    pickup,
    drop,
    tripType,
    tripMode,
    pickupDate,
    pickupTime,
    returnDate,
    vehicle: vehicleConfig.name,
    ratePerKm: `₹${ratePerKm}/km`,
    billableKm,
    fare: roundedFare,
    createdAt: new Date().toISOString()
  };

  // Save to file
  const bookings = readData(BOOKINGS_FILE);
  bookings.push(booking);
  writeData(BOOKINGS_FILE, bookings);

  // Send Telegram Notification to Taxi Operator
  const telegramMsg =
    `🚖 *NEW YAZHGO RIDE BOOKING!*\n\n` +
    `🎫 *Booking ID:* \`${booking.id}\`\n` +
    `👤 *Customer:* ${booking.name}\n` +
    `📞 *Phone:* [${booking.phone}](tel:${booking.phone})\n` +
    `📍 *Pickup:* ${booking.pickup}\n` +
    `🏁 *Drop:* ${booking.drop}\n` +
    `📅 *Pickup Date/Time:* ${booking.pickupDate} at ${booking.pickupTime}\n` +
    (tripMode === 'round-trip' ? `🔄 *Return Date:* ${booking.returnDate}\n` : '') +
    `🚘 *Vehicle:* ${booking.vehicle}\n` +
    `🗺️ *Mode:* ${booking.tripMode.toUpperCase()} (${booking.ratePerKm})\n` +
    `📏 *Billable Distance:* ${booking.billableKm} km\n` +
    `💰 *Estimated Total:* ₹${booking.fare}\n` +
    `⏰ *Timestamp:* ${new Date().toLocaleString('en-IN')}\n\n` +
    `👉 Contact customer now to assign driver and confirm cab.`;

  const telegramResult = await sendTelegramMessage(telegramMsg);

  res.status(201).json({
    success: true,
    message: 'Booking request created successfully.',
    booking,
    telegramNotified: telegramResult.sent
  });
});

// 3. Driver Partner Registration Endpoint
app.post('/api/partners', async (req, res) => {
  const name = sanitize(req.body.name);
  const phone = sanitize(req.body.phone);
  const city = sanitize(req.body.city);
  const carModel = sanitize(req.body.carModel);
  const carNumber = sanitize(req.body.carNumber);

  if (!name || !phone || !city || !carModel || !carNumber) {
    return res.status(400).json({ success: false, message: 'All partner fields are required.' });
  }

  const partnerId = generateId('DRV');
  const partner = {
    id: partnerId,
    name,
    phone,
    city,
    carModel,
    carNumber,
    createdAt: new Date().toISOString()
  };

  const partners = readData(PARTNERS_FILE);
  partners.push(partner);
  writeData(PARTNERS_FILE, partners);

  // Send Telegram Alert for Driver Onboarding
  const partnerMsg =
    `🤝 *NEW DRIVER PARTNER ATTACHMENT!*\n\n` +
    `🆔 *Partner ID:* \`${partner.id}\`\n` +
    `👤 *Driver/Owner:* ${partner.name}\n` +
    `📞 *Phone:* [${partner.phone}](tel:${partner.phone})\n` +
    `🏙️ *City:* ${partner.city}\n` +
    `🚗 *Vehicle:* ${partner.carModel}\n` +
    `🔢 *Number:* ${partner.carNumber}\n` +
    `⏰ *Registered:* ${new Date().toLocaleString('en-IN')}`;

  const telegramResult = await sendTelegramMessage(partnerMsg);

  res.status(201).json({
    success: true,
    message: 'Driver partner application submitted successfully.',
    partner,
    telegramNotified: telegramResult.sent
  });
});

// 4. List all bookings
app.get('/api/bookings', (req, res) => {
  res.json({ bookings: readData(BOOKINGS_FILE) });
});

// 5. Fallback: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚕 YazhGo Taxi Service Server is live on port ${PORT}`);
  console.log(`🌐 Website URL: http://localhost:${PORT}`);
  console.log(`🤖 Telegram Bot Alerts: ${TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled (Configure .env)'}`);
  console.log(`======================================================\n`);
});
