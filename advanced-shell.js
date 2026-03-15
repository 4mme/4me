(function () {

    let stream = null;
    let readerRunning = false;
    let manuallyClosed = false;

    window.__ADB_ADVANCED_MODE__ = false;
    window.__ADVANCED_LOCK__ = false;

    function createUI() {

        const box = document.createElement("div");
        box.style.marginTop = "20px";

        box.innerHTML = `
        <style>

            #advContainer {
                background: #000;
                border-radius: 16px;
                padding: 18px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 0 25px rgba(0,255,120,.08);
            }

            /* 扫描线 */
            #advContainer::after {
                content:"";
                position:absolute;
                left:0;
                right:0;
                top:0;
                height:2px;
                background:rgba(0,255,120,.08);
                animation:scan 6s linear infinite;
                pointer-events:none;
                opacity:0;
            }

            #advContainer.active::after {
                opacity:1;
            }

            @keyframes scan {
                0%{top:0}
                100%{top:100%}
            }

            .adv-title {
                color:#00ff88;
                font-weight:bold;
                margin-bottom:8px;
                font-size:14px;
                letter-spacing:1px;
            }

            .adv-warning {
                display:none;
                margin-bottom:12px;
                padding:8px 12px;
                border-radius:8px;
                font-size:12px;
                background:#2a1200;
                color:#ffae42;
                border:1px solid rgba(255,174,66,.4);
            }

            .adv-btn {
                padding:8px 14px;
                border-radius:8px;
                border:1px solid #00aa66;
                background:#001a12;
                color:#00ff88;
                font-size:13px;
                cursor:pointer;
                transition:all .2s ease;
            }

            .adv-btn:hover:not(.disabled) {
                background:#003d29;
                box-shadow:0 0 8px rgba(0,255,120,.3);
                transform:translateY(-1px);
            }

            .adv-btn:active {
                transform:scale(.96);
            }

            .disabled {
                border-color:#222 !important;
                color:#444 !important;
                background:#050505 !important;
                cursor:not-allowed !important;
                box-shadow:none !important;
            }

            #terminalArea {
                position:relative;
            }

            #terminalArea.locked {
                opacity:.45;
                filter:grayscale(.6);
            }

            #advOutput {
                width:100%;
                height:240px;
                background:#000;
                color:#00ff88;
                border:1px solid #003d29;
                border-radius:10px;
                padding:12px;
                font-family:Consolas,monospace;
                font-size:13px;
                resize:none;
                margin-bottom:10px;
            }

            #advInput {
                width:100%;
                padding:10px;
                border-radius:10px;
                border:1px solid #003d29;
                background:#000;
                color:#00ff88;
                font-family:Consolas,monospace;
                font-size:13px;
                outline:none;
                transition:all .2s ease;
            }

            #advInput:focus {
                box-shadow:0 0 6px rgba(0,255,120,.4);
            }

            .lock-overlay {
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:14px;
                color:#ff4444;
                background:rgba(0,0,0,.6);
                letter-spacing:1px;
                pointer-events:none;
            }

            .boot-overlay {
                position:absolute;
                inset:0;
                background:#000;
                color:#00ff88;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                font-family:Consolas,monospace;
                font-size:13px;
                letter-spacing:1px;
                z-index:10;
                opacity:0;
                pointer-events:none;
            }

            .boot-overlay.active {
                opacity:1;
            }

            .boot-bar {
                width:160px;
                height:6px;
                background:#003d29;
                margin-top:12px;
                overflow:hidden;
                border-radius:4px;
            }

            .boot-fill {
                height:100%;
                width:0%;
                background:#00ff88;
                transition:width .5s linear;
            }

        </style>

        <div id="advContainer">

            <div class="adv-title">
                🛠 工程终端模式
            </div>

            <div id="advWarning" class="adv-warning">
                ⚠ 当前处于工程终端模式，其他功能已禁用
            </div>

            <div style="display:flex;gap:10px;margin-bottom:12px;">
                <button id="advStart" class="adv-btn">
                    进入高级模式
                </button>

                <button id="advStop" class="adv-btn disabled" disabled>
                    退出高级模式
                </button>

                <button id="advExec" class="adv-btn disabled" disabled>
                    执行命令
                </button>
            </div>

            <div id="terminalArea">

                <textarea id="advOutput"></textarea>

                <input id="advInput" disabled placeholder="> 输入命令..." />

                <div id="lockOverlay" class="lock-overlay">
                    🔒 终端已锁定
                </div>

            </div>

            <div id="bootOverlay" class="boot-overlay">
                <div>系统激活中...</div>
                <div class="boot-bar">
                    <div id="bootFill" class="boot-fill"></div>
                </div>
            </div>

        </div>
        `;

        document.querySelector(".container")?.appendChild(box);
    }



    function setMode(enabled) {

        const start = document.getElementById("advStart");
        const stop = document.getElementById("advStop");
        const exec = document.getElementById("advExec");
        const input = document.getElementById("advInput");
        const container = document.getElementById("advContainer");
        const terminalArea = document.getElementById("terminalArea");
        const lock = document.getElementById("lockOverlay");
        const warning = document.getElementById("advWarning");

        if (enabled) {

            start.disabled = true;
            start.classList.add("disabled");

            stop.disabled = false;
            stop.classList.remove("disabled");

            exec.disabled = false;
            exec.classList.remove("disabled");

            input.disabled = false;

            container.classList.add("active");
            terminalArea.classList.remove("locked");
            lock.style.display = "none";

           warning.style.display = "block";
           window.__ADVANCED_LOCK__ = true;
           window.app?.updateAllButtons?.();

        } else {

            start.disabled = false;
            start.classList.remove("disabled");

            stop.disabled = true;
            stop.classList.add("disabled");

            exec.disabled = true;
            exec.classList.add("disabled");

            input.disabled = true;

            container.classList.remove("active");
            terminalArea.classList.add("locked");
            lock.style.display = "flex";

          warning.style.display = "none";
          window.__ADVANCED_LOCK__ = false;
          window.app?.updateAllButtons?.();
          window.app?.updateUploadInstallButton?.();
          window.app?.updateServerApkButton?.();
        }
    }

    async function startAdvancedMode() {

        if (!window.app || !window.app.adb) {
            alert("设备未连接");
            return;
        }

        if (stream) return;

        const bootOverlay = document.getElementById("bootOverlay");
        const bootFill = document.getElementById("bootFill");

        bootOverlay.classList.add("active");
        bootFill.style.width = "100%";

        setTimeout(async () => {

            bootOverlay.classList.remove("active");
            bootFill.style.width = "0%";

            manuallyClosed = false;
            window.__ADB_ADVANCED_MODE__ = true;
            setMode(true);

            stream = await window.app.adb.open("shell:");
            readerLoop();

        }, 500);
    }

    async function stopAdvancedMode() {

        manuallyClosed = true;
        window.__ADB_ADVANCED_MODE__ = false;
        setMode(false);

        if (!stream) return;

        try { await stream.close(); } catch {}
        stream = null;
        readerRunning = false;
    }

    async function readerLoop() {

        if (!stream || readerRunning) return;
        readerRunning = true;

        const decoder = new TextDecoder();
        const output = document.getElementById("advOutput");

        while (stream) {

            try {

                const resp = await stream.receive();

                if (resp.data) {
                    output.value += decoder.decode(resp.data);
                    output.scrollTop = output.scrollHeight;
                }

                await stream.send("OKAY");

            } catch {
                break;
            }
        }

        readerRunning = false;
    }

    async function sendCommand(cmd) {
        if (!stream) return;
        const encoder = new TextEncoder();
        await stream.send("WRTE", encoder.encode(cmd + "\n"));
    }

    document.addEventListener("DOMContentLoaded", () => {

        createUI();
        setMode(false);

        document.getElementById("advStart")
            ?.addEventListener("click", startAdvancedMode);

        document.getElementById("advStop")
            ?.addEventListener("click", stopAdvancedMode);

        document.getElementById("advExec")
            ?.addEventListener("click", () => {
                const input = document.getElementById("advInput");
                if (!input.value.trim()) return;
                sendCommand(input.value);
                input.value = "";
            });

        document.getElementById("advInput")
            ?.addEventListener("keydown", e => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (!e.target.value.trim()) return;
                    sendCommand(e.target.value);
                    e.target.value = "";
                }
            });
    });

})();