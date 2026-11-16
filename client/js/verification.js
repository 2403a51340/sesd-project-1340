/**
 * CertiTrust Public Verification Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initVerificationInput();
  initAutoVerifyFromQuery();
  initRecentVerifications();
});

/**
 * Handle verification input on verify.html or homepage
 */
function initVerificationInput() {
  const verifyForms = document.querySelectorAll('.verify-form');

  verifyForms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('.verify-input');
      const certId = input?.value.trim();

      if (!certId) {
        showToast('Please enter a Certificate ID.', 'warning');
        return;
      }

      // If we are on verify.html, perform verification inline.
      // If we are on index.html, redirect to /verify?id=...
      if (document.getElementById('verificationResultContainer')) {
        performVerification(certId);
      } else {
        window.location.href = `/verify?id=${encodeURIComponent(certId)}`;
      }
    });
  });

  const clearBtn = document.getElementById('clearVerifyBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = document.getElementById('certificateIdInput');
      if (input) input.value = '';
      const container = document.getElementById('verificationResultContainer');
      if (container) container.innerHTML = '';
      const emptyState = document.getElementById('verifyEmptyState');
      if (emptyState) emptyState.classList.remove('hidden');
    });
  }
}

/**
 * Automatically triggers verification if ?id= is in URL query parameters
 */
function initAutoVerifyFromQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const certId = urlParams.get('id');

  if (certId) {
    const input = document.getElementById('certificateIdInput');
    if (input) input.value = certId;
    performVerification(certId, 'qr_scan');
  }
}

/**
 * Executes the verification request and renders visual state
 */
async function performVerification(certificateId, source = 'web_manual') {
  const resultContainer = document.getElementById('verificationResultContainer');
  const emptyState = document.getElementById('verifyEmptyState');
  const scanVisual = document.getElementById('scanningIndicator');

  if (emptyState) emptyState.classList.add('hidden');
  if (scanVisual) scanVisual.classList.remove('hidden');

  if (resultContainer) {
    resultContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 50px 20px;">
        <div class="flex-center" style="margin-bottom: 20px;">
          <div style="width: 54px; height: 54px; border: 4px solid var(--color-border); border-top-color: var(--color-royal-blue); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        </div>
        <h3>Authenticating Credential...</h3>
        <p>Querying cryptographic registry and checking revocation lists for ID: <strong>${certificateId}</strong></p>
      </div>
    `;
  }

  try {
    const res = await API.verification.verify(certificateId, source);

    if (scanVisual) scanVisual.classList.add('hidden');
    renderVerificationOutcome(res);
  } catch (err) {
    if (scanVisual) scanVisual.classList.add('hidden');
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="card" style="padding: 40px; text-align: center; border-color: var(--color-status-invalid-border);">
          <div style="width: 60px; height: 60px; background: var(--color-status-invalid-bg); color: var(--color-status-invalid); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            <i data-lucide="alert-circle" style="width: 32px; height: 32px;"></i>
          </div>
          <h3 style="color: var(--color-status-invalid); margin-bottom: 8px;">Network or Verification Error</h3>
          <p>${err.message || 'Unable to connect to verification server.'}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

/**
 * Renders the exact status card according to Section 5 Page 3
 */
function renderVerificationOutcome(data) {
  const container = document.getElementById('verificationResultContainer');
  if (!container) return;

  const { status, title, message, certificateId, verifiedAt, details, revocationReason, revocationDate } = data;
  const verifiedDateStr = new Date(verifiedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let statusBadgeClass = 'status-invalid';
  let bannerIcon = 'alert-octagon';
  let bannerBg = 'var(--color-status-invalid-bg)';
  let bannerColor = 'var(--color-status-invalid)';

  if (status === 'VALID') {
    statusBadgeClass = 'status-valid';
    bannerIcon = 'check-circle-2';
    bannerBg = 'var(--color-status-valid-bg)';
    bannerColor = 'var(--color-status-valid)';
  } else if (status === 'REVOKED') {
    statusBadgeClass = 'status-revoked';
    bannerIcon = 'alert-triangle';
    bannerBg = 'var(--color-status-revoked-bg)';
    bannerColor = 'var(--color-status-revoked)';
  } else if (status === 'EXPIRED') {
    statusBadgeClass = 'status-expired';
    bannerIcon = 'clock-alert';
    bannerBg = 'var(--color-status-expired-bg)';
    bannerColor = 'var(--color-status-expired)';
  } else if (status === 'CONFLICT') {
    statusBadgeClass = 'status-conflict';
    bannerIcon = 'shield-alert';
    bannerBg = 'var(--color-status-conflict-bg)';
    bannerColor = 'var(--color-status-conflict)';
  }

  // Build HTML view
  let html = `
    <div class="card animate-slide-up" style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xl); margin-top: 24px;">
      <!-- Result Status Header Banner -->
      <div style="background: ${bannerBg}; border-bottom: 1px solid var(--color-border); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #FFFFFF; color: ${bannerColor}; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); flex-shrink: 0;">
            <i data-lucide="${bannerIcon}" style="width: 28px; height: 28px;"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span class="status-pill ${statusBadgeClass}">${status}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-secondary);">Verified on: ${verifiedDateStr}</span>
            </div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-navy); margin-bottom: 2px;">${title}</h2>
            <p style="font-size: 0.95rem; margin: 0; color: var(--color-text-primary);">${message}</p>
          </div>
        </div>

        <div style="text-align: right;">
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted); letter-spacing: 0.05em;">CERTIFICATE ID</span>
          <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--color-primary-navy);">${certificateId}</div>
        </div>
      </div>
  `;

  // Details body for VALID, REVOKED, or EXPIRED records
  if (details) {
    const issueDateStr = details.issueDate ? new Date(details.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const expiryDateStr = details.expiryDate ? new Date(details.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Lifetime / No Expiration';

    html += `
      <div style="padding: 32px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
          <div style="background: var(--color-bg-subtle); padding: 18px 20px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Credential Holder</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary-navy);">${details.studentName || details.studentNameMasked}</div>
            ${details.studentId ? `<div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">Student ID: ${details.studentId}</div>` : ''}
          </div>

          <div style="background: var(--color-bg-subtle); padding: 18px 20px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Issuing Authority</div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary-navy);">${details.institutionName}</div>
            ${details.institutionType ? `<div style="font-size: 0.85rem; color: var(--color-royal-blue); margin-top: 2px;">${details.institutionType}</div>` : ''}
          </div>

          <div style="background: var(--color-bg-subtle); padding: 18px 20px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Course / Qualification</div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary-navy);">${details.courseName}</div>
            ${details.grade ? `<div style="font-size: 0.85rem; color: var(--color-status-valid); font-weight: 600; margin-top: 2px;">Grade: ${details.grade}</div>` : ''}
          </div>

          <div style="background: var(--color-bg-subtle); padding: 18px 20px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Validity Period</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--color-primary-navy);">Issued: ${issueDateStr}</div>
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">Expires: ${expiryDateStr}</div>
          </div>
        </div>
    `;

    // If Revocation Details are present
    if (status === 'REVOKED' && (revocationReason || revocationDate)) {
      html += `
        <div class="alert alert-warning" style="margin-bottom: 24px;">
          <div>
            <strong>Official Revocation Notice:</strong> ${revocationReason || 'Revoked by authority.'}
            ${revocationDate ? `<div style="font-size: 0.8rem; margin-top: 4px;">Revocation Date: ${new Date(revocationDate).toLocaleDateString('en-US')}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Action buttons for VALID certificates
    if (status === 'VALID') {
      html += `
        <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--color-border); padding-top: 24px;">
          <a href="/api/certificates/${encodeURIComponent(certificateId)}/pdf" target="_blank" class="btn btn-primary">
            <i data-lucide="download"></i> Download Official PDF Certificate
          </a>
          <button id="copyVerifyUrlBtn" class="btn btn-secondary">
            <i data-lucide="copy"></i> Copy Verification Link
          </button>
          <a href="/certificate-details?id=${encodeURIComponent(certificateId)}" class="btn btn-outline">
            <i data-lucide="external-link"></i> Full Certificate View
          </a>
        </div>
      `;
    }

    html += `</div>`;
  } else {
    // Missing, Conflict or Invalid
    html += `
      <div style="padding: 32px; text-align: center;">
        <p style="color: var(--color-text-secondary); max-width: 540px; margin: 0 auto 20px auto;">
          The requested identifier <code>${certificateId}</code> does not correspond to an active legitimate credential in the CertiTrust network. If you suspect credential fraud or an error, contact the issuing institution.
        </p>
        <a href="/verify" class="btn btn-secondary">Try Another Certificate ID</a>
      </div>
    `;
  }

  html += `</div>`;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // Attach copy URL action
  document.getElementById('copyVerifyUrlBtn')?.addEventListener('click', () => {
    const shareUrl = `${window.location.origin}/verify?id=${encodeURIComponent(certificateId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Verification URL copied to clipboard!', 'success');
    });
  });
}

/**
 * Loads recent authentications showcase
 */
async function initRecentVerifications() {
  const recentGrid = document.getElementById('recentVerificationsGrid');
  if (!recentGrid) return;

  try {
    const res = await API.verification.getRecent();
    if (res.success && res.logs && res.logs.length > 0) {
      recentGrid.innerHTML = res.logs.map((log) => {
        let pillClass = 'status-valid';
        if (log.result === 'REVOKED') pillClass = 'status-revoked';
        if (log.result === 'EXPIRED') pillClass = 'status-expired';
        if (log.result === 'NOT_FOUND' || log.result === 'INVALID') pillClass = 'status-invalid';

        const timeAgo = formatTimeAgo(log.timestamp);

        return `
          <div class="card" style="padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary-navy); font-size: 0.95rem;">${log.certificateId}</div>
              <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${log.institutionName}</div>
            </div>
            <div style="text-align: right;">
              <span class="status-pill ${pillClass}">${log.result}</span>
              <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">${timeAgo}</div>
            </div>
          </div>
        `;
      }).join('');
      if (window.lucide) window.lucide.createIcons();
    }
  } catch (err) {
    // Fail silently on public widget
  }
}

function formatTimeAgo(dateInput) {
  const seconds = Math.floor((new Date() - new Date(dateInput)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
