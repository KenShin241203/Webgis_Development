# Hướng dẫn khắc phục lỗi 413 Request Entity Too Large

## Nguyên nhân
Lỗi "413 Request Entity Too Large" xảy ra khi nginx từ chối request vì kích thước file vượt quá giới hạn cho phép.

## Giải pháp

### 1. Cập nhật cấu hình nginx trên server production

#### Cách 1: Sử dụng Docker (Khuyến nghị)
```bash
# Rebuild và restart container với cấu hình mới
cd /path/to/your/project
docker-compose down
docker-compose up --build -d
```

#### Cách 2: Cập nhật nginx trực tiếp trên server
```bash
# Backup cấu hình hiện tại
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Tạo cấu hình mới
sudo nano /etc/nginx/sites-available/default
```

Thêm vào file nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Tăng giới hạn upload
    client_max_body_size 500M;
    client_body_buffer_size 1M;
    client_header_buffer_size 8k;
    large_client_header_buffers 8 32k;

    # Tăng timeout
    client_body_timeout 300s;
    client_header_timeout 60s;
    keepalive_timeout 65s;
    send_timeout 300s;

    # Proxy settings cho API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Tăng timeout cho upload
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 32k;
        proxy_buffers 32 32k;
        proxy_busy_buffers_size 64k;
        proxy_request_buffering off;
    }

    # Serve static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Restart nginx
```bash
# Test cấu hình
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 3. Kiểm tra Cloudflare (nếu có sử dụng)
Nếu bạn sử dụng Cloudflare, cần kiểm tra:
- Vào Cloudflare Dashboard
- Security > WAF > Rate Limiting
- Tăng giới hạn request size

### 4. Kiểm tra cấu hình backend
Backend đã được cấu hình đúng với giới hạn 100MB trong multer.

## Test sau khi sửa

1. **Test upload file nhỏ (< 1MB)**: Nên hoạt động bình thường
2. **Test upload file lớn (5-10MB)**: Kiểm tra xem có còn lỗi 413 không
3. **Test upload file rất lớn (50MB+)**: Đảm bảo timeout không quá ngắn

## Troubleshooting

### Nếu vẫn còn lỗi:
1. Kiểm tra logs nginx: `sudo tail -f /var/log/nginx/error.log`
2. Kiểm tra logs backend: `docker logs webgis_backend`
3. Kiểm tra kích thước file thực tế: `ls -lh /path/to/uploaded/file`

### Nếu sử dụng reverse proxy khác:
- Kiểm tra cấu hình Apache (nếu có)
- Kiểm tra load balancer settings
- Kiểm tra CDN settings

## Lưu ý bảo mật
- Không nên tăng `client_max_body_size` quá cao (khuyến nghị tối đa 500MB)
- Có thể thêm rate limiting để tránh abuse
- Cân nhắc compress ảnh trước khi upload
