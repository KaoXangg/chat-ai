::: {align="center"}
✨ Chat AI
Trợ lý AI đa mô hình --- giao diện hiện đại, phản hồi trực tuyến
Một ứng dụng web trò chuyện với AI lấy cảm hứng từ trải nghiệm ChatGPT,
xây dựng bằng React, Node.js/Express và Microsoft SQL Server.
```{=html}
<p>
```
`<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />`{=html}
`<img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />`{=html}
`<img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />`{=html}
`<img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />`{=html}
`<img src="https://img.shields.io/badge/SQL%20Server-Database-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" alt="SQL Server" />`{=html}
```{=html}
</p>
```
Chat • Quản lý hội thoại • Nhiều nhà cung cấp AI • Admin Dashboard
:::
---
📌 Giới thiệu
Chat AI là dự án web full-stack cho phép người dùng tạo tài khoản,
trò chuyện với các mô hình AI, quản lý lịch sử hội thoại và tùy chỉnh
trải nghiệm sử dụng. Dự án có trang quản trị riêng để theo dõi hoạt
động, quản lý tài khoản và cấu hình danh sách mô hình AI.
> Đây là dự án phục vụ học tập và phát triển. Các tính năng thực tế khi
> chạy phụ thuộc vào cấu hình database, API key và môi trường triển
> khai.
✨ Tính năng chính
```{=html}
<table>
```
```{=html}
<tr>
```
```{=html}
<td width="50%" valign="top">
```
💬 Trò chuyện AI
Phản hồi dạng streaming, hiển thị nội dung theo thời gian thực.
Quản lý nhiều cuộc trò chuyện.
Tìm kiếm, ghim, đổi tên và xóa hội thoại.
Hiển thị Markdown, công thức và khối mã.
Sao chép và tạo lại câu trả lời.
Thao tác đánh giá phản hồi.
```{=html}
</td>
```
```{=html}
<td width="50%" valign="top">
```
🧠 Nhiều AI provider
Tích hợp Groq.
Tích hợp Google Gemini.
Tích hợp OpenRouter.
Bộ định tuyến provider và cơ chế fallback.
Chọn model ngay trong giao diện chat.
Cấu hình API key ở phía backend.
```{=html}
</td>
```
```{=html}
</tr>
```
```{=html}
<tr>
```
```{=html}
<td width="50%" valign="top">
```
🔐 Tài khoản & bảo mật
Đăng ký và đăng nhập.
Xác thực bằng JWT.
Chức năng quên/đặt lại mật khẩu qua email theo cấu hình.
Phân quyền người dùng và quản trị viên.
Giới hạn tần suất yêu cầu chat.
Middleware xử lý xác thực và lỗi.
```{=html}
</td>
```
```{=html}
<td width="50%" valign="top">
```
🛠️ Admin Dashboard
Tổng quan thống kê và biểu đồ.
Quản lý người dùng.
Khóa/mở khóa tài khoản và quản lý quyền.
Quản lý danh sách AI model.
Bật/tắt model và chọn model mặc định.
Theo dõi trạng thái cấu hình provider.
```{=html}
</td>
```
```{=html}
</tr>
```
```{=html}
</table>
```
🧰 Công nghệ sử dụng
---
Khu vực                             Công nghệ
---
Frontend                            React 18, Vite 5, React Router
Giao diện                           Tailwind CSS, Framer Motion, Lucide
React
Biểu đồ                             Recharts
Nội dung chat                       React Markdown, remark-gfm,
remark-math, KaTeX, syntax
highlighting
HTTP client                         Axios
Backend                             Node.js, Express
Cơ sở dữ liệu                       Microsoft SQL Server
ORM                                 Sequelize, Tedious
Xác thực                            JSON Web Token (JWT), bcryptjs
AI providers                        Groq, Google Gemini, OpenRouter
Email                               Nodemailer
🗂️ Cấu trúc dự án
``` text
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
⚙️ Yêu cầu môi trường
Trước khi cài đặt, hãy chuẩn bị:
Node.js 18 trở lên và npm.
Microsoft SQL Server (cục bộ hoặc máy chủ tương thích).
Git để tải mã nguồn.
API key của ít nhất một nhà cung cấp AI được cấu hình.
Trình duyệt hiện đại.
🚀 Cài đặt và chạy dự án
1. Tải mã nguồn
``` bash
git clone https://github.com/KaoXangg/chat-ai.git
cd chat-ai
```
Nếu repository của bạn có URL khác, hãy thay URL trong lệnh `git clone`
bằng URL thật.
2. Tạo database
Mở SQL Server Management Studio (SSMS), kết nối SQL Server rồi chạy:
``` sql
CREATE DATABASE chat_ai;
```
Chọn database `chat_ai` và thực thi file:
``` text
backend/sql/schema.sql
```
File schema là bước khởi tạo cấu trúc dữ liệu. Nếu dự án có migration bổ
sung, hãy kiểm tra và chạy theo hướng dẫn tương ứng trước khi khởi động
backend.
3. Cấu hình backend
Mở terminal tại thư mục dự án:
``` bash
cd backend
npm install
```
Tạo file `backend/.env` từ mẫu `backend/.env.example`. Trên PowerShell:
``` powershell
Copy-Item .env.example .env
```
Mở `backend/.env` và điền thông tin phù hợp với máy của bạn:
``` ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=1433
DB_NAME=chat_ai
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password

GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
TAVILY_API_KEY=

CHAT_RATE_LIMIT_PER_MINUTE=10
```
Lưu ý: Đây là cấu hình mẫu. Hãy đối chiếu với `backend/.env.example`
của phiên bản đang sử dụng và không đưa thông tin bí mật thật vào README
hoặc Git.
4. Khởi tạo dữ liệu và chạy backend
Trong terminal ở thư mục `backend`:
``` bash
npm run seed
npm run dev
```
Lệnh `npm run seed` dùng để khởi tạo dữ liệu ban đầu theo logic của dự
án; thông thường chỉ chạy khi thiết lập lần đầu hoặc khi bạn chủ động
cần seed lại.
Backend mặc định sử dụng:
``` text
http://localhost:5000
```
Có thể kiểm tra endpoint health nếu server đã khởi động thành công:
``` text
http://localhost:5000/api/health
```
5. Cấu hình và chạy frontend
Mở terminal thứ hai, tại thư mục gốc dự án:
``` bash
cd frontend
npm install
```
Tạo file môi trường từ mẫu:
``` powershell
Copy-Item .env.example .env
```
Kiểm tra giá trị API base URL trong file môi trường frontend theo nội
dung của `frontend/.env.example` và cấu hình backend đang chạy. Sau đó
khởi động:
``` bash
npm run dev
```
Mở địa chỉ Vite được hiển thị trong terminal --- mặc định thường là:
``` text
http://localhost:5173
```
🔑 Cấu hình AI provider
Bạn chỉ cần cấu hình API key của ít nhất một provider được hỗ trợ.
---
Provider                            Trang quản lý API key
---
Groq                                console.groq.com
Google Gemini                       Google AI
Studio
OpenRouter                          openrouter.ai/keys
Đặt key trong `backend/.env`, khởi động lại backend sau khi thay đổi cấu
hình. Không đặt các key bí mật trong biến môi trường frontend có tiền tố
`VITE_`, vì các giá trị đó có thể được đưa vào mã trình duyệt.
🧑‍💻 Admin Dashboard
Tài khoản quản trị được tạo theo cấu hình trong `backend/.env` và logic
của `backend/seed.js`.
Đặt `ADMIN_USERNAME`, `ADMIN_EMAIL` và `ADMIN_PASSWORD` trước khi
seed.
Chạy `npm run seed` trong thư mục `backend`.
Đăng nhập bằng thông tin đã cấu hình.
Mở khu vực quản trị nếu tài khoản được cấp quyền admin.
Không sử dụng mật khẩu mẫu trong môi trường công khai. Nếu seed đã được
chạy trước khi sửa biến môi trường, hãy kiểm tra logic seed và dữ liệu
hiện có để xác định cách cập nhật tài khoản.
🧪 Kiểm tra build frontend
Từ terminal:
``` bash
cd frontend
npm run build
```
Nếu build thành công, Vite sẽ tạo thư mục `frontend/dist/`. Thư mục này
là sản phẩm build và thường không cần commit nếu dự án không có yêu cầu
triển khai đặc biệt.
🛡️ Bảo mật trước khi đưa lên GitHub
Không commit `backend/.env`, `frontend/.env` hoặc bất kỳ file chứa
API key/mật khẩu nào.
Giữ `.env.example` chỉ gồm giá trị mẫu, không chứa thông tin đăng
nhập thật.
Kiểm tra `.gitignore` có loại trừ `.env`, `.env.*` (ngoại trừ file
`.env.example` nếu cần), `node_modules/` và `dist/`.
Không đăng công khai mật khẩu SQL Server, JWT secret, email
credentials hoặc API key.
Nếu secret đã được commit/push lên repository, xóa khỏi mã nguồn
không đủ: hãy thu hồi/đổi secret đó và xử lý lịch sử Git nếu
cần.
Dùng mật khẩu quản trị mạnh, giới hạn quyền database và cấu hình
HTTPS khi triển khai.
🧯 Xử lý lỗi thường gặp
---
Lỗi                                 Hướng kiểm tra
---
Backend không kết nối SQL Server    Kiểm tra SQL Server service,
host/port, tên database, tài khoản,
mật khẩu và chế độ xác thực.
`Login failed for user`             Xác nhận SQL Server Authentication
đã được bật nếu dùng tài khoản SQL;
kiểm tra lại thông tin trong
`.env`.
Frontend không gọi được API         Kiểm tra backend có chạy không, API
base URL, `CLIENT_URL` và cấu hình
CORS.
AI trả lỗi hoặc hết quota           Kiểm tra API key, model được bật,
hạn mức provider và log backend.
Không đăng nhập được admin          Kiểm tra role trong database, giá
trị cấu hình admin và logic
`seed.js`.
Port đã được sử dụng                Đóng tiến trình đang dùng port hoặc
đổi port trong cấu hình phù hợp.
Thay đổi `.env` không có tác dụng   Khởi động lại backend sau khi chỉnh
biến môi trường.
🛣️ Hướng phát triển
Bổ sung kiểm thử tự động cho API và giao diện.
Hoàn thiện phân trang và bộ lọc nâng cao cho trang quản trị.
Bổ sung quan sát lỗi, logging và thống kê sử dụng.
Cải thiện quản lý quota, timeout và retry cho từng AI provider.
Chuẩn hóa quy trình triển khai production và backup database.
🤝 Đóng góp
Fork repository.
Tạo branch mới: `git checkout -b feature/ten-tinh-nang`.
Commit thay đổi: `git commit -m "Add: ten tinh nang"`.
Push branch và tạo Pull Request.
📄 Giấy phép
Chưa xác định giấy phép phân phối cho repository này. Hãy bổ sung file
`LICENSE` nếu bạn muốn công bố điều khoản sử dụng và tái phân phối.
---
::: {align="center"}
Chat AI · Built with React, Node.js and SQL Server
Nếu dự án hữu ích cho việc học tập, bạn có thể ⭐ repository trên
GitHub.
:::