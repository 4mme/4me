/* ================= USB Modal Controller ================= */

const overlay = document.getElementById('usbOverlay');
const statusEl = document.getElementById('usbStatus');
const errorEl = document.getElementById('usbError');
const deviceBox = document.getElementById('usbDeviceInfo');
const recentBox = document.getElementById('usbRecent');
const recentList = document.getElementById('usbRecentList');

function openUsbModal() {
  overlay.style.display = 'flex';
  errorEl.innerText = '';
  deviceBox.hidden = true;
  loadRecentDevices();
}

function closeUsbModal() {
  overlay.style.display = 'none';
}

window.openUsbModal = openUsbModal;

/* ===== 最近设备（仅 UI 级，非真实枚举） ===== */

function loadRecentDevices() {
  const list = JSON.parse(localStorage.getItem('usb_recent') || '[]');
  if (!list.length) {
    recentBox.hidden = true;
    return;
  }
  recentBox.hidden = false;
  recentList.innerHTML = '';
  list.forEach(d => {
    const div = document.createElement('div');
    div.className = 'usb-recent-item';
    div.innerText = `${d.name} (${d.type})`;
    recentList.appendChild(div);
  });
}

function saveRecent(device) {
  let list = JSON.parse(localStorage.getItem('usb_recent') || '[]');
  list = list.filter(d => d.vid !== device.vid || d.pid !== device.pid);
  list.unshift(device);
  list = list.slice(0, 3);
  localStorage.setItem('usb_recent', JSON.stringify(list));
}

/* ===== 设备选择 ===== */

document.getElementById('btnUsbSelect').onclick = async () => {
  try {
    statusEl.innerText = '正在打开浏览器 USB 选择…';
    errorEl.innerText = '';

    const transport = await Adb.open("WebUSB");
    const dev = transport.device;

    let type = transport.isFastboot() ? 'Fastboot' :
               transport.isAdb() ? 'ADB' : '未知';

    document.getElementById('usbName').innerText =
      dev.productName || '未知设备';

    document.getElementById('usbVidPid').innerText =
      `0x${dev.vendorId.toString(16)} / 0x${dev.productId.toString(16)}`;

    document.getElementById('usbType').innerText = type;

    deviceBox.hidden = false;
    statusEl.innerText = '✅ 设备已选择，请查看车机屏幕确认 USB 调试';

    saveRecent({
      name: dev.productName || '未知设备',
      vid: dev.vendorId,
      pid: dev.productId,
      type
    });

    // 👉 后续你原本的 connectAdb / connectFastboot 逻辑继续执行即可

  } catch (e) {
    errorEl.innerText = e.message || '未选择设备';
    statusEl.innerText = '设备未连接';
  }
};