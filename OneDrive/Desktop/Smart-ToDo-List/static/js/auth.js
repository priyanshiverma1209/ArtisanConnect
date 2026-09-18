/*
 * Enhanced Auth Scripting & Validation Engine for AI Task Manager
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Password Visibility Toggler
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    btn.textContent = '🕶️';
                    btn.setAttribute('aria-label', 'Hide password');
                } else {
                    passwordInput.type = 'password';
                    btn.textContent = '👁️';
                    btn.setAttribute('aria-label', 'Show password');
                }
            }
        });
    });

    // 2. Real-time Password Strength Meter & Match Validator
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password') || document.getElementById('confirm_password');

    if (passwordInput) {
        // Create strength meter bar dynamically if not already in DOM
        let strengthMeter = document.getElementById('password-strength-container');
        if (!strengthMeter && passwordInput.closest('.form-group')) {
            strengthMeter = document.createElement('div');
            strengthMeter.id = 'password-strength-container';
            strengthMeter.className = 'password-strength-container';
            strengthMeter.innerHTML = `
                <div class="strength-track">
                    <div class="strength-bar" id="strength-bar"></div>
                </div>
                <div class="strength-label-text" id="strength-label">Password strength</div>
            `;
            passwordInput.closest('.form-group').appendChild(strengthMeter);
        }

        const strengthBar = document.getElementById('strength-bar');
        const strengthLabel = document.getElementById('strength-label');

        function evaluatePasswordStrength(val) {
            if (!val) return { score: 0, text: 'Password strength', color: 'transparent', width: '0%' };
            let score = 0;
            if (val.length >= 8) score += 1;
            if (val.length >= 12) score += 1;
            if (/[A-Z]/.test(val)) score += 1;
            if (/[0-9]/.test(val)) score += 1;
            if (/[^A-Za-z0-9]/.test(val)) score += 1;

            if (score <= 2) {
                return { score, text: 'Weak password', color: '#ef4444', width: '30%' };
            } else if (score <= 3) {
                return { score, text: 'Fair password', color: '#f59e0b', width: '60%' };
            } else if (score === 4) {
                return { score, text: 'Good password', color: '#3b82f6', width: '80%' };
            } else {
                return { score, text: 'Strong & secure password', color: '#10b981', width: '100%' };
            }
        }

        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const res = evaluatePasswordStrength(val);
            if (strengthBar && strengthLabel) {
                strengthBar.style.width = res.width;
                strengthBar.style.backgroundColor = res.color;
                strengthLabel.textContent = res.text;
                strengthLabel.style.color = res.score > 0 ? res.color : 'var(--text-muted)';
            }
            checkPasswordMatch();
        });
    }

    function checkPasswordMatch() {
        if (!passwordInput || !confirmPasswordInput) return;
        const p1 = passwordInput.value;
        const p2 = confirmPasswordInput.value;
        
        if (p2.length > 0) {
            if (p1 === p2) {
                confirmPasswordInput.style.borderColor = '#10b981';
            } else {
                confirmPasswordInput.style.borderColor = '#ef4444';
            }
        } else {
            confirmPasswordInput.style.borderColor = '';
        }
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // 3. Form Submission Handling with Validations
    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const submitBtn = form.querySelector('button[type="submit"]');
            const pwd = form.querySelector('input[name="password"]');
            const confirmPwd = form.querySelector('input[name="confirm_password"]');
            
            if (pwd && confirmPwd && pwd.value !== confirmPwd.value) {
                e.preventDefault();
                showToast('Passwords do not match. Please re-enter.', 'error');
                confirmPwd.focus();
                return;
            }
            if (pwd && pwd.value.length < 8) {
                e.preventDefault();
                showToast('Password must be at least 8 characters long.', 'error');
                pwd.focus();
                return;
            }

            if (submitBtn) {
                const loadingText = submitBtn.getAttribute('data-loading-text') || 'Processing...';
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>⏳</span> ${loadingText}`;
            }
        });
    });

    // 4. Copy Unique ID Helper with Animated Feedback
    const copyUidBtn = document.getElementById('copy-uid-btn') || document.getElementById('copy-profile-uid-btn');
    const uidTextEl = document.getElementById('unique-id-display') || document.getElementById('profile-uid-text');

    if (copyUidBtn && uidTextEl) {
        copyUidBtn.addEventListener('click', () => {
            const uid = uidTextEl.textContent.trim();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(uid).then(() => {
                    showToast(`Copied ${uid} to clipboard!`, 'success');
                    copyUidBtn.innerHTML = '<span>✅</span> Copied!';
                    setTimeout(() => {
                        copyUidBtn.innerHTML = '<span>📋</span> Copy';
                    }, 2000);
                }).catch(() => {
                    fallbackCopyText(uid);
                });
            } else {
                fallbackCopyText(uid);
            }
        });
    }

    function fallbackCopyText(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast(`Copied ${text} to clipboard!`, 'success');
            if (copyUidBtn) {
                copyUidBtn.innerHTML = '<span>✅</span> Copied!';
                setTimeout(() => { copyUidBtn.innerHTML = '<span>📋</span> Copy'; }, 2000);
            }
        } catch (e) {
            showToast('Unable to copy to clipboard', 'error');
        }
        document.body.removeChild(ta);
    }

    // 5. Process Flashed Messages Rendered into HTML
    const flashMessages = document.querySelectorAll('.flash-message-data');
    flashMessages.forEach(el => {
        const message = el.getAttribute('data-message');
        const category = el.getAttribute('data-category') || 'info';
        if (message) {
            showToast(message, category === 'success' ? 'success' : 'error');
        }
    });
});

// Toast Alert Engine with Progress Bar & Auto-Dismiss
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Clear existing toasts for crisp experience
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close-btn" style="background: none; border: none; font-size: 1rem; cursor: pointer; color: inherit; margin-left: auto; opacity: 0.7;" aria-label="Close notification">&times;</button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        });
    }

    container.appendChild(toast);
    toast.offsetHeight; // Force reflow
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3200);
}
