(function () {

    const SEED = 20250110;

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function getMmddhh() {
        const d = new Date();
        return pad(d.getMonth() + 1) +
               pad(d.getDate()) +
               pad(d.getHours());
    }

    function getEngineeringCode() {
        const mmddhh = Number(getMmddhh());
        const hh = new Date().getHours();
        const code = String(SEED * mmddhh - hh).slice(-6);
        return `*#${code}#*`;
    }

    function getEncryptCode() {
        const mmddhh = Number(getMmddhh());
        return String(SEED * mmddhh).slice(-6);
    }

    function updateUI() {
        const engEl = document.getElementById('engineeringCode');
        const encEl = document.getElementById('encryptCode');
        if (!engEl || !encEl) return;

        engEl.textContent = getEngineeringCode();
        encEl.textContent = getEncryptCode();
    }

    function boot() {
        updateUI();
        setInterval(updateUI, 30 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();