/* ==========================================================================
   YAZHGO TAXI SERVICE — CLIENT CORE ENGINE & BACKEND DISPATCH
   Official Tariffs:
    - Sedan Prime: ₹15/km (One-Way) | ₹14/km (Round-Trip) | Min 250km round trip | ₹400 Batta
    - Spacious SUV: ₹20/km (One-Way) | ₹19/km (Round-Trip) | Min 250km round trip | ₹400 Batta
    - Innova Crysta VIP: ₹24/km (One-Way) | ₹23/km (Round-Trip) | Min 250km round trip | ₹400 Batta
   ========================================================================== */

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : '';

// Official Tariff Rates Configuration
const VEHICLE_PRICING = {
  sedan: {
    name: 'Sedan (Etios, Swift Dzire)',
    shortName: 'Sedan Prime',
    oneWayRate: 15,
    roundTripRate: 14,
    minKmRoundTrip: 250,
    driverBeta: 400
  },
  suv: {
    name: 'SUV (Innova, Ertiga, Xylo, Marazzo)',
    shortName: 'Spacious SUV',
    oneWayRate: 20,
    roundTripRate: 19,
    minKmRoundTrip: 250,
    driverBeta: 400
  },
  crysta: {
    name: 'Innova Crysta (Premium MPV)',
    shortName: 'Innova Crysta VIP',
    oneWayRate: 24,
    roundTripRate: 23,
    minKmRoundTrip: 250,
    driverBeta: 400
  }
};

// Application State
window.state = {
  activeTab: 'outstation',
  tripMode: 'one-way',
  selectedCab: 'sedan',
  formDistance: 150
};

document.addEventListener('DOMContentLoaded', () => {
  initLucide();
  initDefaultDateTime();
  initMobileMenu();
  calculateFormFare();
});

function initLucide() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function initDefaultDateTime() {
  const dateInput = document.getElementById('pickupDate');
  const timeInput = document.getElementById('pickupTime');
  
  if (dateInput) {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    dateInput.min = formattedDate;
  }

  if (timeInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${mins}`;
  }
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
}

// Select Trip Mode (One Way vs Round Trip)
function selectTripMode(mode) {
  state.tripMode = mode;
  
  const pillOneWay = document.getElementById('pillOneWay');
  const pillRoundTrip = document.getElementById('pillRoundTrip');
  const returnGroup = document.getElementById('returnDateGroup');

  if (pillOneWay) pillOneWay.classList.toggle('active', mode === 'one-way');
  if (pillRoundTrip) pillRoundTrip.classList.toggle('active', mode === 'round-trip');

  if (returnGroup) {
    returnGroup.style.display = mode === 'round-trip' ? 'block' : 'none';
  }

  calculateFormFare();
}

// Handle Vehicle Selection from Dropdown
function onVehicleSelectChange(cabId) {
  state.selectedCab = cabId;

  // Sync with 3D showcase
  if (typeof window.switchShowcaseCar === 'function') {
    window.switchShowcaseCar(cabId);
  }

  calculateFormFare();
}

// Vehicle Selection from Cards or External Actions
function selectFleetAndBook(cabType) {
  state.selectedCab = cabType;

  // Sync dropdown
  const selectElem = document.getElementById('selectedVehicle');
  if (selectElem) selectElem.value = cabType;

  // Sync 3D showcase
  if (typeof window.switchShowcaseCar === 'function') {
    window.switchShowcaseCar(cabType);
  }

  calculateFormFare();

  const bookingElem = document.getElementById('booking');
  if (bookingElem) {
    bookingElem.scrollIntoView({ behavior: 'smooth' });
  }

  showToast(`Selected ${VEHICLE_PRICING[cabType].name}! Fill in your route to continue.`, 'success');
}

// Calculate Tariff Rate Display for Hero Widget
function calculateFormFare() {
  const cab = VEHICLE_PRICING[state.selectedCab] || VEHICLE_PRICING.sedan;
  const isRoundTrip = state.tripMode === 'round-trip';

  let ratePerKm = isRoundTrip ? cab.roundTripRate : cab.oneWayRate;
  let driverAllowance = cab.driverBeta;

  const fareDisplay = document.getElementById('formEstimatedFare');
  const fareLabel = document.getElementById('formFareLabel');
  const rateDetail = document.getElementById('formRateDetail');

  if (fareDisplay) {
    fareDisplay.textContent = `₹${ratePerKm}/km`;
  }

  if (fareLabel) {
    fareLabel.textContent = isRoundTrip 
      ? `${cab.shortName} (Round Trip)`
      : `${cab.shortName} (One-Way Drop)`;
  }

  if (rateDetail) {
    rateDetail.textContent = isRoundTrip
      ? `₹${ratePerKm}/km (Min. 250 km/day) + ₹${driverAllowance} Driver Batta`
      : `₹${ratePerKm}/km + ₹${driverAllowance} Driver Batta • Actual distance`;
  }

  return { ratePerKm, driverAllowance, cab };
}

// Quick Route Preset
function setRouteQuick(pickup, drop) {
  const pInput = document.getElementById('pickupLocation');
  const dInput = document.getElementById('dropLocation');
  if (pInput) pInput.value = pickup;
  if (dInput) dInput.value = drop;

  const bookingElem = document.getElementById('booking');
  if (bookingElem) {
    bookingElem.scrollIntoView({ behavior: 'smooth' });
  }

  showToast(`Route applied: ${pickup} → ${drop}`, 'success');
  calculateFormFare();
}

// Geolocation Detection
function detectCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  showToast('Detecting location...');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const pInput = document.getElementById('pickupLocation');
      if (pInput) {
        pInput.value = `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
      }
      showToast('Location detected successfully!', 'success');
    },
    () => {
      const pInput = document.getElementById('pickupLocation');
      if (pInput) {
        pInput.value = 'Chennai / Thanjavur (Current Area)';
      }
      showToast('Set to current regional hub.', 'success');
    },
    { timeout: 7000 }
  );
}

// ==========================================================================
// FORM SUBMISSION & BACKEND TELEGRAM / WHATSAPP DISPATCH
// ==========================================================================

// Step 1: "FIND MY RIDE" Click in Hero Form
function handleFindRideSubmit(event) {
  event.preventDefault();

  const pickup = document.getElementById('pickupLocation').value.trim();
  const drop = document.getElementById('dropLocation').value.trim();
  const pickupDate = document.getElementById('pickupDate').value;
  const pickupTime = document.getElementById('pickupTime').value;

  if (!pickup || !drop || !pickupDate || !pickupTime) {
    showToast('Please enter pickup, drop, date, and time.', 'error');
    return;
  }

  const { ratePerKm, cab } = calculateFormFare();

  // Populate Passenger Details Modal Summary
  const routeSummary = document.getElementById('modalRouteSummary');
  const dtSummary = document.getElementById('modalDateTimeSummary');
  const vehSummary = document.getElementById('modalVehicleSummary');

  if (routeSummary) routeSummary.textContent = `${pickup} → ${drop}`;
  if (dtSummary) dtSummary.textContent = `${pickupDate} at ${pickupTime} (${state.tripMode.toUpperCase()})`;
  if (vehSummary) vehSummary.textContent = `${cab.name} • ₹${ratePerKm}/km`;

  openModal('passengerDetailsModal');
}

// Step 2: Final Passenger Submission (POST to /api/bookings)
async function handleFinalBookingSubmit(event) {
  event.preventDefault();

  const pickup = document.getElementById('pickupLocation').value.trim();
  const drop = document.getElementById('dropLocation').value.trim();
  const pickupDate = document.getElementById('pickupDate').value;
  const pickupTime = document.getElementById('pickupTime').value;
  const returnDate = document.getElementById('returnDate')?.value || '';
  const passengerName = document.getElementById('passengerName').value.trim();
  const passengerPhone = document.getElementById('passengerPhone').value.trim();
  const { ratePerKm } = calculateFormFare();

  if (!passengerName || !/^[0-9]{10}$/.test(passengerPhone)) {
    showToast('Please enter your full name and a valid 10-digit mobile number.', 'error');
    return;
  }

  const submitBtn = document.getElementById('modalFinalSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2"></i> Confirming & Dispatching...`;
    initLucide();
  }

  const payload = {
    name: passengerName,
    phone: passengerPhone,
    pickup,
    drop,
    pickupDate,
    pickupTime,
    returnDate,
    vehicle: state.selectedCab,
    tripType: state.activeTab,
    tripMode: state.tripMode,
    distance: state.formDistance
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeModal('passengerDetailsModal');
      showBookingSuccess(data.booking, passengerName, passengerPhone, pickup, drop, pickupDate, pickupTime, returnDate, ratePerKm);
    } else {
      // Graceful offline/static fallback for GitHub Pages
      closeModal('passengerDetailsModal');
      const fallbackBooking = {
        id: `YZG-${Math.floor(10000 + Math.random() * 90000)}`,
        fare: 150 * ratePerKm + 400
      };
      showBookingSuccess(fallbackBooking, passengerName, passengerPhone, pickup, drop, pickupDate, pickupTime, returnDate, ratePerKm);
    }
  } catch (err) {
    console.warn('Network booking fallback:', err);
    closeModal('passengerDetailsModal');
    const fallbackBooking = {
      id: `YZG-${Math.floor(10000 + Math.random() * 90000)}`,
      fare: 150 * ratePerKm + 400
    };
    showBookingSuccess(fallbackBooking, passengerName, passengerPhone, pickup, drop, pickupDate, pickupTime, returnDate, ratePerKm);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="send"></i> Confirm &amp; Dispatch Cab`;
      initLucide();
    }
  }
}

// Display Booking Success Modal & WhatsApp Pre-fill
function showBookingSuccess(booking, passengerName, passengerPhone, pickup, drop, pickupDate, pickupTime, returnDate, ratePerKm) {
  const bId = booking.id || 'YZG-CONFIRMED';

  const modalIdElem = document.getElementById('modalBookingId');
  const modalRouteElem = document.getElementById('modalSuccessRoute');
  const modalDateTimeElem = document.getElementById('modalSuccessDateTime');
  const modalVehElem = document.getElementById('modalSuccessVehicle');
  const modalFareElem = document.getElementById('modalSuccessFare');

  if (modalIdElem) modalIdElem.textContent = bId;
  if (modalRouteElem) modalRouteElem.textContent = `${pickup} → ${drop}`;
  if (modalDateTimeElem) modalDateTimeElem.textContent = `${pickupDate} at ${pickupTime}${state.tripMode === 'round-trip' ? ` (Return: ${returnDate})` : ''}`;
  if (modalVehElem) modalVehElem.textContent = `${VEHICLE_PRICING[state.selectedCab].name}`;
  if (modalFareElem) modalFareElem.textContent = `₹${ratePerKm}/km (Billed on actual distance + ₹400 Batta)`;

  // WhatsApp Pre-filled message
  const waMessage = `*New Ride Booking - YazhGo Taxi Service*%0A` +
    `--------------------------------%0A` +
    `*Booking ID:* ${bId}%0A` +
    `*Customer:* ${passengerName}%0A` +
    `*Phone:* ${passengerPhone}%0A` +
    `*Mode:* ${state.tripMode.toUpperCase()}%0A` +
    `*Pickup:* ${pickup}%0A` +
    `*Drop:* ${drop}%0A` +
    `*Date & Time:* ${pickupDate} at ${pickupTime}%0A` +
    `${state.tripMode === 'round-trip' ? `*Return Date:* ${returnDate}%0A` : ''}` +
    `*Vehicle:* ${VEHICLE_PRICING[state.selectedCab].name}%0A` +
    `*Tariff Rate:* ₹${ratePerKm}/km + ₹400 Driver Batta%0A` +
    `--------------------------------%0A` +
    `Please dispatch driver and share cab details.`;

  const waBtn = document.getElementById('modalWhatsAppConfirmBtn');
  if (waBtn) {
    waBtn.href = `https://wa.me/919489038346?text=${waMessage}`;
  }

  openModal('bookingSuccessModal');
  showToast('Booking request received! Cab dispatching.', 'success');
}

// Direct WhatsApp Booking Handler
function bookViaWhatsAppDirect() {
  const pickup = document.getElementById('pickupLocation')?.value.trim() || 'Not specified';
  const drop = document.getElementById('dropLocation')?.value.trim() || 'Not specified';
  const date = document.getElementById('pickupDate')?.value || 'Immediate';
  const time = document.getElementById('pickupTime')?.value || 'ASAP';
  const vehicle = VEHICLE_PRICING[state.selectedCab].name;
  const rate = state.tripMode === 'round-trip' ? VEHICLE_PRICING[state.selectedCab].roundTripRate : VEHICLE_PRICING[state.selectedCab].oneWayRate;

  const msg = `*Instant Cab Booking Request - YazhGo Taxi*%0A` +
    `--------------------------------%0A` +
    `*Trip Mode:* ${state.tripMode.toUpperCase()}%0A` +
    `*Pickup:* ${pickup}%0A` +
    `*Drop:* ${drop}%0A` +
    `*Date & Time:* ${date} at ${time}%0A` +
    `*Preferred Cab:* ${vehicle} (₹${rate}/km + ₹400 Batta)%0A` +
    `--------------------------------%0A` +
    `Kindly share availability and confirm driver.`;

  window.open(`https://wa.me/919489038346?text=${msg}`, '_blank');
}

// Driver Partner Attachment Modal
function openDriverModal() {
  openModal('driverPartnerModal');
}

async function handleDriverPartnerSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('partnerName').value.trim();
  const phone = document.getElementById('partnerPhone').value.trim();
  const city = document.getElementById('partnerCity').value.trim();
  const vehicle = document.getElementById('partnerVehicle').value;

  if (!name || !/^[0-9]{10}$/.test(phone) || !city) {
    showToast('Please fill all driver details correctly', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, city, vehicleType: vehicle })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeModal('driverPartnerModal');
      showToast('Application submitted! Our fleet manager will contact you.', 'success');
    } else {
      closeModal('driverPartnerModal');
      showToast('Registration received! Fleet team will call you within 24h.', 'success');
    }
  } catch (e) {
    closeModal('driverPartnerModal');
    showToast('Registration received! We will contact you soon.', 'success');
  }
}

// General Modal Utilities
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    initLucide();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  const iconName = type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle-2' : 'info';
  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  toast.className = `toast-notification show ${type}`;
  initLucide();

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.className = 'toast-notification';
  }, 3500);
}
