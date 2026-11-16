/**
 * CertiTrust Institution Portal Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce auth & role check
  await verifyInstitutionSession();

  // Route-specific initializers
  if (document.getElementById('institutionDashboardContainer')) {
    initInstitutionDashboard();
  }

  if (document.getElementById('issueCertificateForm')) {
    initCertificateIssuance();
  }

  if (document.getElementById('institutionCertificatesTable')) {
    initCertificatesManagement();
  }

  if (document.getElementById('institutionProfileForm')) {
    initProfileSettings();
  }
});

let currentInstitution = null;

async function verifyInstitutionSession() {
  try {
    const res = await API.auth.getMe();
    if (!res.success || !res.user) {
      window.location.href = '/login';
      return;
    }

    if (res.user.role !== 'institution' && res.user.role !== 'admin') {
      showToast('Access restricted to accredited educational institutions.', 'danger');
      setTimeout(() => { window.location.href = '/'; }, 1000);
      return;
    }

    currentInstitution = res.institution;

    // Populate sidebar user details
    const userNameEl = document.getElementById('sidebarUserName');
    const userRoleEl = document.getElementById('sidebarUserRole');
    const instNameEl = document.getElementById('sidebarInstName');
    const userAvatarEl = document.getElementById('sidebarUserAvatar');

    if (userNameEl) userNameEl.textContent = res.user.fullName;
    if (userRoleEl) userRoleEl.textContent = res.institution?.institutionName || 'Institution Admin';
    if (instNameEl) instNameEl.textContent = res.institution?.institutionName || 'Institution';
    if (userAvatarEl) userAvatarEl.textContent = res.user.fullName.charAt(0);

    // If pending approval, display warning banner
    if (res.institution && res.institution.approvalStatus === 'pending') {
      const banner = document.getElementById('institutionApprovalNotice');
      if (banner) banner.classList.remove('hidden');
    }
  } catch (err) {
    window.location.href = '/login';
  }
}

/**
 * Initialize Institution Dashboard Metrics & Charts
 */
async function initInstitutionDashboard() {
  try {
    const res = await API.institution.getDashboard();
    if (!res.success) return;

    const { metrics, charts, recentCertificates } = res;

    // Populate Metrics
    const totalIssuedEl = document.getElementById('metricTotalIssued');
    const activeCertsEl = document.getElementById('metricActiveCerts');
    const revokedCertsEl = document.getElementById('metricRevokedCerts');
    const verificationsEl = document.getElementById('metricVerifications');

    if (totalIssuedEl) totalIssuedEl.textContent = metrics.totalIssued.toLocaleString();
    if (activeCertsEl) activeCertsEl.textContent = metrics.activeCerts.toLocaleString();
    if (revokedCertsEl) revokedCertsEl.textContent = metrics.revokedCerts.toLocaleString();
    if (verificationsEl) verificationsEl.textContent = metrics.verificationAttempts.toLocaleString();

    // Render Charts
    renderIssuanceTrendChart(charts.monthlyIssuance);
    renderStatusDistributionChart(charts.statusDistribution);

    // Render Recent Issued Table
    const recentTableBody = document.getElementById('recentIssuedTableBody');
    if (recentTableBody && recentCertificates) {
      if (recentCertificates.length === 0) {
        recentTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--color-text-muted);">No certificates issued yet.</td></tr>`;
      } else {
        recentTableBody.innerHTML = recentCertificates.map((cert) => {
          let pill = 'status-valid';
          if (cert.status === 'revoked') pill = 'status-revoked';
          if (cert.status === 'expired') pill = 'status-expired';

          return `
            <tr>
              <td><span style="font-family: var(--font-mono); font-weight: 700;">${cert.certificateId}</span></td>
              <td><strong>${cert.studentName}</strong><br><small style="color:var(--color-text-muted)">${cert.studentEmail}</small></td>
              <td>${cert.courseName}</td>
              <td>${new Date(cert.issueDate).toLocaleDateString()}</td>
              <td><span class="status-pill ${pill}">${cert.status}</span></td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <a href="/api/certificates/${encodeURIComponent(cert.certificateId)}/pdf" target="_blank" class="btn btn-secondary btn-sm" title="Download PDF">
                    <i data-lucide="download" style="width:14px;height:14px;"></i> PDF
                  </a>
                  <a href="/certificate-details?id=${encodeURIComponent(cert.certificateId)}" class="btn btn-outline btn-sm" title="View Details">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i>
                  </a>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
      }
    }
  } catch (error) {
    showToast('Failed to load dashboard statistics.', 'danger');
  }
}

/**
 * Chart 1: Monthly Issuance
 */
function renderIssuanceTrendChart(data = []) {
  const canvas = document.getElementById('issuanceChartCanvas');
  if (!canvas || !window.Chart) return;

  const labels = data.length ? data.map((d) => d.label) : ['Past Months', 'Current'];
  const values = data.length ? data.map((d) => d.count) : [0, 0];

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Certificates Issued',
          data: values,
          backgroundColor: '#315EFB',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0B1533',
          padding: 10,
          cornerRadius: 6,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: '#E5EAF2' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

/**
 * Chart 2: Status Distribution
 */
function renderStatusDistributionChart(dist = {}) {
  const canvas = document.getElementById('statusChartCanvas');
  if (!canvas || !window.Chart) return;

  const validCount = dist.valid || 0;
  const revokedCount = dist.revoked || 0;
  const expiredCount = dist.expired || 0;

  new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Valid / Active', 'Revoked', 'Expired'],
      datasets: [
        {
          data: [validCount, revokedCount, expiredCount],
          backgroundColor: ['#16A34A', '#D97706', '#EA580C'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { family: 'Inter', size: 12 } },
        },
      },
      cutout: '72%',
    },
  });
}

/**
 * Certificate Issuance Logic with Real-Time Certificate Preview
 */
function initCertificateIssuance() {
  const form = document.getElementById('issueCertificateForm');
  if (!form) return;

  // Real-time Preview Elements
  const prevName = document.getElementById('previewStudentName');
  const prevId = document.getElementById('previewStudentId');
  const prevCourse = document.getElementById('previewCourseName');
  const prevTitle = document.getElementById('previewCertTitle');
  const prevDate = document.getElementById('previewIssueDate');
  const prevInst = document.getElementById('previewInstitutionName');

  // Input Elements
  const inName = document.getElementById('studentName');
  const inId = document.getElementById('studentId');
  const inCourse = document.getElementById('courseName');
  const inTitle = document.getElementById('certificateTitle');
  const inDate = document.getElementById('issueDate');

  if (prevInst && currentInstitution) {
    prevInst.textContent = currentInstitution.institutionName;
  }

  // Live input sync
  inName?.addEventListener('input', (e) => {
    if (prevName) prevName.textContent = e.target.value.trim() || 'Student Full Name';
  });

  inId?.addEventListener('input', (e) => {
    if (prevId) prevId.textContent = e.target.value.trim() ? `Student ID: ${e.target.value.trim()}` : 'Student ID: STU-XXXX-XXXX';
  });

  inCourse?.addEventListener('input', (e) => {
    if (prevCourse) prevCourse.textContent = e.target.value.trim() || 'Selected Course or Certification Program';
  });

  inTitle?.addEventListener('input', (e) => {
    if (prevTitle) prevTitle.textContent = e.target.value.trim() || 'CERTIFICATE OF ACHIEVEMENT';
  });

  inDate?.addEventListener('change', (e) => {
    if (prevDate) {
      prevDate.textContent = e.target.value ? new Date(e.target.value).toLocaleDateString() : new Date().toLocaleDateString();
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      studentName: inName.value.trim(),
      studentId: inId.value.trim(),
      studentEmail: document.getElementById('studentEmail').value.trim(),
      courseName: inCourse.value.trim(),
      certificateTitle: inTitle.value.trim() || 'Certificate of Completion',
      grade: document.getElementById('grade')?.value.trim() || '',
      issueDate: inDate.value || new Date().toISOString(),
      expiryDate: document.getElementById('expiryDate')?.value || null,
      additionalInfo: document.getElementById('additionalInfo')?.value.trim() || '',
    };

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    try {
      const res = await API.institution.issueCertificate(payload);
      showToast('Certificate successfully issued and registered!', 'success');

      // Show success modal with QR Code and Download Link
      showIssuanceSuccessModal(res.certificate);
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to issue certificate.', 'danger');
    } finally {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }
  });
}

function showIssuanceSuccessModal(cert) {
  let modal = document.getElementById('issueSuccessModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'issueSuccessModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content animate-slide-up" style="max-width: 600px;">
      <div class="modal-header" style="background: var(--color-status-valid-bg);">
        <div style="display:flex; align-items:center; gap: 10px;">
          <div style="width:32px; height:32px; border-radius:50%; background:var(--color-status-valid); color:#fff; display:flex; align-items:center; justify-content:center;">
            <i data-lucide="check" style="width:18px;height:18px;"></i>
          </div>
          <h3 style="color: #14532D; font-size: 1.25rem;">Certificate Issued Successfully</h3>
        </div>
        <button class="modal-close" id="closeSuccessModal">&times;</button>
      </div>
      <div class="modal-body" style="text-align: center; padding: 28px;">
        <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
          The credential has been securely registered in the CertiTrust network with a cryptographic record and QR code.
        </p>

        <div style="background: var(--color-bg-subtle); padding: 20px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); margin-bottom: 24px;">
          <div style="font-size: 0.75rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted);">Assigned Certificate ID</div>
          <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 800; color: var(--color-royal-blue); margin: 6px 0;">${cert.certificateId}</div>
          <div style="font-size: 0.9rem; color: var(--color-text-primary);">Awarded to: <strong>${cert.studentName}</strong> (${cert.studentEmail})</div>
        </div>

        <div style="margin-bottom: 24px;">
          <img src="${cert.qrCodeDataUri}" alt="Verification QR Code" style="width: 140px; height: 140px; margin: 0 auto; border: 1px solid var(--color-border); padding: 6px; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 6px;">Live Verification QR Code</div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/api/certificates/${encodeURIComponent(cert.certificateId)}/pdf" target="_blank" class="btn btn-primary">
            <i data-lucide="download"></i> Download PDF
          </a>
          <a href="/verify?id=${encodeURIComponent(cert.certificateId)}" target="_blank" class="btn btn-secondary">
            <i data-lucide="external-link"></i> Verify Now
          </a>
          <button class="btn btn-outline" id="doneModalBtn">Done</button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();

  const closeActions = () => modal.classList.remove('active');
  document.getElementById('closeSuccessModal')?.addEventListener('click', closeActions);
  document.getElementById('doneModalBtn')?.addEventListener('click', closeActions);
}

/**
 * Certificate Management (Table, Search, Filter, Pagination, Revocation)
 */
let currentCertPage = 1;

async function initCertificatesManagement() {
  const searchInput = document.getElementById('searchCertInput');
  const statusFilter = document.getElementById('statusFilterSelect');

  loadCertificatesTable();

  searchInput?.addEventListener('input', debounce(() => {
    currentCertPage = 1;
    loadCertificatesTable();
  }, 350));

  statusFilter?.addEventListener('change', () => {
    currentCertPage = 1;
    loadCertificatesTable();
  });
}

async function loadCertificatesTable() {
  const tableBody = document.getElementById('institutionCertificatesTable');
  const paginationContainer = document.getElementById('certPaginationContainer');
  if (!tableBody) return;

  const search = document.getElementById('searchCertInput')?.value || '';
  const status = document.getElementById('statusFilterSelect')?.value || '';

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px;"><div class="btn-loading" style="display:inline-block; width:24px; height:24px;"></div></td></tr>`;

  try {
    const res = await API.institution.getCertificates({ search, status, page: currentCertPage, limit: 10 });
    if (!res.success || !res.certificates || res.certificates.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 36px; color: var(--color-text-muted);">No matching certificate records found.</td></tr>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    tableBody.innerHTML = res.certificates.map((cert) => {
      let pill = 'status-valid';
      if (cert.status === 'revoked') pill = 'status-revoked';
      if (cert.status === 'expired') pill = 'status-expired';

      return `
        <tr>
          <td><span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary-navy);">${cert.certificateId}</span></td>
          <td><strong>${cert.studentName}</strong><br><small style="color:var(--color-text-muted)">${cert.studentEmail}</small></td>
          <td>${cert.courseName}</td>
          <td>${new Date(cert.issueDate).toLocaleDateString()}</td>
          <td>${cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'Lifetime'}</td>
          <td><span class="status-pill ${pill}">${cert.status}</span></td>
          <td>
            <div style="display:flex; gap: 6px;">
              <a href="/api/certificates/${encodeURIComponent(cert.certificateId)}/pdf" target="_blank" class="btn btn-secondary btn-sm" title="Download Official PDF">
                <i data-lucide="download" style="width:14px;height:14px;"></i>
              </a>
              <a href="/certificate-details?id=${encodeURIComponent(cert.certificateId)}" class="btn btn-outline btn-sm" title="View Public Record">
                <i data-lucide="eye" style="width:14px;height:14px;"></i>
              </a>
              ${cert.status === 'valid' ? `
                <button onclick="openRevokeModal('${cert._id}', '${cert.certificateId}')" class="btn btn-danger btn-sm" title="Revoke Certificate">
                  <i data-lucide="slash" style="width:14px;height:14px;"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
    renderPaginationControls(res.currentPage, res.totalPages, (newPage) => {
      currentCertPage = newPage;
      loadCertificatesTable();
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-status-invalid); padding: 24px;">Failed to load certificates.</td></tr>`;
  }
}

/**
 * Revocation Modal
 */
window.openRevokeModal = function (certDbId, certPublicId) {
  let modal = document.getElementById('revokeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'revokeModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content animate-slide-up" style="max-width: 500px;">
      <div class="modal-header">
        <h3 style="color: var(--color-status-invalid);">Revoke Certificate ${certPublicId}</h3>
        <button class="modal-close" onclick="document.getElementById('revokeModal').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
          Revoking a certificate permanently marks it as invalid across the verification network. Please provide an official justification.
        </p>
        <div class="form-group">
          <label class="form-label">Revocation Reason <span class="required">*</span></label>
          <textarea id="revokeReasonInput" class="form-textarea" placeholder="E.g., Incomplete coursework compliance, honor code infraction, or errant issuance."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('revokeModal').classList.remove('active')">Cancel</button>
        <button id="confirmRevokeBtn" class="btn btn-danger">Confirm Revocation</button>
      </div>
    </div>
  `;

  modal.classList.add('active');

  document.getElementById('confirmRevokeBtn')?.addEventListener('click', async () => {
    const reason = document.getElementById('revokeReasonInput').value.trim();
    if (!reason) {
      showToast('Please provide a reason for revocation.', 'warning');
      return;
    }

    try {
      await API.institution.requestRevocation(certDbId, reason);
      showToast(`Certificate ${certPublicId} has been revoked.`, 'success');
      modal.classList.remove('active');
      loadCertificatesTable();
    } catch (err) {
      showToast(err.message || 'Revocation failed.', 'danger');
    }
  });
};

function renderPaginationControls(current, total, onPageChange) {
  const container = document.getElementById('certPaginationContainer');
  if (!container || total <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">`;
  html += `<span style="font-size:0.85rem; color:var(--color-text-muted);">Page ${current} of ${total}</span>`;
  html += `<div style="display:flex; gap:6px;">`;

  if (current > 1) {
    html += `<button class="btn btn-secondary btn-sm" id="prevPageBtn">&laquo; Prev</button>`;
  }

  for (let i = 1; i <= total; i++) {
    html += `<button class="btn ${i === current ? 'btn-primary' : 'btn-secondary'} btn-sm" data-page="${i}">${i}</button>`;
  }

  if (current < total) {
    html += `<button class="btn btn-secondary btn-sm" id="nextPageBtn">Next &raquo;</button>`;
  }

  html += `</div></div>`;
  container.innerHTML = html;

  document.getElementById('prevPageBtn')?.addEventListener('click', () => onPageChange(current - 1));
  document.getElementById('nextPageBtn')?.addEventListener('click', () => onPageChange(current + 1));
  container.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.getAttribute('data-page'), 10)));
  });
}

function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}
