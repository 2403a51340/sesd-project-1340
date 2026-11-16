/**
 * CertiTrust Main Client Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // 3. Mobile Navigation Menu Toggle
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // 4. Update Navbar Based on Logged-In User
  updateNavAuthState();

  // 5. Initialize Animate on Scroll or Number Counters
  initNumberCounters();
});

/**
 * Checks session and updates navigation actions dynamically
 */
async function updateNavAuthState() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  try {
    const data = await API.auth.getMe();
    if (data && data.success && data.user) {
      const user = data.user;
      let dashboardUrl = '/institution-dashboard';
      if (user.role === 'admin') dashboardUrl = '/admin-dashboard';
      if (user.role === 'student') dashboardUrl = '/directory';

      navActions.innerHTML = `
        <a href="${dashboardUrl}" class="btn btn-secondary btn-sm">
          <i data-lucide="layout-dashboard"></i> Dashboard
        </a>
        <button id="logoutBtn" class="btn btn-outline btn-sm">
          <i data-lucide="log-out"></i> Logout
        </button>
      `;

      if (window.lucide) window.lucide.createIcons();

      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
          await API.auth.logout();
          localStorage.removeItem('certitrust_token');
          localStorage.removeItem('certitrust_user');
          showToast('You have been logged out.', 'info');
          setTimeout(() => { window.location.href = '/login'; }, 800);
        } catch (e) {
          window.location.href = '/login';
        }
      });
    }
  } catch (err) {
    // Guest user - keep login/get started buttons
  }
}

/**
 * Toast Notification System
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 * @param {number} duration
 */
function showToast(message, type = 'info', duration = 4000) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 380px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `alert alert-${type} animate-slide-up`;
  toast.style.cssText = `
    box-shadow: 0 8px 24px rgba(11, 21, 51, 0.18);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-radius: 8px;
    margin-bottom: 0;
  `;

  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:transparent; border:none; color:inherit; cursor:pointer; margin-left:12px; font-weight:bold;">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Number Counter Animation for Landing Page
 */
function initNumberCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');
  if (!statNumbers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'), 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        let current = 0;
        const step = Math.ceil(target / 40);

        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            clearInterval(timer);
          } else {
            el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
          }
        }, 30);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach((el) => observer.observe(el));
}

window.showToast = showToast;
