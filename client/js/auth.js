/**
 * CertiTrust Authentication Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initForgotPasswordModal();
  initDemoCredentials();
});

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showToast('Please fill in both email and password.', 'warning');
      return;
    }

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    try {
      const res = await API.auth.login({ email, password });
      if (res.token) {
        localStorage.setItem('certitrust_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('certitrust_user', JSON.stringify(res.user));
      }

      showToast('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        if (res.user.role === 'admin') {
          window.location.href = '/admin-dashboard';
        } else if (res.user.role === 'institution') {
          window.location.href = '/institution-dashboard';
        } else {
          window.location.href = '/directory';
        }
      }, 700);
    } catch (error) {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
      showToast(error.message || 'Login failed. Please check your credentials.', 'danger');
    }
  });
}

function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  const roleInputs = document.querySelectorAll('input[name="accountRole"]');
  const institutionFields = document.getElementById('institutionSpecificFields');

  roleInputs.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'institution') {
        institutionFields?.classList.remove('hidden');
        document.getElementById('institutionName')?.setAttribute('required', 'true');
        document.getElementById('institutionPhone')?.setAttribute('required', 'true');
        document.getElementById('institutionAddress')?.setAttribute('required', 'true');
      } else {
        institutionFields?.classList.add('hidden');
        document.getElementById('institutionName')?.removeAttribute('required');
        document.getElementById('institutionPhone')?.removeAttribute('required');
        document.getElementById('institutionAddress')?.removeAttribute('required');
      }
    });
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const selectedRole = document.querySelector('input[name="accountRole"]:checked')?.value || 'institution';

    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    const payload = {
      fullName,
      email,
      password,
      role: selectedRole,
    };

    if (selectedRole === 'institution') {
      payload.institutionName = document.getElementById('institutionName').value.trim();
      payload.institutionType = document.getElementById('institutionType').value;
      payload.phone = document.getElementById('institutionPhone').value.trim();
      payload.website = document.getElementById('institutionWebsite').value.trim();
      payload.address = document.getElementById('institutionAddress').value.trim();
    }

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    try {
      const res = await API.auth.register(payload);
      if (res.token) localStorage.setItem('certitrust_token', res.token);
      if (res.user) localStorage.setItem('certitrust_user', JSON.stringify(res.user));

      showToast(res.message || 'Registration successful!', 'success');

      setTimeout(() => {
        if (selectedRole === 'institution') {
          window.location.href = '/institution-dashboard';
        } else {
          window.location.href = '/directory';
        }
      }, 1000);
    } catch (error) {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
      showToast(error.message || 'Registration failed.', 'danger');
    }
  });
}

function initForgotPasswordModal() {
  const forgotLink = document.getElementById('forgotPasswordLink');
  const modal = document.getElementById('forgotPasswordModal');
  const closeBtn = document.getElementById('closeForgotModal');
  const forgotForm = document.getElementById('forgotPasswordForm');

  if (forgotLink && modal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    forgotForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      const btn = forgotForm.querySelector('button[type="submit"]');
      btn.classList.add('btn-loading');

      try {
        const res = await API.auth.forgotPassword(email);
        showToast(res.message || 'Password reset link sent.', 'success');
        modal.classList.remove('active');
      } catch (err) {
        showToast(err.message || 'Failed to process request.', 'danger');
      } finally {
        btn.classList.remove('btn-loading');
      }
    });
  }
}

/**
 * Quick-fill credentials for demo testing
 */
function initDemoCredentials() {
  const adminDemoBtn = document.getElementById('fillAdminDemo');
  const instDemoBtn = document.getElementById('fillInstDemo');
  const studentDemoBtn = document.getElementById('fillStudentDemo');

  const emailField = document.getElementById('loginEmail');
  const passwordField = document.getElementById('loginPassword');

  if (adminDemoBtn && emailField && passwordField) {
    adminDemoBtn.addEventListener('click', () => {
      emailField.value = 'admin@certitrust.io';
      passwordField.value = 'Admin@123456';
      showToast('Admin credentials filled.', 'info');
    });
  }

  if (instDemoBtn && emailField && passwordField) {
    instDemoBtn.addEventListener('click', () => {
      emailField.value = 'registrar@tech-academy.edu';
      passwordField.value = 'Admin@123456';
      showToast('Institution credentials filled.', 'info');
    });
  }

  if (studentDemoBtn && emailField && passwordField) {
    studentDemoBtn.addEventListener('click', () => {
      emailField.value = 'student@certitrust.io';
      passwordField.value = 'Admin@123456';
      showToast('Student credentials filled.', 'info');
    });
  }
}
