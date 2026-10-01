# ✨ Chat AI

**Ứng dụng web trò chuyện với AI đa mô hình — giao diện hiện đại, phản hồi streaming theo thời gian thực.**

Lấy cảm hứng từ trải nghiệm ChatGPT, xây dựng bằng React, Node.js/Express và Microsoft SQL Server.

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-Database-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)

---

## 📌 Giới thiệu

**Chat AI** là dự án web full-stack cho phép người dùng đăng ký tài khoản, trò chuyện với nhiều mô hình AI, quản lý lịch sử hội thoại và tùy chỉnh trải nghiệm sử dụng. Dự án có trang quản trị riêng để theo dõi hoạt động, quản lý người dùng và cấu hình danh sách mô hình AI.

> [!NOTE]
> Đây là dự án phục vụ học tập và phát triển. Các tính năng khi chạy thực tế phụ thuộc vào cấu hình cơ sở dữ liệu, API key và môi trường triển khai.

## ✨ Tính năng

### 💬 Trò chuyện AI
- Phản hồi dạng **streaming**, hiển thị nội dung theo thời gian thực.
- Quản lý nhiều cuộc hội thoại: tìm kiếm, ghim, đổi tên, xóa.
- Hiển thị **Markdown**, công thức toán (**KaTeX**) và khối mã có tô màu cú pháp.
- Sao chép, tạo lại câu trả lời và đánh giá phản hồi.

### 🧠 Đa nhà cung cấp AI
- Tích hợp **Groq**, **Google Gemini** và **OpenRouter**.
- Bộ định tuyến provider kèm cơ chế **fallback**.
- Chọn model trực tiếp trong giao diện chat.
- API key được cấu hình và bảo vệ hoàn toàn ở phía backend.

### 🔐 Tài khoản và bảo mật
- Đăng ký, đăng nhập, xác thực bằng **JWT**; mật khẩu được băm bằng **bcryptjs**.
- Quên / đặt lại mật khẩu qua email (tùy cấu hình).
- Phân quyền người dùng và quản trị viên.
- Giới hạn tần suất yêu cầu chat (rate limit).
- Middleware xử lý xác thực, phân quyền và lỗi tập trung.

### 🛠️ Admin Dashboard
- Thống kê tổng quan và biểu đồ trực quan.
- Quản lý người dùng: khóa/mở khóa tài khoản, phân quyền.
- Quản lý danh sách AI model: bật/tắt, chọn model mặc định.
- Theo dõi trạng thái cấu hình các provider.

## 🧰 Công nghệ sử dụng

| Khu vực | Công nghệ |
| --- | --- |
| **Frontend** | React 18, Vite 5, React Router |
| **Giao diện** | Tailwind CSS, Framer Motion, Lucide React |
| **Biểu đồ** | Recharts |
| **Nội dung chat** | React Markdown, remark-gfm, remark-math, KaTeX, syntax highlighting |
| **HTTP client** | Axios |
| **Backend** | Node.js, Express |
| **Cơ sở dữ liệu** | Microsoft SQL Server |
| **ORM / Driver** | Sequelize, Tedious |
| **Xác thực** | JSON Web Token (JWT), bcryptjs |
| **AI providers** | Groq, Google Gemini, OpenRouter |
| **Email** | Nodemailer |

## 🗂️ Cấu trúc dự án

```text
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
│   └── server.js
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
└── README.md
```

## ⚙️ Yêu cầu môi trường

- **Node.js** 18 trở lên và **npm**
- **Microsoft SQL Server** (cục bộ hoặc máy chủ tương thích)
- **Git**
- API key của **ít nhất một** nhà cung cấp AI (Groq, Gemini hoặc OpenRouter)
- Trình duyệt hiện đại

## 🚀 Cài đặt và chạy dự án

### 1. Tải mã nguồn

```bash
git clone https://github.com/KaoXangg/chat-ai.git
cd chat-ai
```

### 2. Tạo cơ sở dữ liệu

Mở **SQL Server Management Studio (SSMS)**, kết nối tới SQL Server và chạy:

```sql
CREATE DATABASE chat_ai;
```

Chọn database `chat_ai`, sau đó thực thi file:

```text
backend/sql/schema.sql
```

### 3. Cấu hình và cài đặt backend

```bash
cd backend
npm install
```

Tạo file `.env` từ file mẫu:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Sau đó mở `backend/.env` và điền thông tin phù hợp (xem [Cấu hình biến môi trường](#-cấu-hình-biến-môi-trường)).

### 4. Khởi tạo dữ liệu và chạy backend

```bash
npm run seed   # Chỉ cần chạy khi thiết lập lần đầu
npm run dev
```

Backend mặc định chạy tại `http://localhost:5000`. Có thể kiểm tra nhanh tại:

```text
http://localhost:5000/api/health
```

### 5. Cấu hình và chạy frontend

Mở terminal thứ hai:

```bash
cd frontend
npm install
```

Tạo file môi trường và kiểm tra lại giá trị API base URL theo `frontend/.env.example`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Khởi động frontend:

```bash
npm run dev
```

Truy cập địa chỉ Vite hiển thị trong terminal — mặc định là `http://localhost:5173`.

## 🔧 Cấu hình biến môi trường

Ví dụ `backend/.env` (đối chiếu với `backend/.env.example` của phiên bản bạn đang dùng):

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

| Nhóm | Biến | Mô tả |
| --- | --- | --- |
| Server | `PORT`, `CLIENT_URL` | Cổng backend và địa chỉ frontend (dùng cho CORS) |
| Database | `DB_*` | Thông tin kết nối SQL Server |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN` | Khóa ký và thời hạn token |
| Admin | `ADMIN_*` | Tài khoản quản trị được tạo khi chạy `npm run seed` |
| AI | `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | API key của từng provider |
| Khác | `TAVILY_API_KEY`, `CHAT_RATE_LIMIT_PER_MINUTE` | Key dịch vụ bổ sung và giới hạn số yêu cầu chat mỗi phút |

> [!WARNING]
> Không đặt API key hay thông tin bí mật vào biến môi trường frontend có tiền tố `VITE_`, vì các giá trị này sẽ bị đưa vào mã chạy trên trình duyệt.

## 🔑 Lấy API key cho AI provider

Bạn chỉ cần cấu hình **ít nhất một** provider. Khởi động lại backend sau khi thay đổi `.env`.

| Provider | Nơi lấy API key |
| --- | --- |
| Groq | [console.groq.com](https://console.groq.com) |
| Google Gemini | [Google AI Studio](https://aistudio.google.com) |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |

## 🧑‍💻 Truy cập Admin Dashboard

1. Đặt `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `backend/.env`.
2. Chạy `npm run seed` trong thư mục `backend`.
3. Đăng nhập bằng thông tin vừa cấu hình.
4. Mở khu vực quản trị (tài khoản cần có quyền admin).

> [!IMPORTANT]
> Không dùng mật khẩu mẫu ở môi trường công khai. Nếu đã seed trước khi sửa biến môi trường, hãy kiểm tra logic trong `backend/seed.js` và dữ liệu hiện có để cập nhật tài khoản admin.

## 📦 Build frontend

```bash
cd frontend
npm run build
```

Kết quả được tạo trong `frontend/dist/`. Thư mục này là sản phẩm build và thường không cần commit lên Git.

## 🛡️ Lưu ý bảo mật

- **Không commit** `backend/.env`, `frontend/.env` hoặc bất kỳ file nào chứa API key, mật khẩu.
- Chỉ để giá trị mẫu trong `.env.example`.
- Đảm bảo `.gitignore` loại trừ `.env`, `.env.*` (trừ `.env.example`), `node_modules/` và `dist/`.
- Nếu secret lỡ bị push lên repository, hãy **thu hồi / đổi secret ngay** và xử lý lịch sử Git nếu cần — xóa khỏi mã nguồn là chưa đủ.
- Dùng mật khẩu quản trị mạnh, giới hạn quyền tài khoản database và bật HTTPS khi triển khai.

## 🧯 Xử lý lỗi thường gặp

| Lỗi | Hướng kiểm tra |
| --- | --- |
| Backend không kết nối được SQL Server | Kiểm tra SQL Server service, host/port, tên database, tài khoản, mật khẩu và chế độ xác thực |
| `Login failed for user` | Bật SQL Server Authentication nếu dùng tài khoản SQL; kiểm tra lại thông tin trong `.env` |
| Frontend không gọi được API | Kiểm tra backend đang chạy, API base URL, `CLIENT_URL` và cấu hình CORS |
| AI trả lỗi hoặc hết quota | Kiểm tra API key, model đã được bật chưa, hạn mức của provider và log backend |
| Không đăng nhập được admin | Kiểm tra role trong database, cấu hình `ADMIN_*` và logic `seed.js` |
| Port đã được sử dụng | Đóng tiến trình đang chiếm port hoặc đổi port trong cấu hình |
| Sửa `.env` nhưng không có tác dụng | Khởi động lại backend sau khi chỉnh biến môi trường |

## 🛣️ Hướng phát triển

- [ ] Bổ sung kiểm thử tự động cho API và giao diện.
- [ ] Hoàn thiện phân trang và bộ lọc nâng cao cho trang quản trị.
- [ ] Bổ sung logging, giám sát lỗi và thống kê mức sử dụng.
- [ ] Cải thiện quản lý quota, timeout và retry cho từng AI provider.
- [ ] Chuẩn hóa quy trình triển khai production và sao lưu database.

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh!

1. Fork repository.
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m "feat: mô tả ngắn gọn"`
4. Push branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request.

## 📄 Giấy phép

Repository hiện chưa xác định giấy phép phân phối. Hãy bổ sung file `LICENSE` (ví dụ MIT) nếu bạn muốn công bố điều khoản sử dụng và tái phân phối.

---

**Chat AI** · Built with React, Node.js and SQL Server
Nếu dự án hữu ích, hãy cho repository một ⭐ trên GitHub nhé!