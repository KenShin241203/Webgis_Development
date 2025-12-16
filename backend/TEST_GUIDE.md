# Hướng dẫn test backend project

## 0. Khởi tạo và migrate database nhanh cho tester

**Bước 1:** Cài đặt dependency (nếu chưa có)
```bash
npm install
```

**Bước 2:** Cấu hình kết nối database
- Sửa file `config/config.json` hoặc `.env` cho đúng thông tin database local của bạn.

**Bước 3:** Tạo database (nếu chưa có)
```bash
npx sequelize-cli db:create
```

**Bước 4:** Chạy migrate để tạo bảng
```bash
npx sequelize-cli db:migrate
```

---

## 1. Chuẩn bị môi trường
- Đảm bảo đã setup project theo file `SETUP_BACKEND.md`.
- Đảm bảo database đã migrate đầy đủ.
- Server chạy ở port đúng (theo biến môi trường `PORT_SERVER`).

---

## 2. Đăng nhập (API: `/api/login`)

**Phương thức:** `POST`  
**Body (JSON):**
```json
{
  "username": "admin",
  "password": "admin_password"
}
```

**Kết quả mong đợi:**
- Nếu đúng: trả về `access_token` và thông tin user.
- Nếu sai: trả về mã lỗi 401 và thông báo "Sai tài khoản hoặc mật khẩu".

**Lưu ý:**  
- Đảm bảo user này đã tồn tại trong database.
- Token trả về dùng để test các API cần xác thực phía dưới.

---

## 3. Tạo user mới (API: `/api/create/users`)

**Phương thức:** `POST`  
**Yêu cầu:**  
- Header: `Authorization: Bearer <access_token>` (token của user có role `admin`)
- Body (JSON):
```json
{
  "username": "testuser1",
  "email": "testuser1@example.com",
  "password": "123456",
  "role": "user"
}
```

**Kết quả mong đợi:**
- Nếu thành công: trả về status 201, message "Tạo user thành công" và thông tin user vừa tạo.
- Nếu username hoặc email đã tồn tại: trả về lỗi 500, message "User đã tồn tại trong hệ thống!!!" hoặc lỗi unique email.

**Kiểm tra thêm:**
- Không truyền trường `role` → user sẽ có role mặc định là "user".
- Không truyền trường `email` hoặc truyền email trùng → phải báo lỗi.

---

## 4. Cập nhật role user (API: `/api/update/user/role`)

**Phương thức:** `PUT`  
**Yêu cầu:**  
- Header: `Authorization: Bearer <access_token>` (token của user có role `admin`)
- Body (JSON):
```json
{
  "id": "user-uuid-here",
  "role": "admin"
}
```

**Kết quả mong đợi:**
- Nếu thành công: trả về status 200, message "Cập nhật role thành công" và thông tin user đã cập nhật.
- Nếu user không tồn tại: trả về lỗi 500, message "User không tồn tại trong hệ thống!!!".
- Nếu không có quyền admin: trả về lỗi 403.

**Kiểm tra thêm:**
- Thử cập nhật role thành "user", "admin", hoặc role khác.
- Kiểm tra khi truyền sai UUID hoặc UUID không tồn tại.

---

## 5. Lấy tất cả dữ liệu chat_luong (API: `/api/chat-luong`)

**Phương thức:** `GET`  
**Yêu cầu:** Không cần authentication

**Kết quả mong đợi:**
- Nếu thành công: trả về status 200, message "Lấy dữ liệu chat_luong thành công", data (mảng các object chat_luong), và count (số lượng bản ghi).
- Nếu có lỗi: trả về status 500 và thông báo lỗi.

**Ví dụ response:**
```json
{
  "message": "Lấy dữ liệu chat_luong thành công",
  "data": [
    {
      "id": 1,
      "name": "Tên chat_luong",
      "layer": "layer_name",
      "kml_folder": "folder_path",
      "geometry": {...},
      "kind_id": 1
    }
  ],
  "count": 1
}
```

---

## 6. Lấy tất cả dữ liệu cong (API: `/api/cong`)

**Phương thức:** `GET`  
**Yêu cầu:** Không cần authentication

**Kết quả mong đợi:**
- Nếu thành công: trả về status 200, message "Lấy dữ liệu cong thành công", data (mảng các object cong), và count (số lượng bản ghi).
- Nếu có lỗi: trả về status 500 và thông báo lỗi.

**Ví dụ response:**
```json
{
  "message": "Lấy dữ liệu cong thành công",
  "data": [
    {
      "id": 1,
      "ten": "Tên công trình",
      "cap": 1,
      "namxaydung": 2020,
      "tenxa": "Tên xã",
      "sophai": 2,
      "bkhoang_c": 10,
      "tongcua_c": 5,
      "ghichu": "Ghi chú",
      "codecong": 123,
      "ctrinh_day": 2.5,
      "ten_chung": "Tên chung",
      "ten_rieng": "Tên riêng",
      "geometry": {...}
    }
  ],
  "count": 1
}
```

---

## 7. Lấy tất cả dữ liệu debao (API: `/api/debao`)

**Phương thức:** `GET`  
**Yêu cầu:** Không cần authentication

**Kết quả mong đợi:**
- Nếu thành công: trả về status 200, message "Lấy dữ liệu debao thành công", data (mảng các object debao), và count (số lượng bản ghi).
- Nếu có lỗi: trả về status 500 và thông báo lỗi.

**Ví dụ response:**
```json
{
  "message": "Lấy dữ liệu debao thành công",
  "data": [
    {
      "f_id": 1,
      "entity": "Tên entity",
      "layer": "Tên layer",
      "color": 1,
      "linetype": "CONTINUOUS",
      "elevation": 0.0,
      "line_wt": 1,
      "geometry": {...},
      "kind_id": 1
    }
  ],
  "count": 1
}
```

---

## 8. Lưu ý khi test

- Các API tạo user yêu cầu phải có token của admin.
- Nếu chưa có user admin, hãy tạo trực tiếp trong database hoặc seed dữ liệu.
- Kiểm tra các trường hợp nhập thiếu, sai định dạng, trùng lặp username/email.
- Kiểm tra phản hồi lỗi (status code, message) khi nhập sai.
- **Tọa độ geometry**: Tất cả API trả về dữ liệu geometry đều đã được chuyển đổi từ hệ tọa độ VN2000 (EPSG:9210) sang WGS84 (EPSG:4326) để tương thích với các ứng dụng web mapping.
- **Định dạng geometry**: Geometry được trả về dưới dạng GeoJSON với SRID 4326 (WGS84).

---

## 9. Công cụ gợi ý

- Có thể dùng Postman, Insomnia, hoặc curl để test API.
- Đảm bảo gửi đúng header `Content-Type: application/json` cho các request POST. 