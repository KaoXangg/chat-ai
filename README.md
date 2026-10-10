# ✨ Chat AI

Ứng dụng web trò chuyện với AI đa mô hình, lấy cảm hứng từ trải nghiệm ChatGPT: phản hồi streaming theo thời gian thực, quản lý lịch sử hội thoại, hỗ trợ nhiều nhà cung cấp AI (Groq, Google Gemini, OpenRouter) và có trang quản trị để quản lý người dùng, mô hình AI.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-CC2927?logo=microsoftsqlserver&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)

> Dự án phục vụ học tập và phát triển. Các tính năng khi chạy thực tế phụ thuộc vào cấu hình database, API key và môi trường triển khai.

## Mục lục

1. [Tính năng](#tính-năng)
2. [Phân quyền](#phân-quyền)
3. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
4. [Kiến trúc](#kiến-trúc)
5. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
6. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
7. [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
8. [Biến môi trường](#biến-môi-trường)
9. [Cấu hình AI provider](#cấu-hình-ai-provider)
10. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
11. [Tài khoản quản trị](#tài-khoản-quản-trị)
12. [Xác thực và bảo mật](#xác-thực-và-bảo-mật)
13. [API](#api)
14. [Build production](#build-production)
15. [Xử lý sự cố](#xử-lý-sự-cố)
16. [Hướng phát triển](#hướng-phát-triển)
17. [Đóng góp](#đóng-góp)
18. [Giấy phép](#giấy-phép)

## Tính năng

- **Trò chuyện AI**: phản hồi dạng **streaming**, hiển thị nội dung theo thời gian thực.
- **Quản lý hội thoại**: tạo nhiều cuộc trò chuyện; tìm kiếm, ghim, đổi tên và xóa.
- **Hiển thị nội dung giàu định dạng**: Markdown (GFM), công thức toán bằng **KaTeX**, khối mã có tô màu cú pháp.
- **Thao tác trên câu trả lời**: sao chép, tạo lại câu trả lời, đánh giá phản hồi.
- **Đa nhà cung cấp AI**: tích hợp **Groq**, **Google Gemini**, **OpenRouter** với bộ định tuyến provider và cơ chế **fallback**; chọn model ngay trong giao diện chat.
- **Tài khoản**: đăng ký, đăng nhập bằng **JWT**, quên/đặt lại mật khẩu qua email (tùy cấu hình).
- **Giới hạn tần suất** yêu cầu chat để tránh lạm dụng.
- **Admin Dashboard**: thống kê và biểu đồ; quản lý người dùng (khóa/mở khóa, phân quyền); quản lý danh sách AI model (bật/tắt, chọn model mặc định); theo dõi trạng thái cấu hình provider.
- **Giao diện**: hiện đại, hoạt ảnh mượt (Framer Motion), thông báo toast, hộp thoại xác nhận, chế độ giao diện theo theme.

## Phân quyền

Hai vai trò: `user` và `admin`.

| Chức năng | Admin | User |
|---|:---:|:---:|
| Đăng ký, đăng nhập, đặt lại mật khẩu | ✅ | ✅ |
| Trò chuyện với AI, chọn model | ✅ | ✅ |
| Quản lý hội thoại của chính mình | ✅ | ✅ |
| Xem dashboard thống kê | ✅ | ❌ |
| Quản lý người dùng (khóa/mở khóa, phân quyền) | ✅ | ❌ |
| Quản lý AI model (bật/tắt, đặt mặc định) | ✅ | ❌ |
| Xem trạng thái cấu hình provider | ✅ | ❌ |

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Frontend | React 18, Vite 7, React Router 7, Axios |
| Giao diện | Tailwind CSS 4, Framer Motion, Lucide React |
| Biểu đồ | Recharts |
| Nội dung chat | React Markdown, remark-gfm, remark-math, KaTeX, syntax highlighting |
| Backend | Node.js, Express 4 |
| Cơ sở dữ liệu | Microsoft SQL Server (ORM Sequelize, driver Tedious) |
| Xác thực | JSON Web Token (JWT), `bcryptjs` |
| AI providers | Groq, Google Gemini, OpenRouter |
| Email | Nodemailer |

## Kiến trúc

```
┌──────────────────┐   REST/JSON + Bearer JWT   ┌─────────────────────┐   T-SQL   ┌────────────┐
│ React + Vite     │ ─────────────────────────► │ Express API         │ ────────► │ SQL Server │
│ (port 5173)      │ ◄───────────────────────── │ (port 5000)         │ ◄──────── │            │
└──────────────────┘     streaming response     └─────────────────────┘           └────────────┘
                                                     │        │
                                                     │        └─► SMTP (email đặt lại mật khẩu)
                                                     └─► Provider Router ─► Groq / Gemini / OpenRouter
                                                                            (fallback khi lỗi)
```

Backend theo mô hình `routes → middleware (auth, admin, rate limit) → providers / models → database`, lỗi được xử lý tập trung bằng error handler.

## Cấu trúc thư mục

```
chat-ai/
├── backend/
│   ├── config/             # Cấu hình kết nối database
│   ├── middleware/         # Auth, admin, rate limit, error handler
│   ├── models/             # User, Conversation, Message, AIModel...
│   ├── providers/          # Tích hợp và định tuyến AI providers
│   ├── routes/             # API auth, chat, conversations, admin, models
│   ├── sql/
│   │   └── schema.sql      # Cấu trúc database, nâng cấp DB cũ và hạn mức token
│   ├── utils/              # Tiện ích token, email, avatar...
│   ├── .env.example        # Mẫu biến môi trường
│   ├── package.json
│   ├── seed.js             # Khởi tạo dữ liệu ban đầu
│   └── server.js           # Entry point
├── frontend/
│   ├── src/
│   │   ├── api/            # Cấu hình gọi API
│   │   ├── components/     # Thành phần giao diện
│   │   ├── context/        # Auth, theme, toast, confirm
│   │   ├── hooks/          # Hooks xử lý chat
│   │   ├── pages/          # Trang người dùng và quản trị
│   │   └── utils/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   └── start-project.mjs   # Chạy và dừng hai server trong một terminal
├── start-project.bat       # Launcher Windows
├── .editorconfig
├── .gitignore
└── README.md
```

## Yêu cầu hệ thống

- Node.js 22.12 trở lên trong nhánh 22, hoặc Node.js >= 24, và npm
- Microsoft SQL Server và SSMS, đã bật **SQL Server Authentication (Mixed Mode)** nếu dùng tài khoản SQL
- API key của **ít nhất một** nhà cung cấp AI (Groq, Gemini hoặc OpenRouter)
- Tài khoản SMTP (tùy chọn, chỉ cần khi dùng chức năng quên/đặt lại mật khẩu qua email)
- Git và trình duyệt hiện đại

## Cài đặt và chạy dự án

### Chạy nhanh trên Windows bằng file BAT

Sau khi cài Node.js và cấu hình SQL Server cùng `backend/.env`, nhấp đúp **`start-project.bat`** ở thư mục gốc. Không cần mở VS Code.

Launcher tự cài dependency bằng `npm ci` nếu chưa có, chạy backend/frontend chung **một cửa sổ terminal**, đợi hai server sẵn sàng rồi mở `http://localhost:5173`. Giữ cửa sổ này mở khi sử dụng. SQL Server cần đang chạy. Lần đầu vẫn cần tạo database và chạy seed theo hướng dẫn bên dưới; launcher không tự seed hoặc thay mật khẩu.

Backend mặc định chỉ hiện trạng thái sẵn sàng và lỗi, không in toàn bộ SQL hoặc từng HTTP request. Khi cần kiểm tra chi tiết, đặt `DB_LOG_SQL=true` hoặc `HTTP_LOG_REQUESTS=true` trong `backend/.env` rồi khởi động lại backend.

Nếu thiếu `backend/.env`, launcher tạo bản mẫu rồi dừng để bạn điền cấu hình. Nếu thiếu `frontend/.env`, launcher tạo cấu hình mẫu. Khi đổi `PORT` của backend, cập nhật `VITE_API_URL` trong cấu hình frontend cho khớp; `CLIENT_URL` của backend cần cho phép `http://localhost:5173`.

Để dừng dự án, nhấn **Ctrl+C** trong cửa sổ terminal chung; launcher sẽ dừng cả backend và frontend. Nếu một server lỗi và thoát, launcher cũng dừng server còn lại. Nếu chạy launcher lần nữa trong khi server đang chạy, nó sẽ báo cổng đang được sử dụng. Có thể chạy `start-project.bat --check` để kiểm tra Node.js, dependency và các cấu hình backend bắt buộc mà không mở server/trình duyệt hoặc cài dependency; lệnh này không kiểm tra kết nối SQL Server hay API key.

### 1. Clone

```bash
git clone https://github.com/KaoXangg/chat-ai.git
cd chat-ai
```

### 2. Tạo database

Mở SSMS, kết nối SQL Server và chạy:

```sql
CREATE DATABASE chat_ai;
```

Chọn database `chat_ai`, sau đó mở và thực thi (F5) file `backend/sql/schema.sql` để tạo cấu trúc bảng.

Backend tự bổ sung các cột và index tương thích khi khởi động, gồm `PasswordResets.attempts`, `Users.tokenVersion` và `Messages.requestId`. Tài khoản database cần quyền thay đổi schema cho bước này; có thể chạy `backend/sql/schema.sql` trước bằng tài khoản quản trị database.

### 3. Chạy Backend

```bash
cd backend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Sửa giá trị trong `backend/.env` (xem mục [Biến môi trường](#biến-môi-trường)), rồi:

```bash
npm run seed              # Khởi tạo dữ liệu ban đầu (chạy lần đầu)
npm run dev
```

Sau khi seed lần đầu, chạy lại `backend/sql/schema.sql` trong SSMS để áp dụng hạn mức token cho danh sách model vừa tạo.

API chạy tại `http://localhost:5000`, kiểm tra tại `http://localhost:5000/api/health`.

### 4. Chạy Frontend

Mở terminal thứ hai:

```bash
cd frontend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
npm run dev
```

Kiểm tra giá trị API base URL trong `frontend/.env` theo `frontend/.env.example`. Ứng dụng chạy tại `http://localhost:5173`.

### Scripts

| Thư mục | Lệnh | Mô tả |
|---|---|---|
| `backend` | `npm run dev` | Chạy backend ở chế độ phát triển |
| `backend` | `npm run seed` | Khởi tạo dữ liệu ban đầu (tài khoản admin, danh sách model) |
| `frontend` | `npm run dev` | Chạy Vite dev server |
| `frontend` | `npm run build` | Build frontend ra thư mục `dist/` |
| `backend` | `npm test` | Kiểm thử API, xác thực và các tình huống lỗi chat bằng dữ liệu giả |
| `frontend` | `npm test` | Build production và kiểm thử trình duyệt bằng Playwright |

Kiểm thử trình duyệt dùng Chrome/Edge đã cài trên Windows, hoặc Chromium của Playwright (`npx playwright install chromium`). Có thể chỉ định trình duyệt qua `PLAYWRIGHT_CHROME_EXECUTABLE`. Các kiểm thử dùng API giả, không gọi nhà cung cấp AI hoặc sửa database thật.

## Biến môi trường

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=chat_ai
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

# Authentication
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# Tài khoản admin (dùng khi seed)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password

# AI providers (cần ít nhất một key)
GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
TAVILY_API_KEY=

# Rate limit
CHAT_RATE_LIMIT_PER_MINUTE=10
```

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `PORT` | | Cổng backend (mặc định 5000) |
| `CLIENT_URL` | ✅ | Origin của frontend, dùng cho CORS |
| `DB_LOG_SQL`, `HTTP_LOG_REQUESTS` | | Đặt `true` để bật log SQL hoặc HTTP; mặc định tắt |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | ✅ | Thông tin kết nối SQL Server |
| `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT` | | Tùy chọn mã hóa kết nối; môi trường local thường dùng `false` / `true` |
| `JWT_SECRET` | ✅ | Khóa ký token, dùng chuỗi dài và ngẫu nhiên |
| `JWT_EXPIRES_IN` | | Thời hạn token (ví dụ `7d`) |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | ✅ | Tài khoản admin được tạo khi chạy `npm run seed` |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | ✅ | Cần ít nhất một key |
| `TAVILY_API_KEY` | | Key dịch vụ bổ sung, tùy chọn |
| `CHAT_RATE_LIMIT_PER_MINUTE` | | Số yêu cầu chat tối đa mỗi phút |

> Đây là cấu hình mẫu. Hãy đối chiếu với `backend/.env.example` của phiên bản bạn đang dùng. Cấu hình SMTP cho email nếu cần dùng chức năng đặt lại mật khẩu.

### Frontend (`frontend/.env`)

Chỉ đặt **API base URL** của backend theo `frontend/.env.example`. **Không** đặt API key hay thông tin bí mật vào biến có tiền tố `VITE_`, vì các giá trị này bị đưa vào mã chạy trên trình duyệt.

## Cấu hình AI provider

Chỉ cần cấu hình **ít nhất một** provider. Khởi động lại backend sau khi thay đổi `.env`.

| Provider | Nơi lấy API key |
|---|---|
| Groq | https://console.groq.com/keys |
| Google Gemini | https://aistudio.google.com |
| OpenRouter | https://openrouter.ai/keys |

Khi một provider gặp lỗi hoặc hết hạn mức, bộ định tuyến sẽ **fallback** sang model đang bật của provider khác đã được cấu hình và đáp ứng loại nội dung trong lịch sử hội thoại. Khi tắt toàn bộ model, chat sẽ báo không có model khả dụng. API key chỉ nằm ở backend, không đưa xuống trình duyệt.

## Cơ sở dữ liệu

Toàn bộ SQL nằm trong một file `backend/sql/schema.sql`: tạo database và bảng, bổ sung các cột còn thiếu trên DB cũ, tạo index và đặt hạn mức token. Chạy toàn bộ file bằng SSMS / sqlcmd. Các model chính (thư mục `backend/models/`):

| Model | Mô tả |
|---|---|
| `User` | Người dùng: mật khẩu băm bcrypt, vai trò, trạng thái khóa |
| `Conversation` | Cuộc hội thoại: tiêu đề, trạng thái ghim, chủ sở hữu |
| `Message` | Tin nhắn trong hội thoại: nội dung, vai trò (người dùng / AI), model sử dụng |
| `AIModel` | Danh sách mô hình AI: provider, trạng thái bật/tắt, model mặc định |

Quan hệ chính: `User` 1–N `Conversation`; `Conversation` 1–N `Message`.

Phần cuối script đặt hạn mức mỗi người dùng / model / ngày cho các model đang có `dailyTokenLimit = 0`: Gemini **100.000**, Groq **50.000**, OpenRouter **30.000**, provider khác **50.000** token. Hạn mức khác `0` được giữ nguyên. Vì `0` trong ứng dụng có nghĩa là không giới hạn, nếu muốn dùng không giới hạn hãy đặt lại `0` trong Admin sau khi chạy script. Script không tạo tài khoản admin hoặc danh sách model; với DB mới, chạy `npm run seed` rồi chạy lại script để áp dụng hạn mức cho model vừa tạo.

Gửi lại cùng `requestId` không tạo thêm câu hỏi hoặc tính lại token cho câu trả lời đã hoàn tất. Khóa ứng dụng SQL Server (`sp_getapplock`) tuần tự hóa chat theo người dùng và hội thoại, kể cả khi chạy nhiều backend; yêu cầu trùng lúc nhận `409 CHAT_BUSY`. Pool giữ khóa được tách khỏi pool truy vấn để các luồng streaming không chặn việc lưu dữ liệu.

## Tài khoản quản trị

Tài khoản admin được tạo theo cấu hình trong `backend/.env` và logic của `backend/seed.js`:

1. Đặt `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `backend/.env`. Mật khẩu phải có ít nhất 12 ký tự và khác các giá trị mẫu; seed không có mật khẩu mặc định.
2. Chạy `npm run seed` trong thư mục `backend`.
3. Đăng nhập bằng thông tin vừa cấu hình và mở khu vực quản trị.

> ⚠️ Không dùng mật khẩu mẫu ở môi trường công khai. Nếu đã seed trước khi sửa biến môi trường, hãy kiểm tra `backend/seed.js` và dữ liệu hiện có để cập nhật tài khoản admin.

## Xác thực và bảo mật

- API kiểm tra kiểu dữ liệu, ID và giới hạn số trước khi cập nhật. Các thao tác đổi model mặc định được khóa để tránh có nhiều model mặc định khi quản trị đồng thời.
- Xóa hội thoại hoặc tài khoản dùng transaction; câu trả lời thành công và bản ghi token cũng được lưu trong cùng transaction.
- Khóa tài khoản thu hồi JWT cũ; mở khóa không khôi phục những JWT đã bị thu hồi. Chạy lại seed giữ nguyên lựa chọn tắt model của quản trị viên.

- Xác thực bằng **JWT**, gửi qua header `Authorization: Bearer <token>`.
- Đổi hoặc đặt lại mật khẩu thu hồi toàn bộ JWT cũ qua `tokenVersion`; người dùng cần đăng nhập lại. Lỗi database tạm thời không xóa phiên đăng nhập đã lưu trên trình duyệt.
- Mật khẩu được băm bằng `bcryptjs`; không lưu mật khẩu dạng thô.
- Middleware tách riêng cho **xác thực** và **phân quyền admin**; lỗi được xử lý tập trung.
- **Rate limit** cho yêu cầu chat, cấu hình qua `CHAT_RATE_LIMIT_PER_MINUTE`.
- CORS giới hạn theo `CLIENT_URL`.
- API key của AI provider chỉ nằm ở backend.

`sprintf-js`, phụ thuộc gián tiếp của driver SQL Server, dùng bản vá cục bộ có giới hạn tài nguyên. Nguồn, giấy phép và hướng dẫn thay thế khi upstream phát hành bản vá nằm tại [backend/vendor/sprintf-js/README.md](backend/vendor/sprintf-js/README.md).

Lưu ý khi đưa lên GitHub:

- **Không commit** `backend/.env`, `frontend/.env` hoặc file chứa API key, mật khẩu.
- `.env.example` chỉ chứa giá trị mẫu.
- `.gitignore` cần loại trừ `.env`, `.env.*` (trừ `.env.example`), `node_modules/`, `dist/`.
- Project đã bỏ qua cấu hình IDE (`.vscode/`, `.idea/`), file `.seeded`, báo cáo Playwright, coverage, cache, log và file backup database. Chúng vẫn nằm trên máy, không được thêm vào commit thông thường.
- File riêng khác có thể đặt vào `local-only/` ở thư mục gốc; thư mục này cũng được Git bỏ qua. Script `start-project.bat`, thư mục `scripts/`, mã nguồn, test, `package-lock.json`, `.env.example` và `backend/vendor/sprintf-js/` cần được commit để project cài và chạy được ở máy khác.
- Nếu secret lỡ bị push, hãy **thu hồi / đổi secret ngay** và xử lý lịch sử Git; xóa khỏi mã nguồn là chưa đủ.
- Khi triển khai: dùng mật khẩu quản trị mạnh, giới hạn quyền tài khoản database, bật HTTPS.

## API

Base URL: `http://localhost:5000/api`. Các nhóm route nằm trong `backend/routes/`:

| Nhóm | Mô tả | Quyền |
|---|---|---|
| Auth | Đăng ký, đăng nhập, quên/đặt lại mật khẩu | Public / đã đăng nhập |
| Chat | Gửi tin nhắn, nhận phản hồi streaming (có rate limit) | Đã đăng nhập |
| Conversations | Danh sách, tìm kiếm, ghim, đổi tên, xóa hội thoại | Đã đăng nhập |
| Models | Danh sách model khả dụng để chọn trong giao diện chat | Đã đăng nhập |
| Admin | Thống kê, quản lý người dùng, quản lý model, trạng thái provider | Admin |

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra trạng thái API |

> Chi tiết từng endpoint (đường dẫn, tham số) xem trong các file tại `backend/routes/`.

## Build production

```bash
cd frontend
npm run build
```

Kết quả nằm trong `frontend/dist/`, thường không cần commit lên Git. Khi triển khai: đặt `NODE_ENV=production`, cập nhật `CLIENT_URL` đúng domain, dùng HTTPS và sao lưu database định kỳ.

## Xử lý sự cố

| Lỗi | Cách xử lý |
|---|---|
| Backend không kết nối được SQL Server | Kiểm tra SQL Server service đã chạy, host/port, tên database, tài khoản, mật khẩu; bật TCP/IP (port 1433) và chế độ xác thực phù hợp. |
| `Login failed for user` | Bật SQL Server Authentication nếu dùng tài khoản SQL; kiểm tra lại `DB_USER`/`DB_PASSWORD` trong `.env`. |
| Frontend không gọi được API / `Not allowed by CORS` | Kiểm tra backend đang chạy, API base URL ở frontend và `CLIENT_URL` ở backend khớp với origin của frontend. |
| AI trả lỗi hoặc hết quota | Kiểm tra API key, model đã được bật trong trang quản trị chưa, hạn mức provider và log backend. |
| Không đăng nhập được admin | Kiểm tra role trong database, cấu hình `ADMIN_*` và logic `seed.js`. |
| Port đã được sử dụng | Đóng tiến trình đang chiếm port, hoặc đổi `PORT` trong `backend/.env` (và API base URL ở frontend cho khớp). |
| Sửa `.env` nhưng không có tác dụng | Khởi động lại backend sau khi chỉnh biến môi trường. |
| `Cannot find module` | Chạy lại `npm install` trong thư mục tương ứng. |

## Hướng phát triển

- [x] Bổ sung kiểm thử tự động cho API và giao diện.
- [ ] Hoàn thiện phân trang và bộ lọc nâng cao cho trang quản trị.
- [ ] Bổ sung logging, giám sát lỗi và thống kê mức sử dụng.
- [ ] Cải thiện quản lý quota, timeout và retry cho từng AI provider.
- [ ] Chuẩn hóa quy trình triển khai production (Docker) và sao lưu database.

## Đóng góp

1. Fork repository.
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: mô tả ngắn gọn"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request.

## Giấy phép

Repository hiện chưa có giấy phép phân phối. Hãy bổ sung file `LICENSE` (ví dụ MIT) nếu bạn muốn công bố điều khoản sử dụng và tái phân phối.
