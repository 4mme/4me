(function () {

    let bound = false;

    function updateButtonState() {
        const btn = document.getElementById('btnInstallQxgOfficial');
        if (!btn) return;

        const app = window.app;

        btn.disabled = !(
            app &&
            app.adb &&
            !app.isInstalling
        );
    }

    async function installQxgOfficial() {
        const app = window.app;
        if (!app || !app.adb || app.isInstalling) return;

        app.isInstalling = true;
        updateButtonState();
        app.updateAllButtons?.();

        try {
            app.log('🔧 使用官方方式安装并激活权限狗');

            const adb = app.adb;
            const exec = app.execShell.bind(app);

            const apkPath = '/data/local/tmp/qxg.apk';
            const shPath  = '/data/local/tmp/qxg.sh';

            app.showProgress?.(true, '权限狗', '正在安装并激活...', false);

            // 下载并推送 APK
            const apkResp = await fetch('/apk/qxg.apk');
            if (!apkResp.ok) throw new Error('APK 下载失败');
            const apkBlob = await apkResp.blob();

            let sync = await adb.sync();
            await sync.push(apkBlob, apkPath, 0o644);
            await sync.quit();

            // 安装
            await exec('setprop persist.sv.enable_adb_install 1');
            const out = await exec(`pm install -g -r ${apkPath}`);
            if (!out.includes('Success')) throw new Error(out);

            // 下载并执行激活脚本
            const shResp = await fetch('/apk/qxg.sh');
            if (!shResp.ok) throw new Error('激活脚本下载失败');
            const shBlob = await shResp.blob();

            sync = await adb.sync();
            await sync.push(shBlob, shPath, 0o755);
            await sync.quit();

            await exec(`chmod 755 ${shPath}`);
            await exec(`sh ${shPath}`);
            await exec('setprop persist.sv.enable_adb_install 0');

            app.log('✅ 权限狗安装并激活成功');
            app.showProgress?.(true, '完成', '权限狗已激活', false);
            setTimeout(() => app.showProgress?.(false), 800);

        } catch (e) {
            app.log('❌ 权限狗安装失败：' + e.message);
            app.showProgress?.(true, '失败', e.message, false);
            setTimeout(() => app.showProgress?.(false), 1200);
        } finally {
            app.isInstalling = false;
            updateButtonState();
            app.updateAllButtons?.();
        }
    }

    function waitForApp() {
        const app = window.app;
        const btn = document.getElementById('btnInstallQxgOfficial');

        if (!app || !btn) {
            setTimeout(waitForApp, 300);
            return;
        }

        // ✅ 只绑定一次
        if (!bound) {
            btn.addEventListener('click', installQxgOfficial);
            bound = true;
        }

        // ✅ 持续同步按钮状态
        updateButtonState();
        setTimeout(waitForApp, 500);
    }

    waitForApp();

})();