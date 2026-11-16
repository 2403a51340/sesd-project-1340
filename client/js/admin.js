/**
 * CertiTrust Administrator Portal Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await verifyAdminSession();

  // Tab switching inside admin portal
  initAdminNavigation();

  // Load Initial Overview
  loadAdminOverview();
  loadInstitutionsTable();
  loadVerificationLogsTable();
  loadSuspiciousActivityView();
  loadAuditLogsTable();
});

let adminCurrentTab = 'overview';

async function verifyAdminSession() {
  try {
    const res = await API.auth.getMe();
    if (!res.success || !res.user || res.user.role !== 'admin') {
      showToast('Administrator privileges required.', 'danger');
      window.location.href = '/login';
      return;
    }

    const nameEl = document.getElementById('adminSidebarName');
    const avatarEl = document.getElementById('adminSidebarAvatar');
    if (nameEl) nameEl.textContent = res.user.fullName;
    if (avatarEl) avatarEl.textContent = res.user.fullName.charAt(0);
  } catch (err) {
    window.location.href = '/login';
  }
}

function initAdminNavigation() {
  const navLinks = document.querySelectorAll('.admin-nav-link');
  const sections = document.querySelectorAll('.admin-section-pane');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');

      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach((sec) => {
        if (sec.id === `admin-${targetTab}-pane`) {
          sec.classList.remove('hidden');
        } else {
          sec.classList.add('hidden');
        }
      });

      adminCurrentTab = targetTab;
      const titleEl = document.getElementById('adminPageTitle');
      if (titleEl) {
        titleEl.textContent = link.textContent.trim();
      }

      // Re-trigger icon updates
      if (window.lucide) window.lucide.createIcons();
    });
  });
}

/**
 * Load Overview Metrics & Pending Approvals
 */
async function loadAdminOverview() {
  try {
    const res = await API.admin.getDashboard();
    if (!res.success) return;

    const { metrics, pendingList, recentAudits } = res;

    // Overview numbers
    const totalInstEl = document.getElementById('adminMetricTotalInstitutions');
    const pendingInstEl = document.getElementById('adminMetricPendingInstitutions');
    const totalCertsEl = document.getElementById('adminMetricTotalCertificates');
    const suspiciousEl = document.getElementById('adminMetricSuspicious');

    if (totalInstEl) totalInstEl.textContent = metrics.totalInstitutions;
    if (pendingInstEl) pendingInstEl.textContent = metrics.pendingInstitutions;
    if (totalCertsEl) totalCertsEl.textContent = metrics.totalCertificates;
    if (suspiciousEl) suspiciousEl.textContent = metrics.suspiciousCount;

    // Pending institutions quick action list
    const pendingContainer = document.getElementById('adminPendingListContainer');
    if (pendingContainer) {
      if (!pendingList || pendingList.length === 0) {
        pendingContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--color-text-muted);">No pending institutional applications.</div>`;
      } else {
        pendingContainer.innerHTML = pendingList.map((inst) => `
          <div style="display:flex; align-items:center; justify-content:space-between; padding: 14px 18px; border:1px solid var(--color-border); border-radius:8px; margin-bottom:10px; background:#fff;">
            <div>
              <div style="font-weight:700; color:var(--color-primary-navy);">${inst.institutionName}</div>
              <div style="font-size:0.8rem; color:var(--color-text-secondary);">${inst.institutionType} &bull; ${inst.officialEmail}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button onclick="approveInstitution('${inst._id}', '${inst.institutionName}')" class="btn btn-primary btn-sm">
                <i data-lucide="check" style="width:14px;height:14px;"></i> Approve
              </button>
              <button onclick="rejectInstitution('${inst._id}', '${inst.institutionName}')" class="btn btn-danger btn-sm">
                <i data-lucide="x" style="width:14px;height:14px;"></i> Reject
              </button>
            </div>
          </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
      }
    }
  } catch (err) {
    showToast('Failed to load administrator dashboard data.', 'danger');
  }
}

/**
 * Institutions Table Management
 */
async function loadInstitutionsTable() {
  const tbody = document.getElementById('adminInstitutionsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">Loading institutions...</td></tr>`;

  try {
    const res = await API.admin.getInstitutions({ limit: 50 });
    if (!res.success || !res.institutions || res.institutions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color:var(--color-text-muted);">No institutions registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.institutions.map((inst) => {
      let pill = 'status-pending';
      if (inst.approvalStatus === 'approved') pill = 'status-valid';
      if (inst.approvalStatus === 'rejected') pill = 'status-invalid';
      if (inst.approvalStatus === 'suspended') pill = 'status-revoked';

      return `
        <tr>
          <td>
            <strong>${inst.institutionName}</strong><br>
            <small style="color:var(--color-text-muted)">${inst.website || 'No website'}</small>
          </td>
          <td>${inst.institutionType}</td>
          <td>${inst.officialEmail}<br><small style="color:var(--color-text-muted)">${inst.phone}</small></td>
          <td><span class="status-pill ${pill}">${inst.approvalStatus}</span></td>
          <td>${new Date(inst.createdAt).toLocaleDateString()}</td>
          <td>
            <div style="display:flex; gap:6px;">
              ${inst.approvalStatus !== 'approved' ? `
                <button onclick="approveInstitution('${inst._id}', '${inst.institutionName}')" class="btn btn-primary btn-sm" title="Approve">
                  <i data-lucide="check" style="width:14px;height:14px;"></i>
                </button>
              ` : `
                <button onclick="suspendInstitution('${inst._id}', '${inst.institutionName}')" class="btn btn-outline btn-sm" title="Suspend">
                  <i data-lucide="pause-circle" style="width:14px;height:14px;"></i>
                </button>
              `}
              ${inst.approvalStatus !== 'rejected' ? `
                <button onclick="rejectInstitution('${inst._id}', '${inst.institutionName}')" class="btn btn-danger btn-sm" title="Reject">
                  <i data-lucide="x" style="width:14px;height:14px;"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-status-invalid); padding: 24px;">Failed to load institutions.</td></tr>`;
  }
}

window.approveInstitution = async function (id, name) {
  if (!confirm(`Are you sure you want to approve "${name}"? Approved institutions can issue verified credentials.`)) return;

  try {
    const res = await API.admin.approveInstitution(id);
    showToast(res.message || 'Institution approved successfully!', 'success');
    loadAdminOverview();
    loadInstitutionsTable();
  } catch (err) {
    showToast(err.message || 'Approval failed.', 'danger');
  }
};

window.rejectInstitution = async function (id, name) {
  const reason = prompt(`Enter reason for rejecting "${name}":`, 'Failed compliance review.');
  if (reason === null) return;

  try {
    const res = await API.admin.rejectInstitution(id, reason);
    showToast(res.message || 'Institution rejected.', 'warning');
    loadAdminOverview();
    loadInstitutionsTable();
  } catch (err) {
    showToast(err.message || 'Rejection failed.', 'danger');
  }
};

window.suspendInstitution = async function (id, name) {
  if (!confirm(`Suspend "${name}"? Their credential issuance capability will be halted.`)) return;

  try {
    const res = await API.admin.suspendInstitution(id);
    showToast(res.message || 'Institution suspended.', 'warning');
    loadInstitutionsTable();
  } catch (err) {
    showToast(err.message || 'Suspension failed.', 'danger');
  }
};

/**
 * Load Verification Logs
 */
async function loadVerificationLogsTable() {
  const tbody = document.getElementById('adminVerificationLogsTableBody');
  if (!tbody) return;

  try {
    const res = await API.admin.getVerificationLogs({ limit: 40 });
    if (!res.success || !res.logs || res.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--color-text-muted);">No verification logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.logs.map((log) => {
      let pill = 'status-valid';
      if (log.result === 'INVALID' || log.result === 'NOT_FOUND') pill = 'status-invalid';
      if (log.result === 'REVOKED') pill = 'status-revoked';
      if (log.result === 'EXPIRED') pill = 'status-expired';
      if (log.result === 'CONFLICT') pill = 'status-conflict';

      return `
        <tr>
          <td><span style="font-family:var(--font-mono); font-weight:700;">${log.certificateId}</span></td>
          <td><span class="status-pill ${pill}">${log.result}</span></td>
          <td>${log.source || 'web_manual'}</td>
          <td>${log.requestMetadata?.ipAddress || '127.0.0.1'}</td>
          <td>${new Date(log.timestamp).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-status-invalid); padding:24px;">Failed to load verification logs.</td></tr>`;
  }
}

/**
 * Load Suspicious Activity
 */
async function loadSuspiciousActivityView() {
  const conflictsContainer = document.getElementById('adminConflictsContainer');
  const ipsContainer = document.getElementById('adminSuspiciousIpsContainer');

  try {
    const res = await API.admin.getSuspiciousActivity();
    if (!res.success) return;

    if (conflictsContainer) {
      if (!res.conflicts || res.conflicts.length === 0) {
        conflictsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--color-text-muted);">No duplicate ID collisions detected. System integrity normal.</div>`;
      } else {
        conflictsContainer.innerHTML = res.conflicts.map((c) => `
          <div style="padding:12px 16px; border:1px solid var(--color-status-conflict-border); background:var(--color-status-conflict-bg); border-radius:6px; margin-bottom:8px;">
            <div style="font-weight:700; color:var(--color-status-conflict);">CONFLICT FLAG: ID ${c.certificateId}</div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary);">Source IP: ${c.requestMetadata?.ipAddress} &bull; Timestamp: ${new Date(c.timestamp).toLocaleString()}</div>
          </div>
        `).join('');
      }
    }

    if (ipsContainer) {
      if (!res.suspiciousIps || res.suspiciousIps.length === 0) {
        ipsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--color-text-muted);">No rapid-failure IP spikes observed.</div>`;
      } else {
        ipsContainer.innerHTML = res.suspiciousIps.map((ip) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border:1px solid var(--color-border); border-radius:6px; margin-bottom:6px; background:#fff;">
            <div>
              <span style="font-family:var(--font-mono); font-weight:700;">${ip._id}</span>
              <div style="font-size:0.75rem; color:var(--color-text-muted);">Last Attempt: ${new Date(ip.lastAttempt).toLocaleTimeString()}</div>
            </div>
            <span class="status-pill status-invalid">${ip.failedCount} Failed Attempts</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    // Fail gracefully
  }
}

/**
 * Load Platform Audit Logs
 */
async function loadAuditLogsTable() {
  const tbody = document.getElementById('adminAuditLogsTableBody');
  if (!tbody) return;

  try {
    const res = await API.admin.getAuditLogs({ limit: 40 });
    if (!res.success || !res.logs || res.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--color-text-muted);">No audit logs available.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.logs.map((a) => `
      <tr>
        <td><strong>${a.action}</strong></td>
        <td>${a.userEmail || 'system'}</td>
        <td>${a.entityType} (${a.entityId || 'N/A'})</td>
        <td>${a.ipAddress || '127.0.0.1'}</td>
        <td>${new Date(a.timestamp).toLocaleString()}</td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-status-invalid); padding:24px;">Failed to load audit logs.</td></tr>`;
  }
}
