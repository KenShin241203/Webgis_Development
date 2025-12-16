// ===== WEATHER WIDGET DRAG AND DROP ===== //

// Biến để lưu trạng thái drag
let isDraggingWeather = false;
let dragOffsetWeather = { x: 0, y: 0 };

// Hàm để thiết lập drag and drop cho widget thời tiết
function setupWeatherDragAndDrop() {
    const weatherWidget = document.getElementById('weatherWidget');

    if (!weatherWidget) {
        console.error('Không tìm thấy weather widget');
        return;
    }

    // Bắt đầu drag từ bất kỳ đâu trên widget
    weatherWidget.addEventListener('mousedown', function (e) {
        // Không drag khi click vào các element tương tác
        if (e.target.tagName === 'SELECT' || e.target.closest('select') ||
            e.target.tagName === 'OPTION' || e.target.closest('option') ||
            e.target.tagName === 'BUTTON' || e.target.closest('button') ||
            e.target.tagName === 'INPUT' || e.target.closest('input') ||
            e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }

        isDraggingWeather = true;
        const rect = weatherWidget.getBoundingClientRect();
        dragOffsetWeather.x = e.clientX - rect.left;
        dragOffsetWeather.y = e.clientY - rect.top;

        weatherWidget.style.cursor = 'grabbing';
        weatherWidget.classList.add('dragging');
        e.preventDefault();
    });

    // Di chuyển
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingWeather) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const widgetRect = weatherWidget.getBoundingClientRect();

        let newX = e.clientX - dragOffsetWeather.x;
        let newY = e.clientY - dragOffsetWeather.y;

        // Giới hạn trong viewport
        const maxX = viewportWidth - widgetRect.width;
        const maxY = viewportHeight - widgetRect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Cập nhật vị trí
        weatherWidget.style.left = newX + 'px';
        weatherWidget.style.top = newY + 'px';
        weatherWidget.style.right = 'auto'; // Reset right position
    });

    // Kết thúc drag
    document.addEventListener('mouseup', function () {
        if (isDraggingWeather) {
            isDraggingWeather = false;
            weatherWidget.style.cursor = 'move';
            weatherWidget.classList.remove('dragging');
        }
    });

    // Thêm touch events cho mobile
    weatherWidget.addEventListener('touchstart', function (e) {
        if (e.target.tagName === 'SELECT' || e.target.closest('select') ||
            e.target.tagName === 'OPTION' || e.target.closest('option') ||
            e.target.tagName === 'BUTTON' || e.target.closest('button') ||
            e.target.tagName === 'INPUT' || e.target.closest('input') ||
            e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }

        isDraggingWeather = true;
        const touch = e.touches[0];
        const rect = weatherWidget.getBoundingClientRect();
        dragOffsetWeather.x = touch.clientX - rect.left;
        dragOffsetWeather.y = touch.clientY - rect.top;

        weatherWidget.style.cursor = 'grabbing';
        weatherWidget.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('touchmove', function (e) {
        if (!isDraggingWeather) return;

        const touch = e.touches[0];
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const widgetRect = weatherWidget.getBoundingClientRect();

        let newX = touch.clientX - dragOffsetWeather.x;
        let newY = touch.clientY - dragOffsetWeather.y;

        // Giới hạn trong viewport
        const maxX = viewportWidth - widgetRect.width;
        const maxY = viewportHeight - widgetRect.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Cập nhật vị trí
        weatherWidget.style.left = newX + 'px';
        weatherWidget.style.top = newY + 'px';
        weatherWidget.style.right = 'auto';

        e.preventDefault(); // Ngăn scroll trang khi drag
    });

    document.addEventListener('touchend', function () {
        if (isDraggingWeather) {
            isDraggingWeather = false;
            weatherWidget.style.cursor = 'move';
            weatherWidget.classList.remove('dragging');
        }
    });

    console.log('Đã thiết lập drag and drop cho weather widget');
}

// Khởi tạo drag and drop khi DOM load xong
document.addEventListener('DOMContentLoaded', function () {
    // Đợi một chút để đảm bảo weather widget đã được tạo
    setTimeout(() => {
        setupWeatherDragAndDrop();
    }, 100);
});

// Export function ra window object
window.setupWeatherDragAndDrop = setupWeatherDragAndDrop; 