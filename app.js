// Import Firebase functions
import { auth, db, provider } from './firebaseConfig.js';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Global state
let currentUser = null;
let consumosUnsubscribe = null;

/**
 * Initialize Auth State Listener
 * Captures the uid of the user when they log in and manages auth UI
 */
export function initAuthStateListener() {
  const ALLOWED_EMAILS = [
    'daniel.ayuntnumancia@gmail.com'
  ];

  onAuthStateChanged(auth, async (user) => {
    // Check whitelist if user is logged in
    if (user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
      console.warn(`Access denied for unauthorized email: ${user.email}`);
      await signOutUser();
      currentUser = null;
      showNotification('Acceso denegado: Este correo no tiene permiso', 'error');
      return;
    }

    currentUser = user;
    
    if (user) {
      console.log('User logged in:', user.uid, user.email);
      // Update UI to show authenticated state
      updateAuthUI(true, user);
      // Initialize real-time listener for consumption records
      initializeConsumosListener(user.uid);
    } else {
      console.log('User logged out');
      // Update UI to show unauthenticated state
      updateAuthUI(false);
      // Unsubscribe from consumos listener if active
      if (consumosUnsubscribe) {
        consumosUnsubscribe();
      }
    }
  });
}

/**
 * Google Sign-In Function
 * Opens popup for user to authenticate with Google
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Google sign-in successful:', user.email);
    return user;
  } catch (error) {
    console.error('Google sign-in error:', error.message);
    showNotification('Error al iniciar sesión con Google', 'error');
  }
}

/**
 * Sign Out Function
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    console.log('User signed out');
    currentUser = null;
  } catch (error) {
    console.error('Sign out error:', error.message);
    showNotification('Error al cerrar sesión', 'error');
  }
}

/**
 * Save Consumption Record to Firestore
 * Saves record to usuarios/{uid}/consumos collection
 * 
 * @param {Object} consumoData - Object with: fecha, kwh, costo
 * @returns {Promise}
 */
export async function saveConsumoRecord(consumoData) {
  if (!currentUser) {
    showNotification('Debes iniciar sesión primero', 'error');
    return;
  }

  try {
    // Validate input data
    if (!consumoData.fecha || !consumoData.kwh || !consumoData.costo) {
      throw new Error('Todos los campos son requeridos');
    }

    // Ensure kwh and costo are numbers
    const kwh = parseFloat(consumoData.kwh);
    const costo = parseFloat(consumoData.costo);

    if (isNaN(kwh) || isNaN(costo)) {
      throw new Error('kWh y costo deben ser números válidos');
    }

    // Reference to the consumos subcollection
    const consumosRef = collection(db, 'usuarios', currentUser.uid, 'consumos');

    // Add the document with timestamp
    const docRef = await addDoc(consumosRef, {
      fecha: consumoData.fecha,
      kwh: kwh,
      costo: costo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Consumption record saved:', docRef.id);
    showNotification('Consumo registrado correctamente', 'success');
    
    // Clear form after successful save
    clearConsumoForm();
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving consumption record:', error.message);
    showNotification('Error al guardar el consumo: ' + error.message, 'error');
  }
}

/**
 * Real-time Listener for Consumption Records
 * Listens to usuarios/{uid}/consumos collection and updates UI on changes
 * 
 * @param {string} uid - User ID
 */
function initializeConsumosListener(uid) {
  const consumosRef = collection(db, 'usuarios', uid, 'consumos');
  const q = query(consumosRef, orderBy('fecha', 'desc'));

  consumosUnsubscribe = onSnapshot(q, (snapshot) => {
    const consumos = [];
    snapshot.forEach((doc) => {
      consumos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('Consumption records updated:', consumos.length);
    // Call function to redraw the list/chart with new data
    updateConsumosList(consumos);
    updateConsumosChart(consumos);
  }, (error) => {
    console.error('Error listening to consumos:', error.message);
    showNotification('Error al cargar los consumos', 'error');
  });
}

/**
 * Update Consumption List in UI
 * Called whenever consumption records change
 * 
 * @param {Array} consumos - Array of consumption records
 */
function updateConsumosList(consumos) {
  const listContainer = document.getElementById('consumos-list');
  
  if (!listContainer) return;

  if (consumos.length === 0) {
    listContainer.innerHTML = '<p class="no-records">No hay registros de consumo aún</p>';
    return;
  }

  listContainer.innerHTML = consumos.map(consumo => `
    <div class="consumo-item">
      <div class="consumo-info">
        <div class="consumo-date">${consumo.fecha}</div>
        <div class="consumo-details">
          <span class="consumo-kwh">${consumo.kwh} kWh</span>
          <span class="consumo-cost">$${parseFloat(consumo.costo).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Update Consumption Chart
 * Called whenever consumption records change
 * You can integrate with a charting library here (e.g., Chart.js, Recharts)
 * 
 * @param {Array} consumos - Array of consumption records
 */
function updateConsumosChart(consumos) {
  // Calculate statistics
  const totalKwh = consumos.reduce((sum, c) => sum + c.kwh, 0);
  const totalCosto = consumos.reduce((sum, c) => sum + parseFloat(c.costo), 0);
  const avgKwh = consumos.length > 0 ? (totalKwh / consumos.length).toFixed(2) : 0;
  const avgCosto = consumos.length > 0 ? (totalCosto / consumos.length).toFixed(2) : 0;

  // Update stats display
  const statsContainer = document.getElementById('consumos-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total kWh</div>
        <div class="stat-value">${totalKwh.toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Costo Total</div>
        <div class="stat-value">$${totalCosto.toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Promedio kWh</div>
        <div class="stat-value">${avgKwh}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Costo Promedio</div>
        <div class="stat-value">$${avgCosto}</div>
      </div>
    `;
  }
}

/**
 * Update UI based on authentication state
 * Shows login button if not authenticated, shows form and list if authenticated
 * 
 * @param {boolean} isAuthenticated - Auth state
 * @param {Object} user - User object (optional)
 */
function updateAuthUI(isAuthenticated, user = null) {
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');
  const userInfo = document.getElementById('user-info');
  const logoutBtn = document.getElementById('logout-btn');

  if (isAuthenticated && user) {
    // Hide login, show app
    if (loginSection) loginSection.style.display = 'none';
    if (appSection) appSection.style.display = 'block';
    
    // Update user info
    if (userInfo) {
      userInfo.innerHTML = `
        <div class="user-info-content">
          <span>Bienvenido, <strong>${user.displayName || user.email}</strong></span>
          ${user.photoURL ? `<img src="${user.photoURL}" alt="Avatar" class="user-avatar">` : ''}
        </div>
      `;
    }

    // Setup logout button
    if (logoutBtn) {
      logoutBtn.onclick = signOutUser;
    }
  } else {
    // Show login, hide app
    if (loginSection) loginSection.style.display = 'block';
    if (appSection) appSection.style.display = 'none';
    if (userInfo) userInfo.innerHTML = '';
  }
}

/**
 * Clear consumption form
 */
function clearConsumoForm() {
  const form = document.getElementById('consumo-form');
  if (form) {
    form.reset();
  }
}

/**
 * Show notification to user
 * 
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info'
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Setup form event listeners
 */
function setupFormListeners() {
  const form = document.getElementById('consumo-form');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fecha = document.getElementById('consumo-fecha').value;
      const kwh = document.getElementById('consumo-kwh').value;
      const costo = document.getElementById('consumo-costo').value;
      
      await saveConsumoRecord({ fecha, kwh, costo });
    });
  }

  // Setup login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', signInWithGoogle);
  }
}

/**
 * Initialize the app
 * Call this when DOM is ready
 */
export function initApp() {
  console.log('Initializing Firebase app...');
  setupFormListeners();
  initAuthStateListener();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
