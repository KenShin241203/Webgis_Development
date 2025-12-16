# Hướng dẫn Setup Backend Project (Node.js + Sequelize)

## 1. Yêu cầu môi trường
- Node.js >= 16.x
- npm >= 8.x hoặc yarn
- Cài đặt cơ sở dữ liệu (MySQL, PostgreSQL, v.v. — tuỳ chọn theo dự án)

## 2. Khởi tạo project
```bash
mkdir backend
cd backend
npm init -y
```

## 3. Cài đặt các dependency cần thiết

### Dependency chính:
```bash
npm install express sequelize sequelize-cli
```

### Cài đặt driver cho database (chọn 1 trong các loại dưới đây):
- **MySQL**:
  ```bash
  npm install mysql2
  ```
- **PostgreSQL**:
  ```bash
  npm install pg pg-hstore
  ```
- **SQLite** (dùng cho phát triển nhanh):
  ```bash
  npm install sqlite3
  ```

### Dependency bổ sung:
```bash
npm install dotenv cors body-parser
```

## 4. Khởi tạo Sequelize
```bash
npx sequelize-cli init
```
Lệnh này sẽ tạo các thư mục: `config`, `models`, `migrations`, `seeders`.

## 5. Cấu hình kết nối database
- Sửa file `config/config.json` hoặc tạo file `.env` để lưu thông tin kết nối.
- Ví dụ `.env`:
  ```env
  DB_USERNAME=root
  DB_PASSWORD=yourpassword
  DB_NAME=yourdbname
  DB_HOST=127.0.0.1
  DB_DIALECT=mysql
  ```

## 6. Tạo model/migration đầu tiên
```bash
npx sequelize-cli model:generate --name User --attributes username:string,password:string
```

## 7. Chạy migration
```bash
npx sequelize-cli db:migrate
```

## 8. Khởi tạo server Express mẫu
Tạo file `index.js`:
```js
const express = require('express');
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('Backend is running!'));
app.listen(3000, () => console.log('Server started on port 3000'));
```

## 9. Chạy thử server
```bash
node index.js
```

---
**Tham khảo:**
- [Sequelize Documentation](https://sequelize.org/)
- [Express Documentation](https://expressjs.com/) 