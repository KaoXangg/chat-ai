# Chat AI — Website Chat AI (Đồ án tốt nghiệp)

Web chat AI hoàn chỉnh, kiến trúc giống ChatGPT: đăng ký/đăng nhập, nhiều
cuộc trò chuyện, streaming trả lời real-time, chọn giữa nhiều AI model
**miễn phí**, Admin Dashboard quản lý user + model. Toàn bộ code đã được
build-test thành công (backend chạy được, frontend build không lỗi).

## Mục lục

1. [Kiến trúc & tính năng](#1-kiến-trúc--tính-năng)
2. [Yêu cầu môi trường](#2-yêu-cầu-môi-trường)
3. [Bước 1 — Tạo Database SQL Server](#bước-1--tạo-database-sql-server)
4. [Bước 2 — Lấy API key AI free](#bước-2--lấy-api-key-ai-free)
5. [Bước 3 — Cài & chạy Backend](#bước-3--cài--chạy-backend)
6. [Bước 4 — Cài & chạy Frontend](#bước-4--cài--chạy-frontend)
7. [Bước 5 — Đăng nhập Admin & quản trị](#bước-5--đăng-nhập-admin--quản-trị)
8. [Deploy free (đưa web lên internet)](#6-deploy-free-đưa-web-lên-internet)
9. [Cấu trúc project](#7-cấu-trúc-project)
10. [Xử lý lỗi thường gặp](#8-xử-lý-lỗi-thường-gặp)
11. [Hướng phát triển thêm](#9-hướng-phát-triển-thêm-cho-báo-cáo)

---

## 1. Kiến trúc & tính năng

**Stack:** React (Vite) + TailwindCSS · Node.js/Express · SQL Server (Sequelize) · JWT

**Đã cài đặt đầy đủ (chạy được ngay):**
- Đăng ký / đăng nhập (JWT), đổi mật khẩu
- Nhiều cuộc trò chuyện / user, sidebar lịch sử, tìm kiếm, ghim, đổi tên, xoá
- Chat streaming (SSE) — chữ hiện dần như ChatGPT
- **Multi-AI provider**: Groq, Google Gemini, OpenRouter — tự động fallback nếu 1 con bị lỗi/hết quota
- Dropdown chọn model ngay trong khung chat
- Markdown + code block có syntax highlighting
- Copy / Regenerate / Like–Dislike câu trả lời
- Dark/Light mode
- Rate-limit chống spam (bảo vệ quota AI free)
- **Admin Dashboard**: thống kê tổng quan (biểu đồ), quản lý user (ban/unban/đổi quyền/xoá), quản lý AI model (bật/tắt, đặt mặc định)

**Kiến trúc AI provider (adapter pattern):**

```
backend/providers/
  base.js              <- interface chung
  groqProvider.js
  geminiProvider.js
  openrouterProvider.js
  aiRouter.js          <- fallback chain: Groq lỗi → thử Gemini → thử OpenRouter
```

Muốn thêm provider mới (ví dụ Mistral, Cerebras): tạo file
`mistralProvider.js` theo đúng interface của `base.js`, đăng ký vào
`aiRouter.js`. Không cần sửa gì ở route hay frontend.

---

## 2. Yêu cầu môi trường

Cài trước trên máy:

| Phần mềm | Phiên bản | Kiểm tra bằng |
|---|---|---|
| Node.js | ≥ 18 | `node -v` |
| npm | đi kèm Node | `npm -v` |
| SQL Server | 2019+ (hoặc Azure SQL) | `sqlcmd -?` hoặc mở bằng SSMS |
| Git (tuỳ chọn) | bất kỳ | `git --version` |

Tải Node.js tại: https://nodejs.org (chọn bản LTS)
Tải SQL Server Developer (free) tại: https://www.microsoft.com/sql-server/sql-server-downloads
Công cụ quản trị đề xuất: **SSMS** (Windows) hoặc **Azure Data Studio** (đa nền tảng).

---

## Bước 1 — Tạo Database SQL Server

1. Cài SQL Server (local) hoặc tạo **Azure SQL Database** free tier.
2. Mở SSMS/Azure Data Studio, kết nối tới server, tạo database rỗng tên `chat_ai`:
   ```sql
   CREATE DATABASE chat_ai;
   ```
3. Chạy file **`backend/sql/schema.sql`** trên database `chat_ai` vừa tạo —
   file này tạo sẵn đầy đủ 4 bảng `Users, Conversations, Messages, AIModels`
   kèm khoá ngoại, index, default value khớp với code backend.
4. Ghi lại thông tin kết nối (host, port, username, password) — sẽ dán vào
   `backend/.env` ở Bước 3.

> Không có SQL Server cài sẵn? Cách nhanh nhất là chạy bằng Docker:
> ```bash
> docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
>   -p 1433:1433 --name sqlserver -d mcr.microsoft.com/mssql/server:2022-latest
> ```
> Sau đó dùng `DB_HOST=localhost`, `DB_USER=sa`, `DB_PASSWORD=YourStrong@Passw0rd`.

---

## Bước 2 — Lấy API key AI (free)

Chỉ cần **1 con là chạy được**, nhưng nên lấy đủ 3 con để có fallback khi demo (nếu 1 con bị rate-limit giữa lúc bảo vệ đồ án, hệ thống tự chuyển sang con khác).

### 🟢 Groq (khuyến nghị làm chính — free, tốc độ nhanh nhất)
1. Vào https://console.groq.com → đăng nhập bằng Google/GitHub
2. Vào **API Keys** (menu trái) → **Create API Key**
3. Copy key (dạng `gsk_...`) → dán vào `GROQ_API_KEY`

### 🔵 Google Gemini (free tier ổn định)
1. Vào https://aistudio.google.com/app/apikey
2. Đăng nhập Google → **Create API Key**
3. Copy key → dán vào `GEMINI_API_KEY`

### 🟣 OpenRouter (nhiều model `:free`, dùng làm backup)
1. Vào https://openrouter.ai/keys → đăng nhập
2. **Create Key** → copy key (dạng `sk-or-...`)
3. Dán vào `OPENROUTER_API_KEY`

> **Không cần** OpenAI/Anthropic/xAI — các provider này không có free tier
> thật, đã bỏ ra khỏi hệ thống để đúng yêu cầu "free tất cả key".

---

## Bước 3 — Cài & chạy Backend

```bash
cd backend
npm install
cp .env.example .env
```

Mở file `backend/.env` bằng VS Code, **dán các giá trị vào đúng chỗ**:

```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Thông tin kết nối SQL Server từ Bước 1
DB_HOST=localhost
DB_PORT=1433
DB_NAME=chat_ai
DB_USER=sa
DB_PASSWORD=doi-mat-khau-nay
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

# Đổi thành chuỗi bí mật bất kỳ; chuỗi càng dài càng an toàn.
JWT_SECRET=chat-ai-secret-key-doi-thanh-chuoi-rieng-cua-ban-2026
JWT_EXPIRES_IN=7d

# Tài khoản quản trị mặc định — được tạo khi chạy lệnh seed.
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@chatai.local
ADMIN_PASSWORD=Admin@123456

# ===== DÁN API KEY VÀO ĐÂY =====
GROQ_API_KEY=gsk_dan_key_groq_vao_day
GEMINI_API_KEY=dan_key_gemini_vao_day
OPENROUTER_API_KEY=sk-or-dan_key_openrouter_vao_day

CHAT_RATE_LIMIT_PER_MINUTE=10
```

**Đây chính là nơi duy nhất bạn cần dán API key** — key luôn ở backend
`.env`, không bao giờ lộ ra frontend hay trình duyệt, đúng chuẩn security.

Đảm bảo đã chạy `backend/sql/schema.sql` trên database `chat_ai` (Bước 1)
trước khi tiếp tục. Sau đó chạy 2 lệnh sau (chỉ cần chạy `seed` 1 lần đầu):

```bash
npm run seed   # tạo admin mặc định + seed danh sách AI model vào DB
npm run dev    # khởi động backend tại http://localhost:5000
```

Thấy dòng `[Server] Chat AI backend đang chạy tại http://localhost:5000`
là backend đã chạy thành công. Kiểm tra nhanh bằng cách mở
`http://localhost:5000/api/health` trên trình duyệt → thấy `{"success":true...}`.

---

## Bước 4 — Cài & chạy Frontend

Mở **terminal mới** (giữ terminal backend đang chạy):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Mở trình duyệt tại **http://localhost:5173** → thấy trang đăng nhập Chat AI.

Đăng ký 1 tài khoản user thường để test chat, hoặc đăng nhập thẳng bằng
tài khoản admin ở Bước 5.

---

## Bước 5 — Đăng nhập Admin & quản trị

Đăng nhập bằng thông tin trong `backend/.env`:
- Email: `admin@chatai.local` (hoặc giá trị bạn đặt ở `ADMIN_EMAIL`)
- Mật khẩu: `Admin@123456` (hoặc giá trị ở `ADMIN_PASSWORD`)

Sau khi đăng nhập, ở sidebar trái (góc dưới) sẽ thấy nút **"Admin Dashboard"**
(chỉ hiện với tài khoản có role `admin`). Bấm vào để vào `/admin`.

**Trong Admin Dashboard:**

| Trang | Chức năng |
|---|---|
| **Tổng quan** | Số user, số cuộc trò chuyện, tổng tin nhắn, biểu đồ tin nhắn/ngày, trạng thái từng AI provider (đã cấu hình key hay chưa) |
| **Người dùng** | Tìm kiếm, xem danh sách, **khoá/mở khoá** (ban), **đổi quyền admin**, **xoá tài khoản** |
| **AI Model** | Bật/tắt từng model cho user chọn, đặt model mặc định, xem provider nào đã có API key |

**Muốn thêm model mới** (ví dụ thêm model Groq khác): gọi API
`POST /api/admin/models` (dùng Postman, hoặc thêm form trong Admin UI nếu
bạn phát triển thêm) với body:
```json
{ "provider": "groq", "modelId": "llama3-groq-70b-8192-tool-use-preview", "displayName": "Llama3 Groq Tool Use", "priority": 5 }
```

---

## 6. Deploy free (đưa web lên internet)

Khi đã chạy ổn ở local, deploy để demo online (không cần máy tính lúc bảo vệ):

| Phần | Nền tảng free | Ghi chú |
|---|---|---|
| Database | [Azure SQL Database](https://azure.microsoft.com/free) (free tier) hoặc SQL Server trên VPS | Chạy `backend/sql/schema.sql` trên instance sau khi tạo |
| Backend | [Render](https://render.com) (Web Service, free tier) hoặc [Railway](https://railway.app) | Build command: `npm install`, Start command: `npm start`. Dán toàn bộ biến trong `.env` vào phần **Environment Variables** trên Render/Railway |
| Frontend | [Vercel](https://vercel.com) hoặc [Netlify](https://netlify.com) | Root Directory: `frontend`, Build command: `npm run build`, Output: `dist`. Thêm biến `VITE_API_URL` = URL backend đã deploy (ví dụ `https://chat-ai-backend.onrender.com/api`) |

**Lưu ý khi deploy:**
- Sau khi deploy backend, cập nhật `CLIENT_URL` trong Environment Variables của backend = URL frontend thật (để CORS hoạt động)
- Free tier của Render có "cold start" (ngủ sau 15 phút không dùng, lần gọi đầu chậm ~30s) — hãy "đánh thức" server trước khi demo vài phút
- Đặt `DB_ENCRYPT=true` khi dùng Azure SQL (bắt buộc)
- Chạy `npm run seed` ít nhất 1 lần trên môi trường production (Render có mục **Shell** để chạy lệnh này) để tạo admin + seed model

---

## 7. Cấu trúc project

```
chat-ai/
├── backend/
│   ├── config/db.js              # Ket noi SQL Server (Sequelize)
│   ├── sql/schema.sql             # Script tao schema thu cong (Buoc 1)
│   ├── models/                   # User, Conversation, Message, AIModel (Sequelize)
│   ├── middleware/                # auth (JWT), admin (phân quyền), rateLimit, errorHandler
│   ├── providers/                 # Adapter pattern cho từng AI (Groq/Gemini/OpenRouter) + fallback router
│   ├── routes/                    # auth, conversations, chat (streaming), models, admin
│   ├── seed.js                    # Tạo admin + seed model mặc định
│   ├── server.js                  # Entry point
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/axios.js            # HTTP client, tự gắn JWT token
    │   ├── context/                # AuthContext, ThemeContext
    │   ├── hooks/useChatStream.js  # Xử lý nhận SSE streaming
    │   ├── components/             # Sidebar, ChatInput, MessageBubble, ModelSelector...
    │   └── pages/                  # Login, Register, Chat, admin/*
    └── .env.example
```

---

## 8. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `[DB] Lỗi kết nối SQL Server` | Sai `DB_HOST/DB_USER/DB_PASSWORD`, SQL Server chưa bật TCP/IP, hoặc tường lửa chặn cổng 1433 | Kiểm tra lại `.env`; bật TCP/IP trong SQL Server Configuration Manager; mở cổng 1433 |
| Chat báo tất cả nhà cung cấp AI đều gặp lỗi | Chưa thêm API key, hoặc key sai/hết hạn mức | Kiểm tra lại `.env`, thử tạo key mới, xem log terminal backend để biết nhà cung cấp nào gặp lỗi |
| Frontend gọi API bị lỗi CORS | `CLIENT_URL` trong backend `.env` không khớp URL frontend | Sửa `CLIENT_URL` đúng bằng URL frontend đang chạy |
| Đăng nhập admin không được | Chưa chạy `npm run seed`, hoặc sai email/password trong `.env` lúc seed | Chạy lại `npm run seed`, kiểm tra `ADMIN_EMAIL`/`ADMIN_PASSWORD` lúc đó |
| `429 Too Many Requests` khi chat | Rate-limit đang chặn (bảo vệ quota) | Đợi 1 phút, hoặc tăng `CHAT_RATE_LIMIT_PER_MINUTE` trong `.env` |

---

## 9. Hướng phát triển thêm (cho báo cáo)

Phần "Core" ở trên đã chạy đầy đủ và ổn định — đây là phần dùng để demo
trước hội đồng. Các tính năng dưới đây **chưa code** nhưng nên trình bày
trong báo cáo như "hướng phát triển tương lai" (đúng kiến trúc adapter đã
có sẵn nên dễ mở rộng):

- **Voice chat**: dùng Web Speech API của browser (free, không cần key)
- **Upload file/ảnh cho AI phân tích**: Gemini hỗ trợ vision free tier
- **Web search cho AI**: tích hợp Tavily hoặc Brave Search API (free tier)
- **Memory** (AI nhớ thông tin qua nhiều lần chat): lưu thêm 1 bảng `UserMemory`
- **Projects** (nhóm nhiều cuộc trò chuyện theo chủ đề)
- **OAuth** (đăng nhập Google) qua Passport.js

---

Chúc bạn bảo vệ đồ án thành công! 🎓
