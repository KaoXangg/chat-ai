# ✨ Chat AI

Ứng dụng web trò chuyện với AI đa mô hình, lấy cảm hứng từ trải nghiệm ChatGPT: phản hồi streaming theo thời gian thực, quản lý lịch sử hội thoại, hỗ trợ nhiều nhà cung cấp AI (Groq, Google Gemini, OpenRouter), có hạn mức token theo gói và trang quản trị đầy đủ.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.3.7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.12%2B%20%7C%2024%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-CC2927?logo=microsoftsqlserver&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.3.3-06B6D4?logo=tailwindcss&logoColor=white)

> Dự án phục vụ học tập và phát triển. Các tính năng khi chạy thực tế phụ thuộc vào cấu hình database, API key và môi trường triển khai.

## Mục lục

1. [Tính năng](#tính-năng)
2. [Phân quyền và gói dịch vụ](#phân-quyền-và-gói-dịch-vụ)
3. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
4. [Kiến trúc](#kiến-trúc)
5. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
6. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
7. [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
8. [Biến môi trường](#biến-môi-trường)
9. [Cấu hình AI provider](#cấu-hình-ai-provider)
10. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
11. [Tài khoản quản trị và 2FA](#tài-khoản-quản-trị-và-2fa)
12. [Xác thực và bảo mật](#xác-thực-và-bảo-mật)
13. [API](#api)
14. [Kiểm thử](#kiểm-thử)
15. [Build production](#build-production)
16. [Chạy bằng Docker](#chạy-bằng-docker)
17. [Tích hợp liên tục (CI)](#tích-hợp-liên-tục-ci)
18. [Xử lý sự cố](#xử-lý-sự-cố)
19. [Hướng phát triển](#hướng-phát-triển)
20. [Đóng góp](#đóng-góp)
21. [Giấy phép](#giấy-phép)

## Tính năng

**Trò chuyện**
- Phản hồi dạng **streaming** (SSE), hiển thị nội dung theo thời gian thực.
- Tạo lại câu trả lời, sửa tin nhắn, đánh giá phản hồi, sao chép, xuất hội thoại.
- Gửi **ảnh** cho model hỗ trợ vision; **tìm kiếm web** (Tavily, tùy chọn) kèm nguồn trích dẫn.
- Tự cắt bớt tin nhắn cũ để không vượt giới hạn ngữ cảnh của model (`MAX_CONTEXT_TOKENS`).
- Markdown (GFM), công thức toán **KaTeX**, khối mã có tô màu cú pháp và xem trước mã.

**Quản lý hội thoại**
- Nhiều cuộc trò chuyện; tìm kiếm (kể cả trong nội dung tin nhắn), ghim, đổi tên, xóa, **nhân bản (fork)**.
- **Thư mục** để phân loại hội thoại và **Persona** (vai trò/prompt hệ thống dựng sẵn hoặc tự tạo).
- **Chia sẻ hội thoại** qua liên kết công khai (`/share/:shareId`), bật/tắt được.

**AI**
- Đa nhà cung cấp: **Groq**, **Google Gemini**, **OpenRouter**, có bộ định tuyến và cơ chế **fallback** sang model khác khi lỗi hoặc hết hạn mức; chọn model ngay trong giao diện chat.
- Chọn ngôn ngữ AI trả lời (tự động theo tin nhắn hoặc cố định, hỗ trợ 60 ngôn ngữ).

**Tài khoản và hạn mức**
- Đăng ký, đăng nhập, quên/đặt lại mật khẩu qua email (tùy cấu hình SMTP), đổi mật khẩu, đổi tên hiển thị, quản lý các phiên đăng nhập.
- **2FA qua email** bắt buộc cho tài khoản admin.
- **Hạn mức token theo ngày** theo gói Free / Plus / Premium, kèm trang gói dịch vụ (`/pricing`) và hộp thoại theo dõi mức sử dụng.

**Quản trị (Admin)**
- Dashboard thống kê và biểu đồ; phân tích chi phí và hiệu năng theo provider.
- Quản lý người dùng (khóa/mở khóa, phân quyền, hạn mức riêng, thu hồi phiên), phiên đăng nhập, hội thoại.
- Quản lý AI model (thêm/sửa/xóa, bật/tắt, mặc định, độ ưu tiên, hạn mức theo ngày), kiểm tra sức khỏe provider.
- Cài đặt hệ thống: bật/tắt đăng ký, chế độ bảo trì, prompt hệ thống toàn cục, từ khóa bị chặn, giới hạn tần suất, API key của provider (lưu mã hóa).
- Persona, **thông báo** toàn hệ thống, **nhật ký kiểm toán (audit log)**, xuất/nhập dữ liệu hệ thống.

**Giao diện**
- Hiện đại, hoạt ảnh mượt (Framer Motion), giao diện sáng/tối, toast, hộp thoại xác nhận.
- Đa ngôn ngữ giao diện: Tiếng Việt, English, 简体中文, 日本語, Español.
- **PWA**: cài đặt được lên điện thoại/máy tính, có service worker.

## Phân quyền và gói dịch vụ

Hai vai trò: `user` và `admin`. Tài khoản có trạng thái `active` hoặc `banned`.

| Chức năng | Admin | User |
|---|:---:|:---:|
| Đăng ký, đăng nhập, đặt lại mật khẩu | ✅ | ✅ |
| Trò chuyện với AI, chọn model | ✅ | ✅ |
| Quản lý hội thoại, thư mục, persona của chính mình | ✅ | ✅ |
| Xem dashboard thống kê | ✅ | ❌ |
| Quản lý người dùng, phiên, hội thoại | ✅ | ❌ |
| Quản lý AI model, cài đặt hệ thống, thông báo | ✅ | ❌ |
| Xem nhật ký kiểm toán, xuất/nhập dữ liệu hệ thống | ✅ | ❌ |

Hạn mức token mỗi ngày theo gói (định nghĩa trong `backend/utils/quota.js`):

| Gói | Hạn mức/ngày | Hệ số hạn mức theo từng model |
|---|---:|:---:|
| Free | 50.000 token | ×1 |
| Plus | 250.000 token | ×5 |
| Premium | 1.000.000 token | ×20 |

Admin có thể đặt hạn mức riêng cho từng người dùng. Hạn mức làm mới lúc 00:00 theo múi giờ cấu hình bởi `QUOTA_TZ_OFFSET_HOURS` (mặc định `7`, giờ Việt Nam). Khi hết hạn mức, API trả `429 QUOTA_EXCEEDED` kèm thời điểm làm mới.

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Frontend | React 18, Vite 7, React Router 7, Axios |
| Giao diện | Tailwind CSS 4, Framer Motion, Lucide React |
| Biểu đồ | Recharts |
| Nội dung chat | React Markdown, remark-gfm, remark-math, rehype-katex, KaTeX, react-syntax-highlighter |
| Backend | Node.js, Express 4, Zod (kiểm tra dữ liệu), Helmet, compression, cookie-parser, morgan |
| Cơ sở dữ liệu | Microsoft SQL Server (ORM Sequelize, driver Tedious) |
| Xác thực | JWT (access token) + refresh token cookie HttpOnly, `bcryptjs` |
| AI providers | Groq (`groq-sdk`), Google Gemini (`@google/generative-ai`), OpenRouter (`openai` SDK) |
| Tìm kiếm web | Tavily (tùy chọn) |
| Email | Nodemailer |
| Kiểm thử | `node --test` (backend), Playwright (frontend) |

## Kiến trúc

```
┌──────────────────┐   REST/JSON + Bearer JWT   ┌─────────────────────┐   T-SQL   ┌────────────┐
│ React + Vite     │ ─────────────────────────► │ Express API         │ ────────► │ SQL Server │
│ (port 5173)      │ ◄───────────────────────── │ (port 5000)         │ ◄──────── │            │
└──────────────────┘     streaming response     └─────────────────────┘           └────────────┘
                                                     │        │
                                                     │        └─► SMTP (OTP 2FA, đặt lại mật khẩu)
                                                     └─► Provider Router ─► Groq / Gemini / OpenRouter
                                                                            (fallback khi lỗi)
```

Backend theo mô hình `routes → middleware (auth, admin, rate limit, quota) → providers / models → database`, lỗi được xử lý tập trung bằng error handler. Khi chạy dev, Vite proxy `/api` tới `http://localhost:5000`; khi chạy Docker, Nginx proxy `/api/` tới backend.

## Cấu trúc thư mục

```
chat-ai/
├── .github/workflows/ci.yml   # GitHub Actions
├── backend/
│   ├── config/                # Kết nối database (Sequelize, pool khóa chat)
│   ├── database/
│   │   ├── schema.sql         # Cấu trúc 12 bảng, nâng cấp DB cũ, hạn mức token
│   │   └── seed.sql           # SystemSettings và AI Models mặc định
│   ├── middleware/            # auth, admin, checkQuota, rateLimit, validate, errorHandler
│   ├── models/                # User, Conversation, Message, AIModel, Session, ...
│   ├── providers/             # aiRouter + Groq / Gemini / OpenRouter + webSearch
│   ├── routes/                # auth, chat, conversations, folders, personas, share, usage, admin, ...
│   ├── scripts/quota-e2e.js   # E2E hạn mức (cần server thật và API key)
│   ├── test/                  # Kiểm thử bằng node --test
│   ├── utils/                 # quota, chatLock, secretBox, mailer, contextTrimmer, ...
│   ├── validators/            # Schema Zod
│   ├── vendor/sprintf-js/     # Bản vá cục bộ cho phụ thuộc của driver SQL Server
│   ├── app.js                 # Khởi tạo Express (middleware, route)
│   ├── server.js              # Entry point
│   ├── seed.js                # Tạo tài khoản admin và model mặc định
│   ├── Dockerfile
│   └── .env.example
├── docs/DATABASE.md           # Cấu trúc bảng và sơ đồ ERD
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios, quản lý phiên
│   │   ├── components/        # Thành phần giao diện (+ admin/)
│   │   ├── context/           # Auth, theme, toast, confirm
│   │   ├── hooks/             # useChatStream, ...
│   │   ├── i18n/              # Từ điển: en, es, ja, vi, zh-CN
│   │   ├── pages/             # Chat, Login, Pricing, SharedChat, admin/
│   │   └── utils/
│   ├── public/                # manifest.json, service worker, biểu tượng
│   ├── scripts/               # check-locales, kiểm tra trùng khóa i18n
│   ├── test/                  # Kiểm thử Playwright
│   ├── Dockerfile, nginx.conf
│   └── .env.example
├── scripts/
│   └── start-project.mjs      # Chạy và dừng backend + frontend trong một terminal
├── docker-compose.yml
├── .env.docker.example
├── start-project.bat          # Launcher Windows
└── README.md
```

## Yêu cầu hệ thống

- Node.js 22.12 trở lên trong nhánh 22, hoặc Node.js >= 24, và npm
- Microsoft SQL Server và SSMS, đã bật **SQL Server Authentication (Mixed Mode)** nếu dùng tài khoản SQL
- API key của **ít nhất một** nhà cung cấp AI (Groq, Gemini hoặc OpenRouter)
- Tài khoản SMTP: tùy chọn khi phát triển, nhưng **cần khi triển khai production** vì admin đăng nhập bằng mã OTP qua email (xem [Tài khoản quản trị và 2FA](#tài-khoản-quản-trị-và-2fa))
- Git và trình duyệt hiện đại

## Cài đặt và chạy dự án

### Chạy nhanh trên Windows bằng file BAT

Sau khi cài Node.js, tạo database và cấu hình `backend/.env`, nhấp đúp **`start-project.bat`** ở thư mục gốc. Không cần mở VS Code.

- Launcher kiểm tra Node.js, tự cài dependency bằng `npm ci` nếu chưa có, rồi chạy backend và frontend chung **một cửa sổ terminal**. Hai server được khởi động trực tiếp bằng Node (không mở thêm cửa sổ npm), đợi tối đa 90 giây cho đến khi cả hai sẵn sàng rồi mở `http://localhost:5173`.
- Giữ cửa sổ này mở khi sử dụng. Nhấn **Ctrl+C** để dừng cả hai; nếu một server lỗi và thoát, launcher cũng dừng server còn lại.
- Lần đầu vẫn cần tạo database và chạy seed theo hướng dẫn bên dưới; launcher không tự seed hoặc đổi mật khẩu.
- Nếu thiếu `backend/.env`, launcher tạo bản mẫu rồi dừng để bạn điền cấu hình. Nếu thiếu `frontend/.env`, launcher tạo từ file mẫu.
- Nếu chạy launcher lần nữa khi server đang chạy, nó báo cổng đang được sử dụng.
- `start-project.bat --check` kiểm tra Node.js, dependency và các biến bắt buộc của backend (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`) mà không mở server hay cài dependency. Lệnh này không kiểm tra kết nối SQL Server hay API key.
- Backend mặc định chỉ hiện trạng thái sẵn sàng và lỗi. Cần xem chi tiết thì đặt `DB_LOG_SQL=true` hoặc `HTTP_LOG_REQUESTS=true` trong `backend/.env` rồi khởi động lại.
- Khi đổi `PORT` của backend, cập nhật `VITE_API_URL` trong `frontend/.env` cho khớp; `CLIENT_URL` của backend cần cho phép `http://localhost:5173`.

### Chạy thủ công

#### 1. Clone

```bash
git clone https://github.com/KaoXangg/chat-ai.git
cd chat-ai
```

#### 2. Tạo database

Mở SSMS, kết nối SQL Server và chạy:

```sql
CREATE DATABASE chat_ai;
```

Sau đó khởi tạo bảng và dữ liệu ban đầu theo mục [Cơ sở dữ liệu](#cơ-sở-dữ-liệu).

#### 3. Chạy Backend

```bash
cd backend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Sửa giá trị trong `backend/.env` (xem [Biến môi trường](#biến-môi-trường)), rồi:

```bash
npm run seed              # Tạo tài khoản admin và danh sách model (chạy lần đầu)
npm run dev               # node --watch server.js
```

API chạy tại `http://localhost:5000`, kiểm tra tại `http://localhost:5000/api/health`.

#### 4. Chạy Frontend

Mở terminal thứ hai:

```bash
cd frontend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
npm run dev
```

Ứng dụng chạy tại `http://localhost:5173`.

### Scripts

| Thư mục | Lệnh | Mô tả |
|---|---|---|
| `backend` | `npm run dev` | Chạy backend ở chế độ phát triển (tự khởi động lại khi sửa file) |
| `backend` | `npm start` | Chạy backend (production) |
| `backend` | `npm run seed` | Tạo tài khoản admin và danh sách model mặc định |
| `backend` | `npm test` | Kiểm thử bằng `node --test`, dùng dữ liệu giả |
| `backend` | `npm run test:e2e` | E2E hạn mức, cần server thật và API key |
| `frontend` | `npm run dev` | Chạy Vite dev server |
| `frontend` | `npm run build` | Build frontend ra thư mục `dist/` |
| `frontend` | `npm test` | Build production và kiểm thử Playwright |
| `frontend` | `npm run check:locales` | Kiểm tra tính toàn vẹn và nhất quán của bản dịch |

## Biến môi trường

### Backend (`backend/.env`)

Sao chép từ `backend/.env.example`. Các biến chính:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUST_PROXY=0

# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=chat_ai
DB_USER=your_sql_user
DB_PASSWORD=your_sql_password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

# Authentication
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# Mã hóa API key lưu trong database (64 ký tự hex)
API_KEY_ENCRYPTION_KEY=

# Tài khoản admin (dùng khi chạy npm run seed)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password

# AI providers (cần ít nhất một key)
GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
TAVILY_API_KEY=

# Email (OTP 2FA cho admin, quên mật khẩu)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `PORT` | | Cổng backend (mặc định 5000) |
| `CLIENT_URL` | ✅ | Origin của frontend, dùng cho CORS |
| `CORS_ORIGINS` | | Danh sách origin được phép, phân cách bằng dấu phẩy. Ở production chỉ các origin này (và `CLIENT_URL`) được chấp nhận |
| `TRUST_PROXY` | | Số hop reverse proxy đáng tin, `true` hoặc `0` (mặc định, tắt). Bật khi backend đứng sau proxy để rate limit dùng IP thật |
| `JSON_BODY_LIMIT`, `JSON_BODY_LIMIT_CHAT` | | Giới hạn body JSON: mặc định `1mb`, riêng chat `40mb` (cho ảnh) |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_FORGOT_PASSWORD_MAX`, `RATE_LIMIT_API_MAX` | | Giới hạn tần suất (bộ nhớ trong tiến trình); giá trị mẫu 5 / 5 / 3 / 600 |
| `DB_LOG_SQL`, `HTTP_LOG_REQUESTS` | | Đặt `true` để bật log SQL hoặc HTTP; mặc định tắt |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | ✅ | Thông tin kết nối SQL Server |
| `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT` | | Tùy chọn mã hóa kết nối; local thường `false` / `true`, Azure SQL dùng `true` / `false` |
| `JWT_SECRET` | ✅ | Khóa ký token, dùng chuỗi dài và ngẫu nhiên |
| `JWT_EXPIRES_IN` | | Thời hạn access token (ví dụ `7d`) |
| `API_KEY_ENCRYPTION_KEY` | ⚠️ | 64 ký tự hex (AES-256-GCM). **Cần nếu muốn lưu API key qua trang quản trị**; thiếu thì không lưu được. Tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Không có trong `.env.example`, hãy tự thêm |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | ✅ | Tài khoản admin được tạo khi chạy `npm run seed` |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | ✅ | Cần ít nhất một key (hoặc cấu hình qua trang quản trị khi đã có `API_KEY_ENCRYPTION_KEY`) |
| `TAVILY_API_KEY` | | Bật tìm kiếm web (tùy chọn) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | ⚠️ | Gửi OTP 2FA và email đặt lại mật khẩu. Bỏ trống thì `/forgot-password` trả 503 và admin chỉ đăng nhập được ở chế độ dev (xem mục 2FA). Gmail dùng "Mật khẩu ứng dụng" |
| `CHAT_RATE_LIMIT_PER_MINUTE` | | Số yêu cầu chat tối đa mỗi người dùng mỗi phút |
| `CHAT_LOCK_POOL_MAX`, `CHAT_LOCK_ACQUIRE_MS` | | Pool và thời gian chờ khóa chat (mặc định 20 và 5000 ms); xem [Cơ sở dữ liệu](#cơ-sở-dữ-liệu) |
| `MAX_CONTEXT_TOKENS` | | Trần token ngữ cảnh gửi cho AI (mặc định 12000). Giảm nếu gặp lỗi 413/429 trên gói free của provider |
| `QUOTA_TZ_OFFSET_HOURS` | | Múi giờ tính mốc làm mới hạn mức hằng ngày (mặc định `7`) |

> Đối chiếu với `backend/.env.example` của phiên bản bạn đang dùng.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

Chỉ đặt **API base URL** của backend. **Không** đặt API key hay thông tin bí mật vào biến có tiền tố `VITE_`, vì các giá trị này bị đưa vào mã chạy trên trình duyệt.

## Cấu hình AI provider

Chỉ cần cấu hình **ít nhất một** provider, bằng biến môi trường hoặc trong trang quản trị (yêu cầu `API_KEY_ENCRYPTION_KEY`). Khởi động lại backend sau khi thay đổi `.env`.

| Provider | Nơi lấy API key |
|---|---|
| Groq | https://console.groq.com/keys |
| Google Gemini | https://aistudio.google.com/app/apikey |
| OpenRouter | https://openrouter.ai/keys |
| Tavily (tùy chọn) | https://app.tavily.com |

Khi một provider gặp lỗi hoặc hết hạn mức, bộ định tuyến sẽ **fallback** sang model đang bật của provider khác đã được cấu hình và đáp ứng loại nội dung trong lịch sử hội thoại. Khi tắt toàn bộ model, chat sẽ báo không có model khả dụng. API key chỉ nằm ở backend, không đưa xuống trình duyệt.

Danh sách model mặc định do `npm run seed` (và `seed.sql`) tạo, quản lý lại trong trang Admin: OpenRouter Free (mặc định), Gemini 2.5 Flash, GPT OSS 120B và GPT OSS 20B (Groq).

## Cơ sở dữ liệu

Hệ thống sử dụng Microsoft SQL Server (2019/2022/Azure SQL) với **12 bảng**: `Users`, `AIModels`, `SystemSettings`, `Announcements`, `Folders`, `Personas`, `Conversations`, `Messages`, `PasswordResets`, `TokenUsages`, `Sessions`, `AuditLogs`. Cấu trúc chi tiết và sơ đồ ERD nằm tại [docs/DATABASE.md](docs/DATABASE.md).

### Khởi tạo trên máy mới

1. **Cấu hình kết nối** trong `backend/.env` (các biến `DB_*`) và tạo database `chat_ai`.

   > `schema.sql` và `seed.sql` đều có dòng `USE [chat_ai];`. Nếu dùng tên database khác, sửa dòng này trước khi chạy.

2. **Tạo bảng và chỉ mục** bằng [`backend/database/schema.sql`](backend/database/schema.sql):
   - Dùng **sqlcmd**:
     ```bash
     sqlcmd -S localhost -U your_sql_user -P your_sql_password -C -i backend/database/schema.sql
     ```
   - Hoặc mở file trong **SSMS** / **Azure Data Studio** rồi nhấn **Execute (F5)**.
   - File mang tính lũy đẳng (idempotent): chạy lại nhiều lần an toàn và không làm mất dữ liệu cũ.

3. **Khởi tạo dữ liệu mẫu** (SystemSettings và AI Models mặc định, cũng idempotent):
   ```bash
   sqlcmd -S localhost -U your_sql_user -P your_sql_password -C -i backend/database/seed.sql
   ```

4. **Tạo tài khoản admin** theo thông tin trong `backend/.env`:
   ```bash
   cd backend
   npm run seed
   ```

5. Sau lần seed đầu tiên, **chạy lại `backend/database/schema.sql`** để áp dụng hạn mức token cho danh sách model vừa tạo.

Khi khởi động, backend tự tạo các bảng còn thiếu (`sequelize.sync()`) và bổ sung các cột, chỉ mục tương thích (như `PasswordResets.attempts`, `Users.tokenVersion`, `Messages.requestId`). Tài khoản database cần quyền thay đổi schema cho bước này; hoặc chạy `schema.sql` trước bằng tài khoản quản trị database. Backend cũng tự mã hóa các API key đang lưu dạng thô trong database khi đã có `API_KEY_ENCRYPTION_KEY`.

### Chống gửi trùng và xử lý đồng thời

- Gửi lại cùng `requestId` không tạo thêm câu hỏi và không tính lại token cho câu trả lời đã hoàn tất.
- Khóa ứng dụng SQL Server (`sp_getapplock`) tuần tự hóa chat theo người dùng và hội thoại, kể cả khi chạy nhiều backend. Yêu cầu trùng nhận lỗi `409 CHAT_BUSY`.
- Pool giữ khóa được tách khỏi pool truy vấn để các luồng streaming không chặn việc lưu dữ liệu. Mỗi lượt chat đang stream giữ một kết nối khóa, nên số luồng song song tối đa xấp xỉ `CHAT_LOCK_POOL_MAX`.

## Tài khoản quản trị và 2FA

Tài khoản admin được tạo bởi `backend/seed.js` theo cấu hình trong `backend/.env`:

1. Đặt `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Mật khẩu phải có ít nhất 12 ký tự và khác các giá trị mẫu; seed không có mật khẩu mặc định.
2. Chạy `npm run seed` trong thư mục `backend`. Nếu admin đã tồn tại, seed bỏ qua và không đổi mật khẩu.
3. Đăng nhập bằng thông tin vừa cấu hình, **nhập mã OTP 2FA** rồi mở khu vực quản trị tại `/admin`.

Mọi lần đăng nhập của admin đều yêu cầu mã OTP:

- **Đã cấu hình SMTP**: mã được gửi tới email của admin.
- **Chưa cấu hình SMTP, `NODE_ENV` khác `production`** (chế độ dev): mã được in trong terminal của backend, đồng thời trả về trong phản hồi đăng nhập (`devOtp`) để dễ phát triển.
- **Chưa cấu hình SMTP, `NODE_ENV=production`**: không có cách nào nhận mã. **Hãy cấu hình SMTP trước khi triển khai production** (bao gồm cả Docker, vì `.env.docker` đặt `NODE_ENV=production`).

> ⚠️ Không dùng mật khẩu mẫu ở môi trường công khai. Nếu đã seed trước khi sửa biến môi trường, hãy kiểm tra `backend/seed.js` và dữ liệu hiện có để cập nhật tài khoản admin.

## Xác thực và bảo mật

**Xác thực và phiên đăng nhập**
- **Access token (JWT)** gửi qua header `Authorization: Bearer <token>`; **refresh token** lưu trong cookie `HttpOnly`, `SameSite=Lax`, dùng để cấp lại access token. Mỗi lần đăng nhập tạo một phiên (session) mà người dùng có thể xem và thu hồi; admin cũng thu hồi được phiên của người dùng.
- Mật khẩu được băm bằng `bcryptjs`; không lưu mật khẩu dạng thô.
- Đổi hoặc đặt lại mật khẩu thu hồi toàn bộ JWT cũ qua `tokenVersion`; người dùng cần đăng nhập lại. Khóa tài khoản cũng thu hồi JWT cũ; mở khóa không khôi phục những JWT đã bị thu hồi.
- Lỗi database tạm thời không xóa phiên đăng nhập đã lưu trên trình duyệt.
- Admin đăng nhập bằng 2FA qua email (xem mục trên).

**API và dữ liệu**
- Middleware tách riêng cho **xác thực**, **phân quyền admin** và **hạn mức**; lỗi được xử lý tập trung.
- API kiểm tra dữ liệu bằng **Zod**, kiểm tra kiểu, ID và giới hạn số trước khi cập nhật.
- **Helmet** (header bảo mật, CSP), **CORS** theo danh sách cho phép (ở chế độ dev tự cho phép localhost, mạng LAN và một số tunnel), **rate limit** cho đăng nhập, đăng ký, quên mật khẩu, chat và toàn bộ API.
- API key của provider lưu trong database được **mã hóa AES-256-GCM** (`API_KEY_ENCRYPTION_KEY`) và chỉ nằm ở backend.
- Thao tác đổi model mặc định, sửa người dùng và hội thoại được tuần tự hóa để tránh xung đột khi quản trị đồng thời.
- Xóa hội thoại hoặc tài khoản dùng transaction; câu trả lời thành công và bản ghi token được lưu trong cùng transaction.
- Hành động của quản trị viên được ghi vào **audit log**.
- Chạy lại seed giữ nguyên lựa chọn tắt model của quản trị viên.

### Bảo mật khi triển khai

Access token hiện được lưu trong `localStorage` của trình duyệt. Cách này được chấp nhận trong dự án nhưng mã JavaScript chạy trên trang có thể đọc token nếu xảy ra XSS. Hãy cấu hình Content-Security-Policy (CSP) tại nơi host frontend để giảm bề mặt tấn công.

Điểm khởi đầu cho CSP; `connect-src` cần trỏ tới origin API khi frontend và backend khác origin. Frontend hiện tải avatar ngoài từ `https://api.dicebear.com`:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.dicebear.com; connect-src 'self' <origin API>; frame-ancestors 'none'
```

Khi triển khai: đặt `NODE_ENV=production`, dùng mật khẩu quản trị mạnh, cấu hình SMTP và `API_KEY_ENCRYPTION_KEY`, giới hạn quyền tài khoản database, bật HTTPS. Không đóng gói `backend/.env`, `frontend/.env` hoặc `node_modules` khi gửi hay nén dự án.

`sprintf-js`, phụ thuộc gián tiếp của driver SQL Server, dùng bản vá cục bộ giới hạn tài nguyên (chiều dài định dạng, độ rộng, độ chính xác, kích thước đầu ra) để giảm thiểu lỗ hổng `GHSA-hp3w-g68c-fv3c`. Nguồn, giấy phép và hướng dẫn thay thế khi upstream phát hành bản vá nằm tại [backend/vendor/README.md](backend/vendor/README.md).

### Lưu ý khi đưa lên GitHub

- **Không commit** `backend/.env`, `frontend/.env`, `.env.docker` hoặc file chứa API key, mật khẩu. `.env.example` và `.env.docker.example` chỉ chứa giá trị mẫu.
- `.gitignore` loại trừ `.env*`, `node_modules/`, `dist/`, cấu hình IDE (`.vscode/`, `.idea/`), file `.seeded`, báo cáo Playwright, coverage, cache, log và file backup database. File riêng khác có thể đặt vào `local-only/` ở thư mục gốc, thư mục này cũng được Git bỏ qua.
- **Cần commit** để project cài và chạy được ở máy khác: `start-project.bat`, thư mục `scripts/` (gồm `start-project.mjs`), mã nguồn, test, `package-lock.json`, `.env.example` và `backend/vendor/sprintf-js/`.
- Nếu secret lỡ bị push, hãy **thu hồi / đổi secret ngay** và xử lý lịch sử Git; xóa khỏi mã nguồn là chưa đủ.

## API

Base URL: `http://localhost:5000/api`. Các route nằm trong `backend/routes/`; hầu hết yêu cầu đăng nhập. Phản hồi thành công có dạng `{ "success": true, "data": ... }`, lỗi có dạng `{ "success": false, "error": { "code", "message" } }`.

| Nhóm (`/api/...`) | Mô tả | Quyền |
|---|---|---|
| `/auth` | Đăng ký, đăng nhập, `verify-2fa`, `resend-2fa`, `refresh`, `logout`, quên/đặt lại mật khẩu, `me`, đổi mật khẩu, quản lý phiên | Public / đã đăng nhập |
| `/chat` | `POST /:conversationId/stream`, `regenerate`, sửa tin nhắn, đánh giá phản hồi (có rate limit và hạn mức) | Đã đăng nhập |
| `/conversations` | Danh sách, tìm kiếm tin nhắn, tạo, xem tin nhắn, đổi tên/ghim, nhân bản (`fork`), xóa, bật/tắt chia sẻ | Đã đăng nhập |
| `/folders`, `/personas`, `/preferences` | Thư mục, persona và tùy chọn cá nhân | Đã đăng nhập |
| `/models` | Danh sách model khả dụng để chọn trong giao diện chat | Đã đăng nhập |
| `/usage` | Mức sử dụng và hạn mức hôm nay, nâng cấp gói | Đã đăng nhập |
| `/share/:shareId` | Xem hội thoại được chia sẻ | Public (có rate limit) |
| `/announcements/active` | Thông báo đang hiển thị | Public |
| `/admin` | Thống kê, người dùng, phiên, hội thoại, model, persona, thông báo, cài đặt, audit log, phân tích chi phí/provider, trạng thái hệ thống, xuất/nhập dữ liệu | Admin |
| `GET /health`, `GET /api/health` | Kiểm tra trạng thái API và kết nối database | Public |

`/api/health` trả về `{ "status": "ok", "uptime", "timestamp", "db": "up" }` (HTTP 200), hoặc `status: "degraded"` kèm HTTP 503 khi mất kết nối database.

> Chi tiết từng endpoint (đường dẫn, tham số) xem trong các file tại `backend/routes/`.

## Kiểm thử

```bash
cd backend  && npm test            # API, xác thực, chat, mã hóa secret, tiện ích (dữ liệu giả)
cd frontend && npm test            # Build production + kiểm thử trình duyệt Playwright
cd frontend && npm run check:locales
```

- Kiểm thử backend dùng mock cách ly, không cần kết nối SQL Server.
- Kiểm thử trình duyệt dùng API giả (`**/api/**`), không gọi nhà cung cấp AI hay sửa database thật. Dùng Chrome/Edge đã cài trên Windows, hoặc Chromium của Playwright (`npx playwright install chromium`). Có thể chỉ định trình duyệt qua `PLAYWRIGHT_CHROME_EXECUTABLE`.
- `npm run test:e2e` trong `backend` (`scripts/quota-e2e.js`) kiểm thử hạn mức đầu-cuối nhưng cần máy chủ thật đang chạy và API key AI, nên không nằm trong CI.

## Build production

```bash
cd frontend
npm run build
```

Kết quả nằm trong `frontend/dist/`, thường không cần commit lên Git. Khi triển khai: đặt `NODE_ENV=production`, cập nhật `CLIENT_URL` và `CORS_ORIGINS` đúng domain, dùng HTTPS và sao lưu database định kỳ.

## Chạy bằng Docker

`docker-compose.yml` định nghĩa các dịch vụ cho môi trường dev/local:

- `db`: Microsoft SQL Server 2022 (`mcr.microsoft.com/mssql/server:2022-latest`) kèm healthcheck `sqlcmd`, mở cổng 1433.
- `db-init`: tạo database `chat_ai` nếu chưa có, không làm mất dữ liệu cũ.
- `backend`: Node.js Express API chạy dưới user phi root `node`, có healthcheck `/health`, mở cổng 5000. Bảng được tạo khi backend khởi động.
- `frontend`: giao diện React build bằng Vite, phục vụ qua Nginx ở cổng 80 (`FRONTEND_PORT`), SPA fallback, nén Gzip, cache headers và proxy `/api/` tới backend.

```bash
# 1. Tạo file cấu hình từ mẫu (đổi mật khẩu, JWT_SECRET, API_KEY_ENCRYPTION_KEY, điền API key và SMTP)
cp .env.docker.example .env.docker

# 2. Khởi chạy toàn bộ hệ thống
docker compose --env-file .env.docker up --build -d

# 3. Tạo tài khoản admin và model mặc định (lần đầu)
docker compose --env-file .env.docker exec backend npm run seed
```

Mở `http://localhost` (hoặc cổng `FRONTEND_PORT`). Vì `.env.docker.example` đặt `NODE_ENV=production`, **cần cấu hình SMTP** để admin nhận được mã OTP.

```bash
# Xem log (tất cả, hoặc từng dịch vụ)
docker compose logs -f
docker compose logs -f backend

# Dừng, giữ nguyên dữ liệu
docker compose down

# Dừng và xóa sạch volume database (khởi tạo lại từ đầu ở lần chạy sau)
docker compose down -v
```

## Tích hợp liên tục (CI)

GitHub Actions (`.github/workflows/ci.yml`) chạy khi có `push` hoặc `pull_request` vào nhánh `main`:

1. **`backend`**: Node.js 22 với cache npm, `npm ci` rồi `npm test` với biến môi trường giả cho `NODE_ENV=test`.
2. **`frontend`**: Node.js 22, cài Playwright Chromium kèm phụ thuộc hệ điều hành, chạy `npm test` (build và kiểm thử trình duyệt với API giả). Tải lên artifact `playwright-report` khi có test thất bại.
3. **`docker-build`**: chạy sau khi hai job trên thành công, `docker build` thử `backend/Dockerfile` và `frontend/Dockerfile` (không push lên registry).

## Xử lý sự cố

| Lỗi | Cách xử lý |
|---|---|
| Launcher báo `Keep this launcher in the project root...` | Một trong các file bắt buộc không có trong thư mục dự án: `backend\package-lock.json`, `frontend\package-lock.json`, `backend\vendor\sprintf-js\sprintf.cjs` hoặc `scripts\start-project.mjs`. Kiểm tra bằng `git status`, khôi phục từ Git, và giữ launcher ở thư mục gốc cạnh `backend`, `frontend`, `scripts`. |
| Launcher báo `Startup timed out` dù hai server đã chạy | Kiểm tra `http://localhost:5000/api/health` trả `{"status":"ok",...}`. Nếu trả `degraded` / 503 thì backend không kết nối được database. Nếu `status` là `ok` mà vẫn timeout, kiểm tra điều kiện sẵn sàng trong `scripts/start-project.mjs` có khớp với dạng phản hồi trên không. |
| Launcher báo `Missing backend settings` | Điền các biến còn thiếu trong `backend/.env` (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`). |
| Backend không kết nối được SQL Server | Kiểm tra SQL Server service đã chạy, host/port, tên database, tài khoản, mật khẩu; bật TCP/IP (port 1433) và chế độ xác thực phù hợp. |
| `Login failed for user` | Bật SQL Server Authentication nếu dùng tài khoản SQL; kiểm tra lại `DB_USER`/`DB_PASSWORD` trong `.env`. |
| Chạy `schema.sql` / `seed.sql` báo lỗi database không tồn tại | Hai file có `USE [chat_ai];`. Tạo database `chat_ai` trước hoặc sửa tên trong file. |
| Frontend không gọi được API / `CORS_NOT_ALLOWED` | Kiểm tra backend đang chạy, `VITE_API_URL` ở frontend, và `CLIENT_URL` / `CORS_ORIGINS` ở backend khớp với origin của frontend. |
| Admin không nhận được mã OTP | Cấu hình SMTP. Ở chế độ dev, mã được in trong terminal của backend; ở `production` không có cách lấy mã khác ngoài email. |
| Không lưu được API key trong trang quản trị | Chưa đặt `API_KEY_ENCRYPTION_KEY` (64 ký tự hex) trong `backend/.env`. |
| AI trả lỗi hoặc hết quota | Kiểm tra API key, model đã được bật trong trang quản trị chưa, hạn mức provider và log backend. Lỗi `429 QUOTA_EXCEEDED` nghĩa là người dùng hết hạn mức token trong ngày. |
| Không đăng nhập được admin | Kiểm tra role trong database, cấu hình `ADMIN_*`, logic `seed.js` và mã OTP 2FA. |
| Port đã được sử dụng | Đóng tiến trình đang chiếm port, hoặc đổi `PORT` trong `backend/.env` (và `VITE_API_URL` ở frontend cho khớp). Cổng frontend cố định là 5173. |
| Sửa `.env` nhưng không có tác dụng | Khởi động lại backend sau khi chỉnh biến môi trường. |
| `Cannot find module` | Chạy lại `npm install` (hoặc `npm ci`) trong thư mục tương ứng. |

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