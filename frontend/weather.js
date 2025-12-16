const provinces = [
    { name: "An Giang", lat: 10.521, lon: 105.125 },
    { name: "Bà Rịa - Vũng Tàu", lat: 10.541, lon: 107.242 },
    { name: "Bắc Giang", lat: 21.281, lon: 106.197 },
    { name: "Bắc Kạn", lat: 22.144, lon: 105.834 },
    { name: "Bạc Liêu", lat: 9.294, lon: 105.724 },
    { name: "Bắc Ninh", lat: 21.186, lon: 106.076 },
    { name: "Bến Tre", lat: 10.243, lon: 106.375 },
    { name: "Bình Định", lat: 14.166, lon: 108.902 },
    { name: "Bình Dương", lat: 11.152, lon: 106.629 },
    { name: "Bình Phước", lat: 11.751, lon: 106.878 },
    { name: "Bình Thuận", lat: 11.090, lon: 108.072 },
    { name: "Cà Mau", lat: 9.178, lon: 105.150 },
    { name: "Cần Thơ", lat: 10.035, lon: 105.789 },
    { name: "Cao Bằng", lat: 22.663, lon: 106.257 },
    { name: "Đà Nẵng", lat: 16.047, lon: 108.206 },
    { name: "Đắk Lắk", lat: 12.710, lon: 108.237 },
    { name: "Đắk Nông", lat: 12.298, lon: 107.688 },
    { name: "Điện Biên", lat: 21.397, lon: 103.016 },
    { name: "Đồng Nai", lat: 10.945, lon: 107.005 },
    { name: "Đồng Tháp", lat: 10.506, lon: 105.636 },
    { name: "Gia Lai", lat: 13.807, lon: 108.109 },
    { name: "Hà Giang", lat: 22.823, lon: 104.983 },
    { name: "Hà Nam", lat: 20.545, lon: 105.922 },
    { name: "Hà Nội", lat: 21.0285, lon: 105.8542 },
    { name: "Hà Tĩnh", lat: 18.335, lon: 105.907 },
    { name: "Hải Dương", lat: 20.938, lon: 106.330 },
    { name: "Hải Phòng", lat: 20.971, lon: 107.0448 },
    { name: "Hậu Giang", lat: 9.749, lon: 105.499 },
    { name: "Hòa Bình", lat: 20.851, lon: 105.337 },
    { name: "Hưng Yên", lat: 20.853, lon: 106.016 },
    { name: "Khánh Hòa", lat: 12.252, lon: 109.191 },
    { name: "Kiên Giang", lat: 9.824, lon: 105.125 },
    { name: "Kon Tum", lat: 14.352, lon: 107.990 },
    { name: "Lai Châu", lat: 22.396, lon: 103.458 },
    { name: "Lâm Đồng", lat: 11.575, lon: 108.142 },
    { name: "Lạng Sơn", lat: 21.853, lon: 106.761 },
    { name: "Lào Cai", lat: 22.485, lon: 103.970 },
    { name: "Long An", lat: 10.538, lon: 106.410 },
    { name: "Nam Định", lat: 20.429, lon: 106.162 },
    { name: "Nghệ An", lat: 19.234, lon: 104.920 },
    { name: "Ninh Bình", lat: 20.251, lon: 105.974 },
    { name: "Ninh Thuận", lat: 11.677, lon: 108.905 },
    { name: "Phú Thọ", lat: 21.400, lon: 105.219 },
    { name: "Phú Yên", lat: 13.091, lon: 109.281 },
    { name: "Quảng Bình", lat: 17.483, lon: 106.604 },
    { name: "Quảng Nam", lat: 15.539, lon: 108.019 },
    { name: "Quảng Ngãi", lat: 15.120, lon: 108.800 },
    { name: "Quảng Ninh", lat: 21.006, lon: 107.292 },
    { name: "Quảng Trị", lat: 16.740, lon: 107.185 },
    { name: "Sóc Trăng", lat: 9.603, lon: 105.973 },
    { name: "Sơn La", lat: 21.158, lon: 103.604 },
    { name: "Tây Ninh", lat: 11.360, lon: 106.109 },
    { name: "Thái Bình", lat: 20.451, lon: 106.336 },
    { name: "Thái Nguyên", lat: 21.593, lon: 105.844 },
    { name: "Thanh Hóa", lat: 19.806, lon: 105.776 },
    { name: "Thừa Thiên Huế", lat: 16.463, lon: 107.590 },
    { name: "Tiền Giang", lat: 10.396, lon: 106.355 },
    { name: "TP. Hồ Chí Minh", lat: 10.7769, lon: 106.7009 },
    { name: "Trà Vinh", lat: 9.817, lon: 106.343 },
    { name: "Tuyên Quang", lat: 21.821, lon: 105.212 },
    { name: "Vĩnh Long", lat: 10.250, lon: 105.973 },
    { name: "Vĩnh Phúc", lat: 21.319, lon: 105.601 },
    { name: "Yên Bái", lat: 21.699, lon: 104.891 }
];

function toggleWeather() {
    const box = document.getElementById('weatherWidget');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function getVietnamTimeString() {
    const now = new Date();
    const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const day = days[now.getDay()];
    const date = now.toLocaleDateString('vi-VN');
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${date} - ${time}`;
}

function fetchWeather() {
    const select = document.getElementById('provinceSelect');
    const [lat, lon] = select.value.split(',');
    const provinceName = select.options[select.selectedIndex].text;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_min,temperature_2m_max,weathercode&timezone=auto`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const minTemps = data.daily.temperature_2m_min;
            const maxTemps = data.daily.temperature_2m_max;
            const codes = data.daily.weathercode;
            const dates = data.daily.time;

            // Ngày hôm nay
            document.getElementById('weatherTime').innerText = getVietnamTimeString();
            document.getElementById('weatherIconMain').innerText = weatherIcon(codes[0]);
            document.getElementById('weatherTempMain').innerText = `${minTemps[0]}°C - ${maxTemps[0]}°C`;
            document.getElementById('weatherDescMain').innerText = weatherDescription(codes[0]);

            // Dự báo 4 ngày tới
            const forecastContainer = document.getElementById('weatherForecast');
            forecastContainer.innerHTML = "";
            for (let i = 1; i <= 4; i++) {
                const date = new Date(dates[i]);
                const day = date.toLocaleDateString('vi-VN', { weekday: 'short' });
                forecastContainer.innerHTML += `
                    <div class="forecast-day">
                        <div>${day}</div>
                        <div class="forecast-icon">${weatherIcon(codes[i])}</div>
                        <div>${minTemps[i]}°-${maxTemps[i]}°</div>
                    </div>
                `;
            }

            setProvinceBackground(provinceName);
        })
        .catch(err => {
            console.error("Lỗi lấy dữ liệu thời tiết:", err);
        });
}


function weatherIcon(code) {
    const map = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️", 51: "🌦️", 61: "🌧️",
        63: "🌧️", 80: "🌧️", 95: "⛈️", 99: "🌩️"
    };
    return map[code] || "❓";
}

function weatherDescription(code) {
    const map = {
        0: "Trời quang", 1: "Ít mây", 2: "Mây rải rác", 3: "Nhiều mây",
        45: "Sương mù", 48: "Sương giá", 51: "Mưa nhẹ", 61: "Mưa vừa",
        63: "Mưa lớn", 80: "Mưa rào", 95: "Dông", 99: "Dông mạnh"
    };
    return map[code] || "Không rõ";
}

function setProvinceBackground(provinceName) {
    const bg = document.getElementById('weatherBg');

    const removeDiacritics = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D");
    };

    let filename = removeDiacritics(provinceName.toLowerCase())
        .replace(/[-\.]/g, ' ')      // đổi dấu '-' và '.' thành khoảng trắng
        .replace(/\s+/g, '_')        // đổi khoảng trắng thành '_'
        + ".jpg";

    // Áp dụng ảnh cho toàn bộ widget
    bg.style.backgroundImage = `url('assets/bg_provinces/${filename}')`;

    // Thêm fallback nếu ảnh không load được
    bg.onerror = function () {
        console.log('Không thể load ảnh cho tỉnh:', provinceName);
        bg.style.backgroundImage = 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)';
    };
}

// Khởi tạo dropdown khi load trang
document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById('provinceSelect');
    provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = `${p.lat},${p.lon}`;
        opt.textContent = p.name;
        select.appendChild(opt);
    });

    fetchWeather(); // tỉnh đầu tiên
    // Không tự động hiển thị widget, chỉ hiển thị khi user click nút
    document.getElementById('weatherWidget').style.display = 'none';

    // Khởi tạo drag and drop cho weather widget
    if (typeof setupWeatherDragAndDrop === 'function') {
        setupWeatherDragAndDrop();
    }
});