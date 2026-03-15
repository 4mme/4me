(function () {

    let term;
    let fitAddon;
    let stream = null;
    let readerRunning = false;
    let inputBound = false;

    const container = document.getElementById("terminal");

    /* ================= UI 控制 ================= */

    function setDisconnectedUI() {
        container.classList.add("terminal-disconnected");
    }

    function setConnectedUI() {
        container.classList.remove("terminal-disconnected");
    }

    /* ================= 初始化 ================= */

    function initTerminal() {

        term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            theme: {
                background: "#020617",
                foreground: "#9ddcff"
            },
            scrollback: 2000
        });

        fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);

        term.open(container);
        fitAddon.fit();

        window.addEventListener("resize", () => {
            fitAddon.fit();
        });

        bindInputOnce();

        term.writeln("🔴 设备未连接");
        setDisconnectedUI();
    }

    /* ================= 输入绑定（只绑定一次） ================= */

    function bindInputOnce() {

        if (inputBound) return;
        inputBound = true;

        term.onData(async data => {

            if (!stream) return;

            const encoder = new TextEncoder();

            try {

                if (data === "\x03") { // Ctrl+C
                    await stream.send("WRTE", encoder.encode("\x03"));
                    return;
                }

                await stream.send("WRTE", encoder.encode(data));

            } catch {
                detachShell();
            }
        });
    }

    /* ================= 连接 Shell ================= */

    async function attachShell() {

        if (!window.app || !window.app.adb) return;
        if (stream) return;

        try {

            term.clear();
            term.writeln("✅ 正在连接 Android Shell...");
            term.write("\r\n");

            stream = await window.app.adb.open("shell:");
            window.terminalStream = stream;   // ✅ 暴露给 app.js

            setConnectedUI();
            readerLoop();

            // ✅ 连接成功后刷新按钮状态
            setTimeout(() => {
                window.app?.refreshAppManagerStatus?.();
            }, 800);

        } catch (e) {
            term.writeln("❌ Shell 启动失败: " + e.message);
            setDisconnectedUI();
        }
    }

    /* ================= 断开 ================= */

    async function detachShell() {

        if (!stream) return;

        try { await stream.close(); } catch {}

        stream = null;
        window.terminalStream = null;
        readerRunning = false;

        term.writeln("\r\n🔌 已断开连接");
        setDisconnectedUI();
    }

    /* ================= 读取循环 ================= */

    async function readerLoop() {

        if (!stream || readerRunning) return;
        readerRunning = true;

        const decoder = new TextDecoder();

        while (stream) {

            try {

                const resp = await stream.receive();

                if (resp.data) {
                    term.write(decoder.decode(resp.data));
                }

                if (resp.cmd === "CLSE") {
                    detachShell();
                    break;
                }

                await stream.send("OKAY");

            } catch {
                detachShell();
                break;
            }
        }

        readerRunning = false;
    }

    /* ================= 自动检测连接状态 ================= */

    setInterval(() => {

        if (window.app && window.app.adb && !stream) {
            attachShell();
        }

        if ((!window.app || !window.app.adb) && stream) {
            detachShell();
        }

    }, 800);

    /* ================= 安装完成后重连 ================= */

    window.addEventListener("adb-reconnect-shell", () => {
        if (!stream && window.app?.adb) {
            attachShell();
        }
    });

    document.addEventListener("DOMContentLoaded", initTerminal);

})();