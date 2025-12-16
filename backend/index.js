const express = require('express');
const cors = require('cors');
const route = express.Router()
const app = express();
require('dotenv').config();

app.use(cors());

// Cấu hình body parser với giới hạn kích thước lớn hơn
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Serve static uploads so images are accessible via /uploads/<filename>
app.use('/uploads', express.static('uploads'));

const login = require('./src/routes/auth/login.api');
const user = require('./src/routes/user/user.api');
const chatLuong = require('./src/routes/chat_luong/chatluong.api');
const cong = require('./src/routes/cong/cong.api');
const debao = require('./src/routes/debao/debao.api');
const dolunVelo = require('./src/routes/dolun_velo/dolunvelo.api');
const hientrang = require('./src/routes/hientrang/hientrang.api');
const ngaplut = require('./src/routes/ngaplut/ngaplut.api');
const sutlun = require('./src/routes/sutlun/sutlun.api');
const khaosat = require('./src/routes/khaosat/khaosat.api');
const upload = require('./src/routes/upload/upload.api');
const roles = require('./src/routes/auth/roles.api');
const permissions = require('./src/routes/auth/permissions.api');

app.use('/api', login)
app.use('/api', user)
app.use('/api', chatLuong)
app.use('/api', cong)
app.use('/api', debao)
app.use('/api', dolunVelo)
app.use('/api', hientrang);
app.use('/api', ngaplut);
app.use('/api', sutlun);
app.use('/api', khaosat);
app.use('/api', upload);
app.use('/api', roles);
app.use('/api', permissions);

app.listen(process.env.PORT_SERVER, () => console.log(`Server started on port ${process.env.PORT_SERVER}`));

