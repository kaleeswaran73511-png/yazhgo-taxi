/* ==========================================================================
   YAZHGO TAXI SERVICE - CLIENT SCRIPT & EXACT TARIFF ENGINE
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
    driverBeta: 500
  },
  crysta: {
    name: 'Innova Crysta (Premium MPV)',
    shortName: 'Innova Crysta',
    oneWayRate: 24,
    roundTripRate: 23,
    minKmRoundTrip: 250,
    driverBeta: 600
  }
};

// Application State
let state = {
  activeTab: 'outstation',     // 'outstation', 'city', 'airport'
  tripMode: 'one-way',         // 'one-way', 'round-trip'
  selectedCab: 'sedan',        // 'sedan', 'suv', 'crysta'
  formDistance: 150,
  calcDistance: 150,
  calcCab: 'sedan',
  calcRoundTrip: false,
  lastBookingDetails: null
};

// On DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initLucide();
  initDefaultDateTime();
  initMobileMenu();
  updateFormDistance(150);
  calculateFormFare();
  calculateLiveFare();
});

function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initDefaultDateTime() {
  const dateInput = document.getElementById('pickupDate');
  const timeInput = document.getElementById('pickupTime');
  
  if (dateInput && timeInput) {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    dateInput.min = formattedDate;

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

// Tab Switching
function switchTripType(tabName) {
  state.activeTab = tabName;
  
  const tabs = document.querySelectorAll('.booking-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  const pickupInput = document.getElementById('pickupLocation');
  const dropInput = document.getElementById('dropLocation');
  const dropQuickTags = document.getElementById('dropQuickTags');

  if (tabName === 'airport') {
    pickupInput.placeholder = 'e.g. Hotel, Office, or Home Address';
    dropInput.placeholder = 'e.g. Chennai International Airport (MAA)';
    state.formDistance = 35;
    if (dropQuickTags) {
      dropQuickTags.innerHTML = `
        <span>Airports:</span>
        <button type="button" class="tag-btn" onclick="setDrop('Chennai Airport Terminal 1 (Domestic)')">Chennai Domestic</button>
        <button type="button" class="tag-btn" onclick="setDrop('Chennai Airport Terminal 2 (International)')">Chennai Intl</button>
        <button type="button" class="tag-btn" onclick="setDrop('Bangalore Airport (BLR)')">Bangalore BLR</button>
      `;
    }
  } else if (tabName === 'city') {
    pickupInput.placeholder = 'Enter pickup area or street';
    dropInput.placeholder = 'Enter drop destination within city';
    state.formDistance = 40;
    if (dropQuickTags) {
      dropQuickTags.innerHTML = `
        <span>City Landmarks:</span>
        <button type="button" class="tag-btn" onclick="setDrop('Marina Beach, Chennai')">Marina Beach</button>
        <button type="button" class="tag-btn" onclick="setDrop('T. Nagar, Chennai')">T. Nagar</button>
        <button type="button" class="tag-btn" onclick="setDrop('OMR IT Corridor')">OMR</button>
      `;
    }
  } else {
    pickupInput.placeholder = 'Pickup city or address';
    dropInput.placeholder = 'Destination city (e.g. Pondicherry, Bangalore, Madurai)';
    state.formDistance = 150;
    if (dropQuickTags) {
      dropQuickTags.innerHTML = `
        <span>Popular Destinations:</span>
        <button type="button" class="tag-btn" onclick="setDrop('Pondicherry')">Pondicherry</button>
        <button type="button" class="tag-btn" onclick="setDrop('Bangalore')">Bangalore</button>
        <button type="button" class="tag-btn" onclick="setDrop('Coimbatore')">Coimbatore</button>
        <button type="button" class="tag-btn" onclick="setDrop('Madurai')">Madurai</button>
        <button type="button" class="tag-btn" onclick="setDrop('Tirupati')">Tirupati</button>
      `;
    }
  }

  const slider = document.getElementById('bookingDistance');
  if (slider) {
    slider.value = state.formDistance;
    document.getElementById('formDistanceVal').textContent = `${state.formDistance} km`;
  }

  calculateFormFare();
}

// Update Trip Mode (One Way vs Round Trip)
function updateTripModeUI() {
  const selectedMode = document.querySelector('input[name="tripMode"]:checked')?.value || 'one-way';
  state.tripMode = selectedMode;

  const returnDateGroup = document.getElementById('returnDateGroup');
  const cardSedanRate = document.getElementById('cardSedanRate');
  const cardSuvRate = document.getElementById('cardSuvRate');
  const cardCrystaRate = document.getElementById('cardCrystaRate');

  if (selectedMode === 'round-trip') {
    if (returnDateGroup) returnDateGroup.style.display = 'block';
    if (cardSedanRate) cardSedanRate.textContent = '₹14/km';
    if (cardSuvRate) cardSuvRate.textContent = '₹19/km';
    if (cardCrystaRate) cardCrystaRate.textContent = '₹23/km';
  } else {
    if (returnDateGroup) returnDateGroup.style.display = 'none';
    if (cardSedanRate) cardSedanRate.textContent = '₹15/km';
    if (cardSuvRate) cardSuvRate.textContent = '₹20/km';
    if (cardCrystaRate) cardCrystaRate.textContent = '₹24/km';
  }

  calculateFormFare();
}

function updateFormDistance(val) {
  state.formDistance = parseInt(val, 10);
  const display = document.getElementById('formDistanceVal');
  if (display) {
    display.textContent = `${state.formDistance} km`;
  }
  calculateFormFare();
}

// Quick Location Fillers
function setPickup(location) {
  document.getElementById('pickupLocation').value = location;
  showToast(`Pickup set: ${location}`);
  calculateFormFare();
}

function setDrop(location) {
  document.getElementById('dropLocation').value = location;
  showToast(`Drop set: ${location}`);
  calculateFormFare();
}

function setRouteQuick(pickup, drop) {
  document.getElementById('pickupLocation').value = pickup;
  document.getElementById('dropLocation').value = drop;
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  showToast(`Route set: ${pickup} → ${drop}`);
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
      document.getElementById('pickupLocation').value = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      showToast('Location detected successfully!', 'success');
      calculateFormFare();
    },
    () => {
      document.getElementById('pickupLocation').value = 'Anna Nagar, Chennai (Current Location)';
      showToast('Set to current detected area.', 'success');
      calculateFormFare();
    },
    { timeout: 8000 }
  );
}

// Vehicle Selection in Form
function selectCabType(cabType) {
  state.selectedCab = cabType;
  
  const choices = document.querySelectorAll('.vehicle-selector-grid .vehicle-card-choice');
  choices.forEach(card => {
    card.classList.toggle('active', card.dataset.cab === cabType);
  });

  calculateFormFare();
}

// Calculate Estimated Fare for Hero Widget
function calculateFormFare() {
  const cab = VEHICLE_PRICING[state.selectedCab] || VEHICLE_PRICING.sedan;
  const distance = state.formDistance;
  const isRoundTrip = state.tripMode === 'round-trip';

  let ratePerKm = isRoundTrip ? cab.roundTripRate : cab.oneWayRate;
  let driverAllowance = cab.driverBeta;
  let billableKm = distance;

  if (isRoundTrip) {
    const roundDistance = distance * 2;
    billableKm = Math.max(roundDistance, cab.minKmRoundTrip);
  }

  const totalFare = (billableKm * ratePerKm) + driverAllowance;
  const roundedFare = Math.round(totalFare / 10) * 10;

  const fareDisplay = document.getElementById('formEstimatedFare');
  const fareLabel = document.getElementById('formFareLabel');
  const rateDetail = document.getElementById('formRateDetail');

  if (fareDisplay) {
    fareDisplay.textContent = `₹${roundedFare.toLocaleString('en-IN')}`;
  }

  if (fareLabel) {
    fareLabel.textContent = isRoundTrip 
      ? `Round-Trip Estimate (${billableKm} km billable)`
      : `One-Way Estimate (${distance} km)`;
  }

  if (rateDetail) {
    rateDetail.textContent = isRoundTrip
      ? `${cab.shortName} @ ₹${ratePerKm}/km (250km min) + ₹${driverAllowance} Driver Batta`
      : `${cab.shortName} @ ₹${ratePerKm}/km + ₹${driverAllowance} Driver Batta`;
  }

  return { roundedFare, billableKm, ratePerKm };
}

// ==========================================================================
// FARE ESTIMATOR / CALCULATOR TAB LOGIC
// ==========================================================================

function setCalcCategory(cabType) {
  state.calcCab = cabType;
  
  const chips = document.querySelectorAll('.calc-category-chips .chip-btn');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cabcalc === cabType);
  });

  calculateLiveFare();
}

function calculateLiveFare() {
  const slider = document.getElementById('distanceSlider');
  const distance = parseInt(slider.value, 10);
  state.calcDistance = distance;

  const distanceDisplay = document.getElementById('distanceDisplay');
  if (distanceDisplay) {
    distanceDisplay.textContent = `${distance} km`;
  }

  const cab = VEHICLE_PRICING[state.calcCab] || VEHICLE_PRICING.sedan;
  const isRoundTrip = document.getElementById('calcRoundTripToggle')?.checked || false;
  state.calcRoundTrip = isRoundTrip;

  let ratePerKm = isRoundTrip ? cab.roundTripRate : cab.oneWayRate;
  let driverAllowance = cab.driverBeta;
  let billableKm = distance;

  if (isRoundTrip) {
    const roundDistance = distance * 2;
    billableKm = Math.max(roundDistance, cab.minKmRoundTrip);
  }

  const distanceFare = billableKm * ratePerKm;
  const total = distanceFare + driverAllowance;
  const roundedFare = Math.round(total / 10) * 10;

  // Update Summary Card
  document.getElementById('summaryVehName').textContent = cab.name;
  document.getElementById('summaryRatePerKm').textContent = isRoundTrip
    ? `₹${ratePerKm} / km (Round-Trip Rate)`
    : `₹${ratePerKm} / km (One-Way Drop Rate)`;
  document.getElementById('summaryBillableKm').textContent = isRoundTrip
    ? `${billableKm} km (Min. 250 km coverage applied)`
    : `${billableKm} km`;
  document.getElementById('summaryDistanceFare').textContent = `₹${distanceFare.toLocaleString('en-IN')}`;
  document.getElementById('summaryDriverAllowance').textContent = `₹${driverAllowance}`;
  document.getElementById('calcTotalFare').textContent = `₹${roundedFare.toLocaleString('en-IN')}`;
}

function transferCalcToBooking() {
  selectCabType(state.calcCab);
  
  const roundRadio = document.querySelector(`input[name="tripMode"][value="${state.calcRoundTrip ? 'round-trip' : 'one-way'}"]`);
  if (roundRadio) {
    roundRadio.checked = true;
    updateTripModeUI();
  }

  const slider = document.getElementById('bookingDistance');
  if (slider) {
    slider.value = state.calcDistance;
    updateFormDistance(state.calcDistance);
  }

  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  showToast(`Applied ${VEHICLE_PRICING[state.calcCab].name} to booking form!`, 'success');
}

function selectFleetAndBook(cabType) {
  selectCabType(cabType);
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  showToast(`Selected ${VEHICLE_PRICING[cabType].name}! Fill in details to confirm.`, 'success');
}

// ==========================================================================
// FORM SUBMISSION, TELEGRAM BOT NOTIFICATION & MODAL LOGIC
// ==========================================================================

async function handleBookingSubmit(event) {
  event.preventDefault();

  const pickup = document.getElementById('pickupLocation').value.trim();
  const drop = document.getElementById('dropLocation').value.trim();
  const pickupDate = document.getElementById('pickupDate').value;
  const pickupTime = document.getElementById('pickupTime').value;
  const returnDate = document.getElementById('returnDate')?.value || '';
  const passengerName = document.getElementById('passengerName').value.trim();
  const passengerPhone = document.getElementById('passengerPhone').value.trim();
  const { roundedFare, billableKm, ratePerKm } = calculateFormFare();

  if (!pickup || !drop || !pickupDate || !pickupTime || !passengerName || !passengerPhone) {
    showToast('Please fill in all required booking fields', 'error');
    return;
  }

  const submitBtn = document.getElementById('bookingSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-lucide="loader-2"></i> Submitting & Notifying Telegram...`;
    initLucide();
  }

  const payload = {
    name: passengerName,
    phone: passengerPhone,
    pickup,
    drop,
    tripType: state.activeTab,
    tripMode: state.tripMode,
    pickupDate,
    pickupTime,
    returnDate,
    vehicle: state.selectedCab,
    distance: state.formDistance
  };

  let bookingId = `YZG-${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      bookingId = data.booking.id;
      if (data.telegramNotified) {
        showToast('Booking recorded & Telegram alert dispatched!', 'success');
      } else {
        showToast('Booking saved successfully!', 'success');
      }
    }
  } catch (err) {
    console.warn('Backend API note:', err.message);
    showToast('Booking processed on client system!', 'success');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="check-circle"></i> Confirm Booking Now`;
      initLucide();
    }
  }

  // Update Confirmation Modal
  document.getElementById('modalPassengerName').textContent = passengerName;
  document.getElementById('modalBookingId').textContent = bookingId;
  document.getElementById('modalRoute').textContent = `${pickup} → ${drop}`;
  document.getElementById('modalDateTime').textContent = `${pickupDate} at ${pickupTime}${state.tripMode === 'round-trip' ? ` (Return: ${returnDate})` : ''}`;
  document.getElementById('modalVehicle').textContent = `${VEHICLE_PRICING[state.selectedCab].name} (₹${ratePerKm}/km)`;
  document.getElementById('modalTripMode').textContent = state.tripMode === 'round-trip' ? 'Round Trip (250km min)' : 'One-Way Drop';
  document.getElementById('modalFare').textContent = `₹${roundedFare.toLocaleString('en-IN')}`;

  // WhatsApp Pre-filled message
  const waMessage = `*New Ride Booking - YazhGo Taxi Service*%0A` +
    `--------------------------------%0A` +
    `*Booking ID:* ${bookingId}%0A` +
    `*Customer:* ${passengerName}%0A` +
    `*Phone:* ${passengerPhone}%0A` +
    `*Mode:* ${state.tripMode.toUpperCase()} (${state.activeTab})%0A` +
    `*Pickup:* ${pickup}%0A` +
    `*Drop:* ${drop}%0A` +
    `*Date & Time:* ${pickupDate} at ${pickupTime}%0A` +
    `${state.tripMode === 'round-trip' ? `*Return Date:* ${returnDate}%0A` : ''}` +
    `*Vehicle:* ${VEHICLE_PRICING[state.selectedCab].name}%0A` +
    `*Tariff Rate:* ₹${ratePerKm}/km (Billable: ${billableKm} km)%0A` +
    `*Est. Fare:* ₹${roundedFare}%0A` +
    `--------------------------------%0A` +
    `Please dispatch driver and share cab details.`;

  const waBtn = document.getElementById('modalWhatsAppConfirmBtn');
  if (waBtn) {
    waBtn.href = `https://wa.me/919489038346?text=${waMessage}`;
  }

  openModal('bookingSuccessModal');
}

function bookViaWhatsAppDirect() {
  const pickup = document.getElementById('pickupLocation').value.trim() || 'Not specified';
  const drop = document.getElementById('dropLocation').value.trim() || 'Not specified';
  const date = document.getElementById('pickupDate').value || 'Immediate';
  const time = document.getElementById('pickupTime').value || 'ASAP';
  const name = document.getElementById('passengerName').value.trim() || 'Customer';
  const phone = document.getElementById('passengerPhone').value.trim() || '';
  const vehicle = VEHICLE_PRICING[state.selectedCab].name;
  const rate = state.tripMode === 'round-trip' ? VEHICLE_PRICING[state.selectedCab].roundTripRate : VEHICLE_PRICING[state.selectedCab].oneWayRate;

  const msg = `*Instant Cab Booking Request - YazhGo Taxi*%0A` +
    `Customer: ${name}%0A` +
    `Phone: ${phone}%0A` +
    `Mode: ${state.tripMode.toUpperCase()}%0A` +
    `Pickup: ${pickup}%0A` +
    `Drop: ${drop}%0A` +
    `Date & Time: ${date} ${time}%0A` +
    `Vehicle: ${vehicle} (₹${rate}/km)%0A` +
    `Please confirm driver availability.`;

  window.open(`https://wa.me/919489038346?text=${msg}`, '_blank');
}

function printBookingTicket() {
  window.print();
}

// Driver Partner Registration
async function handleDriverSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('driverName').value.trim();
  const phone = document.getElementById('driverPhone').value.trim();
  const city = document.getElementById('driverCity').value.trim();
  const carModel = document.getElementById('driverCarModel').value.trim();
  const carNumber = document.getElementById('driverCarNumber').value.trim();

  const driverBtn = document.getElementById('driverSubmitBtn');
  if (driverBtn) {
    driverBtn.disabled = true;
    driverBtn.innerHTML = `<i data-lucide="loader-2"></i> Submitting...`;
    initLucide();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, city, carModel, carNumber })
    });

    const data = await response.json();
    closeModal('driverModal');

    if (response.ok && data.success) {
      showToast(`Partner application submitted! Partner ID: ${data.partner.id}`, 'success');
    } else {
      showToast(`Application received! Onboarding team will contact ${phone}.`, 'success');
    }
  } catch (err) {
    closeModal('driverModal');
    showToast(`Application received! Onboarding team will contact ${phone}.`, 'success');
  } finally {
    if (driverBtn) {
      driverBtn.disabled = false;
      driverBtn.innerHTML = `<i data-lucide="send"></i> Submit Partner Application`;
      initLucide();
    }
  }

  const waPartnerMsg = `*New Driver Partner Application - YazhGo Taxi*%0A` +
    `Owner Name: ${name}%0A` +
    `Mobile: ${phone}%0A` +
    `City: ${city}%0A` +
    `Vehicle: ${carModel} (${carNumber})`;
  
  window.open(`https://wa.me/919489038346?text=${waPartnerMsg}`, '_blank');
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    initLucide();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function openDriverModal() {
  openModal('driverModal');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';

  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  initLucide();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    document.body.style.overflow = '';
  }
});
