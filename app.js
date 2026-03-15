class WebADBApp {

    static TMP_DIR = '/data/local/tmp/';
    static APP_MANAGER_PKG = 'com.yunpan.appmanage';
    static OSS_BASE = 'https://dl.zzt2.cn/';

    constructor() {
        this.autoConnect = this.autoConnect.bind(this);
        this.safeDisconnect = this.safeDisconnect.bind(this);
        this.installApkFromServer = this.installApkFromServer.bind(this);
        this.installSelectedServerApk = this.installSelectedServerApk.bind(this);
        this.installUploadedApk = this.installUploadedApk.bind(this);
        this.execShell = this.execShell.bind(this);

        this.adb = null;
        this.webusb = null;

        this.isConnecting = false;
        this.isInstalling = false;

        this.uploadedApk = null;
        this.serverApkList = [];

        this.init();
    }

    /* ================= 初始化 ================= */
    init() {
        this.bindEvents();
        this.updateConnectionStatus(false);
        this.updateUploadInstallButton();
        this.log('✅ 张张车机助手已启动');
    }

    /* ================= 事件绑定 ================= */
    bindEvents() {

        document.getElementById('btnAutoConnect')
            ?.addEventListener('click', this.autoConnect);

        document.getElementById('btnSafeDisconnect')
            ?.addEventListener('click', this.safeDisconnect);

        document.getElementById('btnInstallQxg')
            ?.addEventListener('click', () =>
                this.installApkFromServer('yygj.apk', '应用管家')
            );

        document.getElementById('btnLaunchQxg')
            ?.addEventListener('click', () => this.launchAppManager());

        document.getElementById('btnInstallBd')
            ?.addEventListener('click', () =>
                this.installApkFromServer('sfgj.apk', '沙发管家')
            );

        document.getElementById('btnInstallSidebar')
            ?.addEventListener('click', () =>
                this.installApkFromServer('sidebar.apk', '侧边栏')
            );

        document.getElementById('apkUpload')
            ?.addEventListener('change', e => {
                const files = e.target.files;
                this.uploadedApk = files && files.length ? files[0] : null;

                if (this.uploadedApk) {
                    this.log(`📦 已选择本地 APK：${this.uploadedApk.name}`);
                }

                this.updateUploadInstallButton();
            });

        document.getElementById('btnUploadInstall')
            ?.addEventListener('click', this.installUploadedApk);

        document.getElementById('serverApkSelect')
            ?.addEventListener('change', () => {
                this.updateServerApkButton();
            });

        document.getElementById('btnInstallServerApk')
            ?.addEventListener('click', this.installSelectedServerApk);
    }

    /* ================= 连接 ================= */
    async autoConnect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.showProgress(true, '连接设备', '请在车机上允许 USB 调试', true);

        try {
            this.webusb = await window.Adb.open('WebUSB');
            this.adb = await this.webusb.connectAdb('host::');

            this.updateConnectionStatus(true);
            this.log('🎉 ADB 连接成功');

            this.showProgress(true, '连接成功', '设备已连接', false);
            setTimeout(() => this.showProgress(false), 600);

            this.loadServerApkList();
            this.refreshAppManagerStatus();
            this.updateUploadInstallButton();

        } catch (e) {
            this.log(`❌ 连接失败：${e.message}`);
            this.showProgress(true, '连接失败', '请重新尝试', false);
            setTimeout(() => this.showProgress(false), 1200);
            this.cleanupConnection();
            this.updateConnectionStatus(false);
        } finally {
            this.isConnecting = false;
        }
    }

    async safeDisconnect() {
        try { this.webusb?.close(); } catch {}
        this.cleanupConnection();
        this.updateConnectionStatus(false);
        this.updateUploadInstallButton();
        this.log('✅ 已断开连接');
    }

    cleanupConnection() {
        this.adb = null;
        this.webusb = null;
    }

    /* ================= 服务器 APK 列表 ================= */
    async loadServerApkList() {
        const select = document.getElementById('serverApkSelect');
        if (!select) return;

        select.innerHTML = `<option value="">加载中...</option>`;

        try {
            const url =
                    WebADBApp.OSS_BASE + `apk.json?_=${Date.now()}`;

            this.serverApkList = await fetch(url).then(r => r.json());

            select.innerHTML =
                `<option value="">点击选择</option>` +
                this.serverApkList.map(a =>
                    `<option value="${a.file}">${a.name}</option>`
                ).join('');

            this.log(`📦 已加载服务器 APK 列表（${this.serverApkList.length} 个）`);

        } catch {
            select.innerHTML = `<option value="">加载失败</option>`;
            this.log('❌ 获取服务器 APK 列表失败');
        }

        this.updateServerApkButton();
    }

    updateServerApkButton() {
        const btn = document.getElementById('btnInstallServerApk');
        const sel = document.getElementById('serverApkSelect');
        if (!btn) return;

        btn.disabled = !(
            this.adb &&
            sel &&
            sel.value &&
            !this.isInstalling
        );
    }

    async installSelectedServerApk() {
        const sel = document.getElementById('serverApkSelect');
        const apk = this.serverApkList.find(a => a.file === sel.value);
        if (!apk) return;

        await this.installApkFromServer(apk.file, apk.name);
    }

    /* ================= 安装（服务器） ================= */
    async installApkFromServer(file, name) {
        if (!this.adb || this.isInstalling) return;
        this.isInstalling = true;
        this.updateAllButtons();

        try {
            this.resetProgress();
            this.showProgress(true, `正在下载 ${name}`, '下载中...', false);

             const url = WebADBApp.OSS_BASE + file;

            const blob = await DownloadProgress.fetch(url, (info) => {
                this.setProgress(info.percent);
                this.showProgress(
                    true,
                    `正在下载 ${name}`,
                    `${info.percent}%（${info.loadedMB} / ${info.totalMB} MB）`,
                    false
                );
            });

            this.setProgress(100);
            this.showProgress(true, `正在安装 ${name}`, '应用安装中,请勿操作设备...', false);

            const path = WebADBApp.TMP_DIR + file;
            const sync = await this.adb.sync();
            await sync.push(blob, path, 0o644);
            await sync.quit();

            // ✅ 关键：恢复允许降级安装
            const out = await this.execShell(`pm install -g -r -d "${path}"`);
            await this.execShell(`rm -f "${path}"`);

            if (!out.includes('Success')) throw new Error(out);

            this.log(`✅ ${name} 安装成功`);
            await this.refreshAppManagerStatus();

            if (file === 'yygj.apk') {
                this.log('📡 正在开启 WiFi ADB（5555）...');
                try {
                    await this.execShell('tcpip 5555');
                    this.log('✅ WiFi ADB 已开启（端口 5555）');
                } catch {
                    this.log('⚠️ WiFi ADB 开启失败（可忽略）');
                }

                await this.launchAppManager();
            }

            this.showProgress(true, '完成', `${name} 已安装`, false);
            setTimeout(() => {
                this.showProgress(false);
                this.resetProgress();
            }, 800);

        } catch (e) {
            this.log(`❌ ${name} 安装失败：${e.message}`);
            this.showProgress(true, '安装失败', e.message, false);
            setTimeout(() => {
                this.showProgress(false);
                this.resetProgress();
            }, 1200);
        } finally {
            this.isInstalling = false;
            this.updateAllButtons();
        }
    }

    /* ================= 本地 APK 安装 ================= */
    async installUploadedApk() {
        if (!this.adb || !this.uploadedApk || this.isInstalling) return;

        this.isInstalling = true;
        this.updateAllButtons();

        try {
            this.resetProgress();
            this.showProgress(true, '正在安装本地 APK', this.uploadedApk.name, false);

            const path = WebADBApp.TMP_DIR + 'local_install.apk';
            const sync = await this.adb.sync();
            await sync.push(this.uploadedApk, path, 0o644);
            await sync.quit();

            this.setProgress(100);

            const out = await this.execShell(`pm install -g -r -d "${path}"`);
            await this.execShell(`rm -f "${path}"`);

            if (!out.includes('Success')) throw new Error(out);

            this.log('✅ 本地 APK 安装成功');
            await this.refreshAppManagerStatus();

            this.showProgress(true, '完成', '安装完成', false);
            setTimeout(() => {
                this.showProgress(false);
                this.resetProgress();
            }, 800);

            document.getElementById('apkUpload').value = '';
            this.uploadedApk = null;

        } catch (e) {
            this.log(`❌ 本地 APK 安装失败：${e.message}`);
            this.showProgress(true, '安装失败', e.message, false);
            setTimeout(() => {
                this.showProgress(false);
                this.resetProgress();
            }, 1200);
        } finally {
            this.isInstalling = false;
            this.updateAllButtons();
        }
    }

    /* ================= ADB 工具 ================= */
    async execShell(cmd) {
        const shell = await this.adb.shell(cmd);
        let out = '';
        let r = await shell.receive();
        while (r.data) {
            out += new TextDecoder().decode(r.data);
            r = await shell.receive();
        }
        shell.close();
        return out;
    }

    async isPackageInstalled(pkg) {
        const out = await this.execShell(`pm list packages ${pkg}`);
        return out.includes(pkg);
    }

    async refreshAppManagerStatus() {
        const btn = document.getElementById('btnLaunchQxg');
        if (!btn || !this.adb) return;
        btn.disabled = !(await this.isPackageInstalled(
            WebADBApp.APP_MANAGER_PKG
        ));
    }

    async launchAppManager() {
        try {
            await this.execShell(
                `monkey -p ${WebADBApp.APP_MANAGER_PKG} -c android.intent.category.LAUNCHER 1`
            );
            this.log('✅ 应用管家已启动');
        } catch {
            this.log('❌ 启动应用管家失败');
        }
    }

    /* ================= UI ================= */
    updateConnectionStatus(connected) {
        const s = document.getElementById('largeStatus');
        if (s) {
            s.textContent = connected ? '🟢 设备已连接' : '🔴 设备未连接';
            s.className = `status-large ${connected ? 'connected' : 'disconnected'}`;
        }

        document.getElementById('btnAutoConnect').disabled = connected;
        document.getElementById('btnSafeDisconnect').disabled = !connected;

        [
            'btnInstallQxg',
            'btnInstallBd',
            'btnInstallSidebar'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !connected;
        });

        this.updateServerApkButton();
        this.updateUploadInstallButton();
    }

    updateUploadInstallButton() {
        const btn = document.getElementById('btnUploadInstall');
        if (!btn) return;

        btn.disabled = !(
            this.adb &&
            this.uploadedApk &&
            !this.isInstalling
        );
    }

    updateAllButtons() {
        this.updateConnectionStatus(!!this.adb);
    }

    showProgress(show, title, text, showAuthHint) {
        const o = document.getElementById('progressOverlay');
        if (!o) return;

        o.style.display = show ? 'flex' : 'none';
        document.getElementById('progressTitle').textContent = title || '';
        document.getElementById('progressText').textContent = text || '';

        const hint = document.getElementById('authHint');
        if (hint) hint.style.display = showAuthHint ? 'block' : 'none';
    }

    // 蓝色进度条
    setProgress(percent) {
        const bar = document.getElementById('progressFill');
        if (!bar) return;
        bar.style.width = percent + '%';
    }

    resetProgress() {
        const bar = document.getElementById('progressFill');
        if (!bar) return;
        bar.style.width = '0%';
    }

    log(msg) {
        const box = document.getElementById('logOutput');
        const div = document.createElement('div');
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }
}

window.app = new WebADBApp();