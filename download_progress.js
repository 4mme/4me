(function () {

    function toMB(bytes) {
        return (bytes / 1024 / 1024).toFixed(1);
    }

    async function fetchWithRealProgress(url, onUpdate) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const totalBytes = Number(res.headers.get('Content-Length')) || 0;
        const reader = res.body.getReader();

        let loaded = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            if (onUpdate) {
                if (totalBytes) {
                    const percent = Math.floor(loaded / totalBytes * 100);
                    onUpdate({
                        percent,
                        loadedBytes: loaded,
                        totalBytes,
                        loadedMB: toMB(loaded),
                        totalMB: toMB(totalBytes)
                    });
                } else {
                    onUpdate({
                        percent: 0,
                        loadedBytes: loaded,
                        totalBytes: 0,
                        loadedMB: toMB(loaded),
                        totalMB: '?'
                    });
                }
            }
        }

        if (onUpdate && totalBytes) {
            onUpdate({
                percent: 100,
                loadedBytes: totalBytes,
                totalBytes,
                loadedMB: toMB(totalBytes),
                totalMB: toMB(totalBytes)
            });
        }

        return new Blob(chunks);
    }

    /* ===============================
       对外暴露
    =============================== */
    window.DownloadProgress = {
        fetch: fetchWithRealProgress
    };

})();