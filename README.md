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
| Frontend | React 18, Vite 5, React Router, Axios |
| Giao diện | Tailwind CSS, Framer Motion, Lucide React |
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
│   │   └── schema.sql      # Cấu trúc database
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
├── .editorconfig
├── .gitignore
└── README.md
```

## Yêu cầu hệ thống

- Node.js >= 18 và npm
- Microsoft SQL Server và SSMS, đã bật **SQL Server Authentication (Mixed Mode)** nếu dùng tài khoản SQL
- API key của **ít nhất một** nhà cung cấp AI (Groq, Gemini hoặc OpenRouter)
- Tài khoản SMTP (tùy chọn, chỉ cần khi dùng chức năng quên/đặt lại mật khẩu qua email)
- Git và trình duyệt hiện đại

## Cài đặt và chạy dự án

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

> Nếu dự án có migration bổ sung, hãy chạy theo hướng dẫn tương ứng trước khi khởi động backend.

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

Khi một provider gặp lỗi hoặc hết hạn mức, bộ định tuyến sẽ **fallback** sang provider khác đã được cấu hình. API key chỉ nằm ở backend, không đưa xuống trình duyệt.

## Cơ sở dữ liệu

Schema nằm tại `backend/sql/schema.sql`. Các model chính (thư mục `backend/models/`):

| Model | Mô tả |
|---|---|
| `User` | Người dùng: mật khẩu băm bcrypt, vai trò, trạng thái khóa |
| `Conversation` | Cuộc hội thoại: tiêu đề, trạng thái ghim, chủ sở hữu |
| `Message` | Tin nhắn trong hội thoại: nội dung, vai trò (người dùng / AI), model sử dụng |
| `AIModel` | Danh sách mô hình AI: provider, trạng thái bật/tắt, model mặc định |

Quan hệ chính: `User` 1–N `Conversation`; `Conversation` 1–N `Message`.

## Tài khoản quản trị

Tài khoản admin được tạo theo cấu hình trong `backend/.env` và logic của `backend/seed.js`:

1. Đặt `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `backend/.env`.
2. Chạy `npm run seed` trong thư mục `backend`.
3. Đăng nhập bằng thông tin vừa cấu hình và mở khu vực quản trị.

> ⚠️ Không dùng mật khẩu mẫu ở môi trường công khai. Nếu đã seed trước khi sửa biến môi trường, hãy kiểm tra `backend/seed.js` và dữ liệu hiện có để cập nhật tài khoản admin.

## Xác thực và bảo mật

- Xác thực bằng **JWT**, gửi qua header `Authorization: Bearer <token>`.
- Mật khẩu được băm bằng `bcryptjs`; không lưu mật khẩu dạng thô.
- Middleware tách riêng cho **xác thực** và **phân quyền admin**; lỗi được xử lý tập trung.
- **Rate limit** cho yêu cầu chat, cấu hình qua `CHAT_RATE_LIMIT_PER_MINUTE`.
- CORS giới hạn theo `CLIENT_URL`.
- API key của AI provider chỉ nằm ở backend.

Lưu ý khi đưa lên GitHub:

- **Không commit** `backend/.env`, `frontend/.env` hoặc file chứa API key, mật khẩu.
- `.env.example` chỉ chứa giá trị mẫu.
- `.gitignore` cần loại trừ `.env`, `.env.*` (trừ `.env.example`), `node_modules/`, `dist/`.
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

- [ ] Bổ sung kiểm thử tự động cho API và giao diện.
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