const STAGES = [
  ['SHIPMENT_CREATED', 'Shipment Created'],
  ['PROCESSING_IN_ITALY', 'Processing in Italy'],
  ['PACKAGE_PICKED_UP', 'Package Picked Up'],
  ['DEPARTED_ORIGIN_FACILITY', 'Departed Origin Facility'],
  ['INTERNATIONAL_TRANSIT', 'International Transit'],
  ['CUSTOMS_CLEARANCE', 'Customs Clearance'],
  ['ARRIVED_IN_UNITED_STATES', 'Arrived in United States'],
  ['LOCAL_DISTRIBUTION_FACILITY', 'Local Distribution Facility'],
  ['OUT_FOR_DELIVERY', 'Out for Delivery'],
  ['DELIVERED', 'Delivered']
];

const STAGE_LABELS = new Map(STAGES);
const ADMIN_TOKEN_KEY = 'trackswift_admin_session';

const landingApp = document.getElementById('landingApp');
const adminApp = document.getElementById('adminApp');
const adminLoginView = document.getElementById('adminLoginView');
const adminDashboard = document.getElementById('adminDashboard');
const adminLogout = document.getElementById('adminLogout');
const adminIdentity = document.getElementById('adminIdentity');
const createDialog = document.getElementById('createShipmentDialog');

let adminToken = readStoredToken();
let currentAdmin = null;
let adminShipments = [];

function readStoredToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  adminToken = token;
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // The in-memory session still works when storage is unavailable.
  }
}

function setMessage(element, message = '', type = '') {
  element.textContent = message;
  element.classList.toggle('is-error', type === 'error');
  element.classList.toggle('is-success', type === 'success');
}

function setBusy(button, busy, busyLabel) {
  const labelTarget = button.querySelector('span') || button;
  if (!button.dataset.label) button.dataset.label = labelTarget.textContent.trim();
  button.disabled = busy;
  labelTarget.textContent = busy ? busyLabel : button.dataset.label;
}

async function apiRequest(path, options = {}) {
  const headers = { Accept: 'application/json', ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (options.admin && adminToken) headers.Authorization = `Bearer ${adminToken}`;

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function stageLabel(stage) {
  return STAGE_LABELS.get(stage) || String(stage || '').replaceAll('_', ' ');
}

function formatDate(value, includeTime = true) {
  if (!value) return 'To be confirmed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' } : {})
  }).format(date);
}

function formatWeight(value) {
  if (value == null || value === '') return 'Not provided';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString()} kg` : `${value} kg`;
}

function lastEventForStage(events, stage) {
  return [...events].reverse().find(event => event.stage === stage);
}

function renderCustomerTimeline(shipment) {
  const timeline = document.getElementById('customerTimeline');
  timeline.replaceChildren();
  const currentIndex = STAGES.findIndex(([stage]) => stage === shipment.currentStage);
  const events = shipment.progressEvents || [];

  STAGES.forEach(([stage, label], index) => {
    const item = document.createElement('li');
    const isComplete = index < currentIndex || shipment.currentStage === 'DELIVERED';
    const isCurrent = index === currentIndex && shipment.currentStage !== 'DELIVERED';
    if (isComplete) item.classList.add('is-complete');
    if (isCurrent) item.classList.add('is-current');

    const marker = document.createElement('span');
    marker.className = 'timeline-marker';
    marker.textContent = isComplete ? '✓' : String(index + 1);

    const name = document.createElement('strong');
    name.textContent = label;

    const event = lastEventForStage(events, stage);
    const detail = document.createElement(event ? 'time' : 'small');
    detail.textContent = event
      ? formatDate(event.eventTime)
      : isCurrent
        ? 'Current stage'
        : 'Pending';
    if (event) detail.dateTime = event.eventTime;

    item.append(marker, name, detail);
    timeline.append(item);
  });
}

function renderCustomerShipment(shipment) {
  document.getElementById('resultTrackingId').textContent = shipment.trackingId;
  document.getElementById('resultRoute').textContent =
    `${shipment.originCity}, ${shipment.originCountry} → ${shipment.destinationCity}, ${shipment.destinationCountry}`;
  const status = document.getElementById('resultStatus');
  status.textContent = stageLabel(shipment.currentStage);
  status.classList.toggle('status-complete', shipment.currentStage === 'DELIVERED');
  document.getElementById('resultUpdated').textContent = `Last updated ${formatDate(shipment.updatedAt)}`;
  document.getElementById('resultCustomer').textContent = shipment.customerName;
  document.getElementById('resultDescription').textContent = shipment.description;
  document.getElementById('resultEta').textContent = formatDate(shipment.estimatedDelivery);
  document.getElementById('resultLocation').textContent =
    shipment.currentLocation || `${shipment.originCity}, ${shipment.originCountry}`;
  document.getElementById('resultNotes').textContent =
    shipment.carrierNotes || 'No carrier note has been added yet.';
  document.getElementById('resultPackage').textContent =
    `${formatWeight(shipment.weightKg)}${shipment.dimensions ? ` · ${shipment.dimensions}` : ''}`;
  renderCustomerTimeline(shipment);

  const result = document.getElementById('trackingResult');
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('trackForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById('trackMessage');
  const button = document.getElementById('trackSubmit');

  if (!form.checkValidity()) {
    form.reportValidity();
    setMessage(message, 'Enter both your tracking number and registered email.', 'error');
    return;
  }

  setMessage(message, 'Checking your shipment securely…');
  setBusy(button, true, 'Checking shipment…');

  try {
    const data = await apiRequest('/api/tracking', {
      method: 'POST',
      body: JSON.stringify({
        trackingId: document.getElementById('trackingId').value,
        email: document.getElementById('trackingEmail').value
      })
    });
    setMessage(message, 'Shipment verified. Your latest progress is shown below.', 'success');
    renderCustomerShipment(data.shipment);
  } catch (error) {
    document.getElementById('trackingResult').hidden = true;
    setMessage(message, error.message, 'error');
  } finally {
    setBusy(button, false, '');
  }
});

function showLandingMode() {
  document.body.classList.remove('admin-mode');
  landingApp.hidden = false;
  adminApp.hidden = true;
  document.title = 'TrackSwift — Private shipment tracking';
}

function showAdminMode() {
  document.body.classList.add('admin-mode');
  landingApp.hidden = true;
  adminApp.hidden = false;
  window.scrollTo(0, 0);
  document.title = 'TrackSwift — Admin Portal';
  ensureAdminSession();
}

function routeApplication() {
  if (window.location.hash === '#admin') showAdminMode();
  else showLandingMode();
}

window.addEventListener('hashchange', routeApplication);

function showAdminLogin() {
  currentAdmin = null;
  adminLoginView.hidden = false;
  adminDashboard.hidden = true;
  adminLogout.hidden = true;
  adminIdentity.textContent = '';
}

function showAdminDashboard(admin) {
  currentAdmin = admin;
  adminLoginView.hidden = true;
  adminDashboard.hidden = false;
  adminLogout.hidden = false;
  adminIdentity.textContent = admin.name;
}

function clearAdminSession() {
  storeToken(null);
  adminShipments = [];
  showAdminLogin();
}

async function ensureAdminSession() {
  if (!adminToken) {
    showAdminLogin();
    return;
  }

  try {
    const data = await apiRequest('/api/auth/me', { admin: true });
    showAdminDashboard(data.admin);
    await loadAdminShipments();
  } catch {
    clearAdminSession();
  }
}

document.getElementById('adminLoginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById('adminLoginMessage');
  const button = document.getElementById('adminLoginSubmit');

  if (!form.checkValidity()) {
    form.reportValidity();
    setMessage(message, 'Enter your administrator email and password.', 'error');
    return;
  }

  setMessage(message, '');
  setBusy(button, true, 'Signing in…');

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('adminEmail').value,
        password: document.getElementById('adminPassword').value
      })
    });
    storeToken(data.accessToken);
    showAdminDashboard(data.admin);
    form.reset();
    await loadAdminShipments();
  } catch (error) {
    setMessage(message, error.message, 'error');
  } finally {
    setBusy(button, false, '');
  }
});

adminLogout.addEventListener('click', clearAdminSession);

function makeCell(content, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  return cell;
}

function statusPill(stage) {
  const status = document.createElement('span');
  status.className = 'status-pill';
  if (stage === 'DELIVERED' || stage === 'OUT_FOR_DELIVERY') {
    status.classList.add('status-complete');
  }
  status.textContent = stageLabel(stage);
  return status;
}

function renderAdminShipments() {
  const rows = document.getElementById('adminShipmentRows');
  const empty = document.getElementById('emptyShipments');
  rows.replaceChildren();
  empty.hidden = adminShipments.length !== 0;
  document.getElementById('shipmentCount').textContent =
    `${adminShipments.length} shipment${adminShipments.length === 1 ? '' : 's'}`;

  adminShipments.forEach(shipment => {
    const row = document.createElement('tr');

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'shipment-select';
    select.dataset.trackingId = shipment.trackingId;
    select.textContent = shipment.trackingId;

    const customer = document.createElement('div');
    customer.className = 'customer-cell';
    const customerName = document.createElement('strong');
    customerName.textContent = shipment.customerName;
    const customerEmail = document.createElement('small');
    customerEmail.textContent = shipment.customerEmail;
    customer.append(customerName, customerEmail);

    const route = document.createElement('div');
    route.className = 'route-cell';
    const routeMain = document.createElement('span');
    routeMain.textContent = `${shipment.originCity} → ${shipment.destinationCity}`;
    const routeCountries = document.createElement('small');
    routeCountries.textContent = `${shipment.originCountry} to ${shipment.destinationCountry}`;
    route.append(routeMain, routeCountries);

    row.append(
      makeCell(select),
      makeCell(customer),
      makeCell(route),
      makeCell(statusPill(shipment.currentStage)),
      makeCell(formatDate(shipment.updatedAt))
    );
    rows.append(row);
  });
}

async function loadAdminShipments() {
  const refresh = document.getElementById('refreshShipments');
  refresh.disabled = true;
  try {
    const data = await apiRequest('/api/admin/shipments', { admin: true });
    adminShipments = data.shipments || [];
    renderAdminShipments();
  } catch (error) {
    if (error.status === 401) {
      clearAdminSession();
      return;
    }
    setMessage(document.getElementById('updateMessage'), error.message, 'error');
  } finally {
    refresh.disabled = false;
  }
}

document.getElementById('refreshShipments').addEventListener('click', loadAdminShipments);

document.getElementById('adminShipmentRows').addEventListener('click', event => {
  const button = event.target.closest('[data-tracking-id]');
  if (!button) return;
  const shipment = adminShipments.find(item => item.trackingId === button.dataset.trackingId);
  if (!shipment) return;

  document.getElementById('updateTrackingId').value = shipment.trackingId;
  document.getElementById('updateStage').value = shipment.currentStage;
  document.getElementById('updateLocation').value = shipment.currentLocation || '';
  document.getElementById('updateNotes').value = shipment.carrierNotes || '';
  document.getElementById('updateEta').value = toLocalInputValue(shipment.estimatedDelivery);
  document.getElementById('updateTrackingId').focus();
});

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function populateStageSelect() {
  const select = document.getElementById('updateStage');
  STAGES.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
}

document.getElementById('updateShipmentForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById('updateShipmentSubmit');
  const message = document.getElementById('updateMessage');

  if (!form.checkValidity()) {
    form.reportValidity();
    setMessage(message, 'Choose a shipment and progress stage.', 'error');
    return;
  }

  const trackingId = document.getElementById('updateTrackingId').value.trim().toUpperCase();
  setBusy(button, true, 'Saving update…');
  setMessage(message, '');

  try {
    const data = await apiRequest(`/api/admin/shipments/${encodeURIComponent(trackingId)}/progress`, {
      method: 'PATCH',
      admin: true,
      body: JSON.stringify({
        stage: document.getElementById('updateStage').value,
        location: document.getElementById('updateLocation').value,
        notes: document.getElementById('updateNotes').value,
        estimatedDelivery: document.getElementById('updateEta').value || null
      })
    });
    const index = adminShipments.findIndex(item => item.trackingId === trackingId);
    if (index >= 0) adminShipments[index] = data.shipment;
    else adminShipments.unshift(data.shipment);
    renderAdminShipments();
    setMessage(message, `${trackingId} was updated successfully.`, 'success');
  } catch (error) {
    if (error.status === 401) {
      clearAdminSession();
      return;
    }
    setMessage(message, error.message, 'error');
  } finally {
    setBusy(button, false, '');
  }
});

document.getElementById('openCreateShipment').addEventListener('click', () => {
  setMessage(document.getElementById('createMessage'), '');
  createDialog.showModal();
});

function closeCreateDialog() {
  createDialog.close();
}

document.getElementById('closeCreateShipment').addEventListener('click', closeCreateDialog);
document.getElementById('cancelCreateShipment').addEventListener('click', closeCreateDialog);

createDialog.addEventListener('click', event => {
  if (event.target === createDialog) closeCreateDialog();
});

document.getElementById('createShipmentForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById('createShipmentSubmit');
  const message = document.getElementById('createMessage');

  if (!form.checkValidity()) {
    form.reportValidity();
    setMessage(message, 'Complete the required customer and route details.', 'error');
    return;
  }

  setBusy(button, true, 'Registering shipment…');
  setMessage(message, '');

  try {
    const data = await apiRequest('/api/admin/shipments', {
      method: 'POST',
      admin: true,
      body: JSON.stringify({
        customerName: document.getElementById('createCustomerName').value,
        customerEmail: document.getElementById('createCustomerEmail').value,
        description: document.getElementById('createDescription').value,
        trackingId: document.getElementById('createTrackingId').value,
        estimatedDelivery: document.getElementById('createEta').value || null,
        originCity: document.getElementById('createOriginCity').value,
        originCountry: document.getElementById('createOriginCountry').value,
        destinationCity: document.getElementById('createDestinationCity').value,
        destinationCountry: document.getElementById('createDestinationCountry').value,
        weightKg: document.getElementById('createWeight').value,
        dimensions: document.getElementById('createDimensions').value,
        carrierNotes: document.getElementById('createNotes').value
      })
    });
    adminShipments.unshift(data.shipment);
    renderAdminShipments();
    form.reset();
    document.getElementById('createOriginCity').value = 'Milan';
    document.getElementById('createOriginCountry').value = 'Italy';
    document.getElementById('createDestinationCountry').value = 'United States';
    closeCreateDialog();

    document.getElementById('updateTrackingId').value = data.shipment.trackingId;
    document.getElementById('updateStage').value = data.shipment.currentStage;
    setMessage(
      document.getElementById('updateMessage'),
      `${data.shipment.trackingId} is registered for ${data.shipment.customerEmail}.`,
      'success'
    );
  } catch (error) {
    if (error.status === 401) {
      closeCreateDialog();
      clearAdminSession();
      return;
    }
    setMessage(message, error.message, 'error');
  } finally {
    setBusy(button, false, '');
  }
});

populateStageSelect();
routeApplication();
