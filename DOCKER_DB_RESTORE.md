# Hướng dẫn import dữ liệu vào Postgres container (Docker)
REBUILD DB CONTAINER & VOLUME
1) Tìm volume mà container db đang dùng
```bash
docker ps -a --filter volume=webgis_development_db_data
```
2) Dừng và xoá container đó
```bash
docker stop <id_container>
docker rm -f <id_container>
```
3) Xoá volume
```bash
docker compose down -v
```
4) Tạo lại volume rỗng
```bash
docker compose up -d
```

Các thông số mặc định trong dự án:
- Tên container DB: `webgis_db`
- Tên database bên trong: `debaodb`
- Network docker-compose: `webgis_development_default`

## 0) Build images và khởi động stack
```bash
# Trong thư mục Webgis_Development
# Build riêng backend + frontend
docker compose build backend frontend
# Hoặc build tất cả services
docker compose build
# Khởi động (tự build nếu cần)
docker compose up -d --build
```

## 1) Đảm bảo DB container đang chạy
```bash
# Trong thư mục Webgis_Development
docker compose up -d db
```

## 2) Copy file backup.sql vào container
- Windows (PowerShell):
```bash
docker cp .\backup.sql webgis_db:/backup.sql
```
- macOS/Linux:
```bash
docker cp ./backup.sql webgis_db:/backup.sql
```

## 3) (Tuỳ chọn) Dọn sạch schema `public` trước khi import
Chỉ dùng khi cần xoá dữ liệu/schema cũ để tránh xung đột.
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
```

## 4) Bật các extension cần thiết
```bash
docker exec webgis_db psql -U postgres -d debaodb -c 'CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

## 5) Import dữ liệu từ `backup.sql`
```bash
docker exec webgis_db bash -lc "psql -U postgres -d debaodb -f /backup.sql"
```

## 6) Kiểm tra sau import
- Liệt kê bảng:
```bash
docker exec webgis_db psql -U postgres -d debaodb -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```
- Ước lượng số dòng mỗi bảng:
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;"
```
- Kiểm tra sequence:
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "SELECT sequence_name, start_value, increment_by FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name;"
```
- Kiểm tra giá trị hiện tại của sequence:
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "SELECT schemaname, sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename;"
```
- Kiểm tra cấu trúc một table cụ thể:
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "\d+ table_name"
```
- Hoặc dùng SQL để xem cấu trúc:
```bash
docker exec webgis_db psql -U postgres -d debaodb -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='table_name' AND table_schema='public' ORDER BY ordinal_position;"
```

---

## Phụ lục: Nếu có file dump `.dump` (custom format)
- Dùng client Postgres 17 để restore (tránh lệch phiên bản), kết nối qua network docker-compose:
```bash
# Windows (PowerShell)
docker run --rm -e PGPASSWORD=123456 --network webgis_development_default -v %cd%:/work postgres:17-alpine \
  pg_restore -h webgis_db -U postgres -d debaodb -c --no-owner --no-privileges /work/backup.dump

# macOS/Linux
docker run --rm -e PGPASSWORD=123456 --network webgis_development_default -v "$PWD":/work postgres:17-alpine \
  pg_restore -h webgis_db -U postgres -d debaodb -c --no-owner --no-privileges /work/backup.dump
```

## Lưu ý
- Nếu network khác, kiểm tra bằng: `docker network ls`.
- Nếu DB name/container khác, sửa tương ứng trong câu lệnh.
- Nếu gặp lỗi locale khi dùng `pg_restore -C`, ưu tiên dùng `backup.sql` (plain SQL) + bước bật extension như trên. 