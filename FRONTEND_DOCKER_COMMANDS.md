### Docker commands: rebuild image frontend và khởi động lại container

- **Thư mục làm việc**: chạy các lệnh trong thư mục dự án `D:\freelancer` (hoặc tương ứng trên máy bạn).
- **Compose file**: `Webgis_Development/docker-compose.yml`
- **Service**: `frontend`
- **Container name**: `webgis_frontend`

### Rebuild nhanh (không dừng container thủ công)
```powershell
# Rebuild image frontend (không dùng cache) - sẽ cập nhật code mới từ ./frontend/
docker compose -f Webgis_Development/docker-compose.yml build --no-cache frontend

# Khởi động lại container frontend với image mới
# --no-deps: không kéo các service khác
# --force-recreate: bắt buộc recreate container
# -d: chạy nền
docker compose -f Webgis_Development/docker-compose.yml up -d --no-deps --force-recreate frontend
```

### Quy trình đầy đủ (dừng và xóa container cũ trước)
```powershell
# Dừng container frontend (nếu đang chạy)
docker compose -f docker-compose.yml stop frontend

# Xóa container frontend
docker compose -f docker-compose.yml rm -f frontend

# Build lại image (không dùng cache) - sẽ cập nhật code mới từ ./frontend/
docker compose -f docker-compose.yml build --no-cache frontend

# Khởi động lại container với image mới
docker compose -f docker-compose.yml up -d --no-deps --force-recreate frontend
```

### Kiểm tra trạng thái và xác nhận nội dung
```powershell
# Xem trạng thái service
docker compose -f Webgis_Development/docker-compose.yml ps

# Kiểm tra nhanh chuỗi VN2000 có trong file đã deploy
docker compose -f Webgis_Development/docker-compose.yml exec frontend sh -lc "grep -n 'VN2000' /usr/share/nginx/html/tables/table_cong.js || sed -n '330,360p' /usr/share/nginx/html/tables/table_cong.js"
```

### Lưu ý cache trình duyệt
- Sau khi deploy, nếu giao diện vẫn hiển thị cũ: dùng Ctrl+F5, mở cửa sổ ẩn danh, hoặc bật "Disable cache" trong DevTools (tab Network) rồi reload.

---

## Rebuild toàn bộ hệ thống (Backend, Frontend, Redis, DB)

### Rebuild toàn bộ nhanh (không dừng containers) - CẬP NHẬT CODE MỚI
```powershell
# Rebuild tất cả images (không dùng cache) - sẽ cập nhật code mới từ ./frontend/ và ./backend/
docker compose -f Webgis_Development/docker-compose.yml build --no-cache

# Khởi động lại tất cả containers với images mới
docker compose -f Webgis_Development/docker-compose.yml up -d --force-recreate
```

### Quy trình đầy đủ (dừng và xóa tất cả containers) - CẬP NHẬT CODE MỚI
```powershell
# Dừng tất cả services
docker compose -f Webgis_Development/docker-compose.yml down

# Xóa tất cả containers (giữ volumes)
docker compose -f Webgis_Development/docker-compose.yml rm -f

# Build lại tất cả images (không dùng cache) - sẽ cập nhật code mới từ ./frontend/ và ./backend/
docker compose -f Webgis_Development/docker-compose.yml build --no-cache

# Khởi động lại toàn bộ hệ thống
docker compose -f Webgis_Development/docker-compose.yml up -d
```

### Rebuild riêng lẻ khi có thay đổi code
```powershell
# Khi chỉ thay đổi Frontend code
docker compose -f Webgis_Development/docker-compose.yml build --no-cache frontend
docker compose -f Webgis_Development/docker-compose.yml up -d --no-deps --force-recreate frontend

# Khi chỉ thay đổi Backend code
docker compose -f Webgis_Development/docker-compose.yml build --no-cache backend
docker compose -f Webgis_Development/docker-compose.yml up -d --no-deps --force-recreate backend

# Khi thay đổi cả Frontend và Backend code
docker compose -f Webgis_Development/docker-compose.yml build --no-cache frontend backend
docker compose -f Webgis_Development/docker-compose.yml up -d --force-recreate frontend backend
```

### Kiểm tra trạng thái toàn bộ hệ thống
```powershell
# Xem trạng thái tất cả services
docker compose -f Webgis_Development/docker-compose.yml ps

# Xem logs của tất cả services
docker compose -f Webgis_Development/docker-compose.yml logs

# Xem logs của service cụ thể
docker compose -f Webgis_Development/docker-compose.yml logs backend
docker compose -f Webgis_Development/docker-compose.yml logs frontend
```

### Lưu ý quan trọng
- **DB**: Dữ liệu sẽ được giữ nguyên trong volume `db_data` khi dùng `down` hoặc `rm`.
- **Redis**: Dữ liệu cache sẽ bị mất khi restart container.
- **Backend**: Cần đợi DB khởi động hoàn tất trước khi backend start (healthcheck đã được cấu hình).
- **Frontend**: Phụ thuộc vào backend, sẽ tự động start sau khi backend sẵn sàng.
- **Code mới**: Lệnh `build --no-cache` sẽ copy code mới từ thư mục `./frontend/` và `./backend/` vào image.
- **Dependencies**: Khi rebuild backend, frontend sẽ tự động restart vì dependency. 

✅ Lệnh Docker để chạy script initializeAuth.js:
docker-compose exec backend node src/scripts/initializeAuth.js