// ================= DATA DEFAULTS & LOCALSTORAGE =================
const DEFAULT_EMPLOYEES = [
  {
    ho_va_ten: "NGUYỄN VĂN NAM",
    ngay_sinh: "12/05/1992",
    so_cccd: "037092004567",
    dia_chi: "Số 12 Ngõ 45, Đường Láng, Quận Đống Đa, Hà Nội",
    gioi_tinh: "Nam",
    que_quan: "Gia Lộc, Hải Dương",
    status: "active"
  },
  {
    ho_va_ten: "LÊ THỊ MAI",
    ngay_sinh: "24/09/1996",
    so_cccd: "038196009876",
    dia_chi: "Căn hộ 1502, Chung cư Sunrise, Quận 7, TP. Hồ Chí Minh",
    gioi_tinh: "Nữ",
    que_quan: "Yên Định, Thanh Hóa",
    status: "active"
  },
  {
    ho_va_ten: "TRẦN ĐỨC ANH",
    ngay_sinh: "15/08/1998",
    so_cccd: "001198002345",
    dia_chi: "Số 8 Đường Hoa Sữa, Vinhomes Riverside, Long Biên, Hà Nội",
    gioi_tinh: "Nam",
    que_quan: "Quốc Oai, Hà Nội",
    status: "pending" // Sắp gia nhập
  },
  {
    ho_va_ten: "PHẠM MINH HUỆ",
    ngay_sinh: "08/11/2000",
    so_cccd: "036200012345",
    dia_chi: "Kiệt 45 Điện Biên Phủ, Quận Thanh Khê, Đà Nẵng",
    gioi_tinh: "Nữ",
    que_quan: "Hải Lăng, Quảng Trị",
    status: "pending" // Sắp gia nhập
  },
  {
    ho_va_ten: "HOÀNG NGỌC LÂM",
    ngay_sinh: "02/02/1994",
    so_cccd: "031194006543",
    dia_chi: "99 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh",
    gioi_tinh: "Nam",
    que_quan: "Kim Sơn, Ninh Bình",
    status: "pending" // Sắp gia nhập
  }
];

// Dữ liệu mẫu giả lập cho CCCD OCR
const SAMPLE_CCCD_DATA = {
  1: {
    ho_va_ten: "NGUYỄN VĂN BÌNH",
    ngay_sinh: "12/04/1990",
    so_cccd: "031090123456",
    dia_chi: "15 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    gioi_tinh: "Nam",
    que_quan: "Kiến Xương, Thái Bình"
  },
  2: {
    ho_va_ten: "LÊ THỊ HƯƠNG",
    ngay_sinh: "22/10/1995",
    so_cccd: "038195987654",
    dia_chi: "104 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    gioi_tinh: "Nữ",
    que_quan: "Tĩnh Gia, Thanh Hóa"
  }
};

let employees = [];
let isBackendConnected = false;
const BACKEND_URL = window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
  ? "http://localhost:5000"
  : "";

// ================= APP INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  initDatabase();
  renderEmployees();
  updateStats();
  initCalendar();
  setupEventListeners();
  checkBackendHealth();
  updateGeminiKeyUI();
});

// Khởi tạo Database từ LocalStorage
function initDatabase() {
  const stored = localStorage.getItem("hr_employees");
  if (stored) {
    employees = JSON.parse(stored);
  } else {
    employees = [...DEFAULT_EMPLOYEES];
    localStorage.setItem("hr_employees", JSON.stringify(employees));
  }
}

// Kiểm tra trạng thái Backend Python OCR
async function checkBackendHealth() {
  const statusIndicator = document.getElementById("backend-status-indicator");
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      isBackendConnected = true;
      statusIndicator.textContent = "Đã kết nối API OCR (Chạy chế độ THẬT)";
      statusIndicator.style.color = "#22c55e";
      console.log("OCR Backend is online:", data);
    } else {
      throw new Error();
    }
  } catch (err) {
    isBackendConnected = false;
    statusIndicator.textContent = "Đang ngắt kết nối (Chạy simulated)";
    statusIndicator.style.color = "var(--text-muted)";
    console.log("OCR Backend is offline. Falling back to simulated scan mode.");
  }
}

// Cấu hình Gemini Key lưu cục bộ để chạy thẳng từ trình duyệt
window.saveGeminiKey = function() {
  const input = document.getElementById("gemini-key-input");
  const val = input.value.trim();
  if (val) {
    localStorage.setItem("gemini_api_key", val);
    updateGeminiKeyUI();
    alert("Đã lưu API Key thành công!");
  } else {
    localStorage.removeItem("gemini_api_key");
    updateGeminiKeyUI();
    alert("Đã xóa API Key.");
  }
};

function updateGeminiKeyUI() {
  const input = document.getElementById("gemini-key-input");
  const status = document.getElementById("gemini-key-status");
  let key = localStorage.getItem("gemini_api_key");
  
  // Thiết lập API key mặc định từ người dùng cung cấp nếu chưa có
  if (!key) {
    key = "";
    localStorage.setItem("gemini_api_key", key);
  }
  
  if (key) {
    input.value = key;
    status.textContent = "✓ Đã bật chế độ quét trực tiếp bằng Gemini API";
    status.style.color = "#22c55e";
  } else {
    input.value = "";
    status.textContent = "✗ Chưa cấu hình (Quét ảnh thật sẽ lỗi nếu Python server offline)";
    status.style.color = "var(--text-muted)";
  }
}

// Cập nhật các số liệu thống kê trên Dashboard
function updateStats() {
  const activeCount = employees.filter(e => e.status === "active").length;
  const pendingCount = employees.filter(e => e.status === "pending").length;

  document.getElementById("stat-active-employees").textContent = activeCount;
  document.getElementById("stat-pending-employees").textContent = pendingCount;
  document.getElementById("banner-new-count").textContent = pendingCount;
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  // Tìm kiếm nhân viên
  const searchInput = document.getElementById("employee-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderEmployees(e.target.value);
    });
  }

  // Điều khiển Modal
  const ocrModal = document.getElementById("ocr-modal");
  const btnAdd = document.getElementById("btn-add-employee");
  const btnQuickOcr = document.getElementById("btn-quick-ocr");
  const btnClose = document.getElementById("btn-close-modal");

  const openModal = () => {
    resetOCRModal();
    ocrModal.classList.add("active");
  };

  if (btnAdd) btnAdd.addEventListener("click", openModal);
  if (btnQuickOcr) btnQuickOcr.addEventListener("click", openModal);
  if (btnClose) btnClose.addEventListener("click", () => ocrModal.classList.remove("active"));

  // Đóng modal khi click ra ngoài vùng content
  ocrModal.addEventListener("click", (e) => {
    if (e.target === ocrModal) {
      ocrModal.classList.remove("active");
    }
  });

  // Kéo thả & Upload file ảnh CCCD
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  dropzone.addEventListener("click", () => {
    // Chỉ kích hoạt click input khi chưa bắt đầu quét
    if (document.getElementById("scanning-wrapper").style.display === "none") {
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--primary-color)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#C2C2B9";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#C2C2B9";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });

  // Xuất file Excel
  const btnExport = document.getElementById("btn-export-excel");
  if (btnExport) {
    btnExport.addEventListener("click", exportToExcel);
  }
}

// ================= TAB MANAGEMENT =================
window.switchTab = function(tabName) {
  // Cập nhật Tab Panels
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.remove("active");
  });
  const activePanel = document.getElementById(`tab-${tabName}`);
  if (activePanel) activePanel.classList.add("active");

  // Cập nhật Bottom Navigation Menu
  document.querySelectorAll(".bottom-nav .nav-item").forEach(item => {
    item.classList.remove("active");
  });
  const activeNavItem = document.getElementById(`nav-${tabName}`);
  if (activeNavItem) activeNavItem.classList.add("active");
};

window.showFeatureNotice = function(featureName) {
  alert(`Tính năng "${featureName}" đang được phát triển nâng cao.`);
};

// ================= EMPLOYEES TAB LOGIC =================
function renderEmployees(searchQuery = "") {
  const container = document.getElementById("employee-list-container");
  if (!container) return;

  container.innerHTML = "";

  const query = searchQuery.trim().toLowerCase();
  const filtered = employees.filter(e => {
    return e.ho_va_ten.toLowerCase().includes(query) || 
           e.so_cccd.includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">
        <i class="fa-regular fa-folder-open" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
        Không tìm thấy nhân viên phù hợp
      </div>
    `;
    return;
  }

  filtered.forEach(emp => {
    const card = document.createElement("div");
    card.className = "employee-card";
    
    // Status text
    const statusText = emp.status === "active" ? "Đang làm việc" : "Chờ onboarding";
    const statusClass = emp.status === "active" ? "status-active" : "status-pending";

    card.innerHTML = `
      <div class="emp-info">
        <h4>${emp.ho_va_ten}</h4>
        <p><i class="fa-regular fa-id-card"></i> CCCD: ${emp.so_cccd}</p>
        <p><i class="fa-regular fa-calendar"></i> Sinh nhật: ${emp.ngay_sinh}</p>
        <p><i class="fa-solid fa-map-pin"></i> Địa chỉ: ${emp.dia_chi}</p>
      </div>
      <div class="emp-badge-col">
        <span class="emp-status ${statusClass}">${statusText}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Xuất Excel sử dụng thư viện SheetJS
function exportToExcel() {
  if (employees.length === 0) {
    alert("Danh sách nhân viên trống.");
    return;
  }

  // Đổi tên cột chuẩn hóa giống yêu cầu trong Python
  const exportData = employees.map(emp => ({
    "Họ và tên": emp.ho_va_ten,
    "Ngày tháng năm sinh": emp.ngay_sinh,
    "Mã số căn cước công dân": emp.so_cccd,
    "Địa chỉ": emp.dia_chi,
    "Giới tính": emp.gioi_tinh,
    "Quê quán": emp.que_quan,
    "Trạng thái": emp.status === "active" ? "Đang làm việc" : "Chờ onboarding"
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách nhân viên");

  // Xuất file
  XLSX.writeFile(workbook, "danh_sach_cccd.xlsx");
}

// ================= OCR SCANNER & MODAL LOGIC =================
function resetOCRModal() {
  document.getElementById("ocr-step-upload").classList.add("active");
  document.getElementById("ocr-step-result").classList.remove("active");
  
  // Reset dropzone UI
  document.querySelector(".drop-zone-prompt").style.display = "flex";
  document.getElementById("scanning-wrapper").style.display = "none";
  document.getElementById("preview-image").src = "";
  document.getElementById("file-input").value = "";
  
  // Reset progress UI
  document.getElementById("ocr-progress").style.display = "none";
  document.getElementById("progress-bar").style.width = "0%";
  
  const steps = ["pstep-1", "pstep-2", "pstep-3"];
  steps.forEach(id => {
    const li = document.getElementById(id);
    li.className = "";
    li.querySelector("i").className = id === "pstep-1" ? "fa-solid fa-circle-notch fa-spin" : "fa-regular fa-circle";
  });
  document.getElementById("pstep-2").innerHTML = '<i class="fa-regular fa-circle"></i> Đang chạy PaddleOCR tiếng Việt...';
}

// Tải ảnh mẫu phục vụ kiểm thử tiện lợi
window.loadSample = function(sampleId) {
  const sampleData = SAMPLE_CCCD_DATA[sampleId];
  if (!sampleData) return;

  // Mô phỏng hình ảnh mặt trước thẻ
  const dummyImageUrl = sampleId === 1 
    ? "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400&q=80" // Phác họa chân dung nam
    : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80"; // Chân dung nữ
    
  showScanAnimation(dummyImageUrl, sampleData);
};

// Xử lý tệp hình ảnh thật do người dùng tải lên
function handleImageUpload(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    const imageUrl = e.target.result;
    const apiKey = localStorage.getItem("gemini_api_key");
    
    if (apiKey) {
      // Chế độ gọi thẳng Gemini API từ Browser
      showScanAnimation(imageUrl, null, file, apiKey);
    } else if (isBackendConnected) {
      // Chế độ API THẬT qua Python server
      showScanAnimation(imageUrl, null, file);
    } else {
      // Chế độ GIẢ LẬP khi không có server Python lẫn API Key
      const randomId = Math.random() > 0.5 ? 1 : 2;
      const fakeData = SAMPLE_CCCD_DATA[randomId];
      const modifiedFakeData = {
        ...fakeData,
        ho_va_ten: "TRÍCH XUẤT GIẢ LẬP: " + fakeData.ho_va_ten
      };
      showScanAnimation(imageUrl, modifiedFakeData);
    }
  };
  reader.readAsDataURL(file);
}

// Chạy Hiệu ứng Quét Laser và Tiến Trình
async function showScanAnimation(imageUrl, mockDataToPopulate, fileObj = null, apiKey = null) {
  // Thay đổi UI dropzone
  document.querySelector(".drop-zone-prompt").style.display = "none";
  const scanningWrapper = document.getElementById("scanning-wrapper");
  scanningWrapper.style.display = "flex";
  document.getElementById("preview-image").src = imageUrl;
  
  // Hiển thị thanh tiến trình
  const progressContainer = document.getElementById("ocr-progress");
  progressContainer.style.display = "block";
  
  const progressBar = document.getElementById("progress-bar");
  
  // Chạy các bước hiệu ứng tiến trình
  const step1 = document.getElementById("pstep-1");
  const step2 = document.getElementById("pstep-2");
  const step3 = document.getElementById("pstep-3");
  
  try {
    // Bước 1: Đọc ảnh
    step1.className = "active";
    progressBar.style.width = "20%";
    await delay(1000);
    step1.className = "done";
    step1.querySelector("i").className = "fa-solid fa-circle-check";
    
    // Bước 2: Chạy OCR
    step2.className = "active";
    step2.querySelector("i").className = "fa-solid fa-circle-notch fa-spin";
    progressBar.style.width = "50%";
    
    let resultData = null;
    
    if (apiKey && fileObj) {
      // Đổi nhãn bước cho phù hợp quét trực tiếp
      document.getElementById("pstep-2").innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang nhận diện chữ và phân tích bằng Gemini API trực tiếp...';
      
      // Đọc Base64 và gọi thẳng Gemini API từ browser
      const base64Parts = imageUrl.split(",");
      const base64Data = base64Parts[1];
      const mimeType = base64Parts[0].split(";")[0].split(":")[1];
      
      const prompt = `Bạn là một trợ lý AI chuyên cấu trúc hóa thông tin từ ảnh chụp CCCD Việt Nam.
Hãy đọc kỹ hình ảnh mặt trước thẻ CCCD được đính kèm và trích xuất các trường thông tin: ho_va_ten, ngay_sinh, so_cccd, dia_chi, gioi_tinh, que_quan.
Trả về CHỈ một chuỗi JSON sạch (không bọc trong dấu \`\`\`json) có các key: "ho_va_ten", "ngay_sinh", "so_cccd", "dia_chi", "gioi_tinh", "que_quan". 
Các thông tin tiếng Việt có dấu phải được đọc chính xác tuyệt đối.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Lỗi gọi trực tiếp Gemini API.");
      }
      
      const apiRes = await response.json();
      const textResult = apiRes.candidates[0].content.parts[0].text;
      resultData = JSON.parse(textResult);
      
    } else if (fileObj && isBackendConnected) {
      // Thực hiện call API thật qua python local server
      const formData = new FormData();
      formData.append("file", fileObj);
      
      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errText = await response.json();
        throw new Error(errText.error || "Không thể phân tích ảnh.");
      }
      
      resultData = await response.json();
    } else {
      // Giả lập
      await delay(1200);
      resultData = mockDataToPopulate;
    }
    
    step2.className = "done";
    step2.querySelector("i").className = "fa-solid fa-circle-check";
    
    // Bước 3: Phân tích Gemini cấu trúc hóa
    step3.className = "active";
    step3.querySelector("i").className = "fa-solid fa-circle-notch fa-spin";
    progressBar.style.width = "85%";
    await delay(600);
    
    progressBar.style.width = "100%";
    step3.className = "done";
    step3.querySelector("i").className = "fa-solid fa-circle-check";
    await delay(500);
    
    // Chuyển sang Bước xem kết quả điền Form
    populateResultForm(resultData);
    
  } catch (error) {
    alert(`Lỗi phân tích: ${error.message}`);
    resetOCRModal();
  }
}

// Điền dữ liệu quét được vào Form xem lại
function populateResultForm(data) {
  document.getElementById("ocr-step-upload").classList.remove("active");
  document.getElementById("ocr-step-result").classList.add("active");
  
  document.getElementById("f_so_cccd").value = data.so_cccd || "";
  document.getElementById("f_ho_va_ten").value = (data.ho_va_ten || "").toUpperCase();
  document.getElementById("f_ngay_sinh").value = data.ngay_sinh || "";
  document.getElementById("f_gioi_tinh").value = data.gioi_tinh || "";
  document.getElementById("f_que_quan").value = data.que_quan || "";
  document.getElementById("f_dia_chi").value = data.dia_chi || "";
}

// Lưu thông tin nhân viên từ Form
window.saveEmployee = function(event) {
  event.preventDefault();
  
  const newEmp = {
    ho_va_ten: document.getElementById("f_ho_va_ten").value.toUpperCase(),
    ngay_sinh: document.getElementById("f_ngay_sinh").value,
    so_cccd: document.getElementById("f_so_cccd").value,
    gioi_tinh: document.getElementById("f_gioi_tinh").value,
    que_quan: document.getElementById("f_que_quan").value,
    dia_chi: document.getElementById("f_dia_chi").value,
    status: "pending" // Lưu dưới dạng chờ Onboarding ban đầu
  };
  
  // Đưa vào danh sách ở đầu
  employees.unshift(newEmp);
  localStorage.setItem("hr_employees", JSON.stringify(employees));
  
  // Cập nhật giao diện
  renderEmployees();
  updateStats();
  
  // Tự động chuyển về tab danh sách và tắt modal
  document.getElementById("ocr-modal").classList.remove("active");
  switchTab("employees");
};

// Hàm phụ tạo trễ
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================= CALENDAR RENDERING =================
let currentCalendarDate = new Date(2026, 6, 14); // Khởi tạo mốc thời gian July 2026

function initCalendar() {
  renderCalendar(currentCalendarDate);
}

function renderCalendar(dateObj) {
  const daysGrid = document.getElementById("calendar-days-grid");
  const monthYearLabel = document.getElementById("calendar-month-year");
  if (!daysGrid) return;
  
  daysGrid.innerHTML = "";
  
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-11
  
  monthYearLabel.textContent = `Tháng ${month + 1}, ${year}`;
  
  // Lấy ngày đầu tuần (thứ trong tuần, T2 là index 0)
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay(); // 0 (CN) -> 6 (T7)
  // Quy đổi: T2=0, T3=1, ..., T7=5, CN=6
  let startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Lấy số ngày trong tháng
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Render ô trống đầu tháng
  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    daysGrid.appendChild(emptyCell);
  }
  
  // Render các ngày trong tháng
  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";
    dayCell.textContent = day;
    
    // Làm nổi bật hôm nay (14/07/2026)
    if (year === 2026 && month === 6 && day === 14) {
      dayCell.classList.add("today");
    }
    
    // Giả lập trạng thái đi làm (present) cho các ngày trước ngày 14 (trừ T7, CN)
    const checkDate = new Date(year, month, day);
    const dayOfWeekCheck = checkDate.getDay();
    if (day < 14 && dayOfWeekCheck !== 0 && dayOfWeekCheck !== 6) {
      // Giả lập một ngày nghỉ phép ở ngày 8
      if (day === 8) {
        dayCell.classList.add("leave");
      } else {
        dayCell.classList.add("present");
      }
    }
    
    daysGrid.appendChild(dayCell);
  }
}

window.changeMonth = function(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
  renderCalendar(currentCalendarDate);
};
