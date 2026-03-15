(function () {

    function createUI() {

        const container = document.createElement("div");
        container.style.marginTop = "20px";

        container.innerHTML = `
            <div style="
                background:#111827;
                padding:16px;
                border-radius:16px;
                box-shadow:0 10px 30px rgba(0,0,0,.4);
            ">
                <h3 style="margin:0 0 10px;color:#60a5fa;">
                    🧪 交互命令执行器（独立）
                </h3>

                <div style="display:flex;gap:8px;">
                    <input id="customCmdInput"
                        style="
                            flex:1;
                            padding:8px 12px;
                            border-radius:10px;
                            border:1px solid #374151;
                            background:#0f172a;
                            color:#fff;
                        "
                        placeholder="输入 adb shell 命令，例如: pm list packages"
                    />
                    <button id="customCmdBtn"
                        style="
                            padding:8px 16px;
                            border-radius:10px;
                            border:none;
                            background:#2563eb;
                            color:white;
                            cursor:pointer;
                        "
                    >
                        执行
                    </button>
                </div>

                <pre id="customCmdOutput"
                    style="
                        margin-top:12px;
                        background:#020617;
                        padding:10px;
                        border-radius:10px;
                        max-height:200px;
                        overflow:auto;
                        color:#9ddcff;
                        font-size:12px;
                    "
                ></pre>
            </div>
        `;

        document.querySelector(".container")?.appendChild(container);
    }

    /* ================= 执行命令 ================= */

    async function runCommand() {

        const input = document.getElementById("customCmdInput");
        const output = document.getElementById("customCmdOutput");

        if (!window.app || !window.app.adb) {
            output.textContent = "❌ 设备未连接";
            return;
        }

        const cmd = input.value.trim();
        if (!cmd) return;

        output.textContent = "⏳ 执行中...\n";

        try {

            /* ✅ 关键：先关闭主终端，避免 USB 冲突 */
            if (window.terminalStream) {
                try {
                    await window.terminalStream.close();
                } catch {}
                window.terminalStream = null;
            }

            const shell = await window.app.adb.shell(cmd);

            let result = "";
            const decoder = new TextDecoder();

            let r = await shell.receive();
            while (r.data) {
                result += decoder.decode(r.data);
                r = await shell.receive();
            }

            shell.close();

            output.textContent = result || "✅ 执行完成（无输出）";

        } catch (e) {
            output.textContent = "❌ 错误: " + e.message;
        } finally {

            /* ✅ 恢复主终端 */
            setTimeout(() => {
                window.dispatchEvent(new Event("adb-reconnect-shell"));
            }, 500);
        }
    }

    /* ================= 初始化 ================= */

    document.addEventListener("DOMContentLoaded", () => {

        createUI();

        document
            .getElementById("customCmdBtn")
            ?.addEventListener("click", runCommand);

        document
            .getElementById("customCmdInput")
            ?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    runCommand();
                }
            });
    });

})();