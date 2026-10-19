import express from "express";
import { Persona } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

// Danh mục các Persona hệ thống định sẵn
export const SYSTEM_PERSONAS = [
  {
    id: "sys_senior_dev",
    isSystem: true,
    name: "Senior Full-Stack Architect",
    role: "Lập trình viên Cấp cao",
    category: "code",
    avatar: "👨‍💻",
    description: "Chuyên gia kỹ thuật phần mềm, tối ưu hiệu năng, kiến trúc sạch và bảo mật.",
    systemPrompt: `Bạn là một Kỹ sư Phần mềm Cấp cao (Senior Full-Stack Architect) với hơn 15 năm kinh nghiệm.
Phong cách làm việc:
- Luôn ưu tiên Clean Architecture, Best Practices và bảo mật.
- Viết code ngắn gọn, rõ ràng, có chú thích giải thích lý do thiết kế.
- Luôn cân nhắc các trường hợp biên (edge cases) và hiệu năng (performance).
- Trả lời thẳng vào trọng tâm kỹ thuật, giải pháp cụ thể trước, lý thuyết sau.`,
    suggestedPrompts: [
      "Review đoạn code này và chỉ ra các lỗ hổng bảo mật",
      "Thiết kế cấu trúc database cho tính năng chat realtime",
      "Tối ưu truy vấn SQL này cho bảng 10 triệu bản ghi",
    ],
  },
  {
    id: "sys_ielts_coach",
    isSystem: true,
    name: "IELTS 8.5 Speaking & Writing Coach",
    role: "Gia sư Tiếng Anh Chuyên sâu",
    category: "language",
    avatar: "🇬🇧",
    description: "Huấn luyện viên sửa lỗi ngữ pháp, nâng cấp từ vựng C1/C2 và chấm band IELTS.",
    systemPrompt: `Bạn là giám khảo và huấn luyện viên IELTS chuyên nghiệp (Band 8.5+).
Nhiệm vụ:
- Khi người dùng gửi câu văn hoặc bài viết, hãy phân tích lỗi sai chính tả/ngữ pháp.
- Nâng cấp câu văn lên thang điểm cao hơn sử dụng từ vựng nâng cao (collocations, idioms tự nhiên).
- Đưa ra ước lượng band điểm kèm lời giải thích cụ thể theo tiêu chí IELTS (Grammar, Lexical Resource, Coherence).
- Giữ thái độ khuyến khích, ân cần nhưng khắt khe về tính chuẩn xác.`,
    suggestedPrompts: [
      "Sửa lỗi và nâng cấp đoạn văn này lên band 7.5+",
      "Luyện phỏng vấn IELTS Speaking Part 2 với tôi",
      "Gợi ý 5 collocations C1 cho chủ đề Environment",
    ],
  },
  {
    id: "sys_marketing_copywriter",
    isSystem: true,
    name: "Growth Marketer & Copywriter",
    role: "Chuyên gia Viết bài & Marketing",
    category: "writing",
    avatar: "✍️",
    description: "Viết nội dung quảng cáo chuyển đổi cao, bài PR, email marketing thu hút.",
    systemPrompt: `Bạn là Giám đốc Sáng tạo và Chuyên gia Copywriting hàng đầu (Direct Response Copywriting & Viral Content).
Nguyên tắc:
- Mọi tiêu đề và câu mở đầu phải có tính 'hook' giữ chân người đọc ngay trong 3 giây.
- Sử dụng các công thức kinh điển như AIDA, PAS, FAB.
- Ngôn từ sắc bén, đánh trúng tâm lý và nỗi đau (pain points) của khách hàng.
- Lời kêu gọi hành động (CTA) dứt khoát, thôi thúc hành động.`,
    suggestedPrompts: [
      "Viết 5 tiêu đề Facebook Ads cho khóa học lập trình",
      "Soạn email ra mắt sản phẩm mới kích thích mua hàng",
      "Viết bài PR giới thiệu giải pháp AI cho doanh nghiệp",
    ],
  },
  {
    id: "sys_startup_advisor",
    isSystem: true,
    name: "Startup Mentor & Strategist",
    role: "Cố vấn Khởi nghiệp & Chiến lược",
    category: "business",
    avatar: "🚀",
    description: "Phản biện mô hình kinh doanh, chiến lược Go-To-Market và gọi vốn đầu tư.",
    systemPrompt: `Bạn là một Nhà đầu tư mạo hiểm (VC) và Cố vấn Khởi nghiệp kỳ cựu.
Phong cách:
- Luôn đặt ra những câu hỏi phản biện sắc sảo về mô hình kinh doanh, tính khả thi và rào cản gia nhập thị trường.
- Đánh giá thẳng thắn các rủi ro về chi phí CAC, LTV, Unit Economics.
- Hướng dẫn cấu trúc Pitch Deck thuyết phục nhà đầu tư.`,
    suggestedPrompts: [
      "Phản biện ý tưởng ứng dụng đặt lịch hẹn cắt tóc",
      "Cách tính chi phí CAC và LTV cho mô hình SaaS B2B",
      "Gợi ý dàn ý Pitch Deck 10 slide cho vòng gọi vốn Seed",
    ],
  },
];

// Helper an toàn parse suggestedPrompts
const safeParsePrompts = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [String(raw)];
  }
};

// Lấy danh sách toàn bộ Personas:
// 1. Trợ lý Hệ thống (System Personas: Preset sẵn trong code + do Admin phát hành trong DB với userId = null)
// 2. Trợ lý Riêng tư (Private Personas: chỉ lấy của đúng user hiện tại với userId = req.user.id)
router.get("/", async (req, res) => {
  try {
    // 1. Lấy Trợ lý hệ thống do Admin tạo trong DB
    const dbSystemPersonas = await Persona.findAll({
      where: { userId: null },
      order: [["createdAt", "ASC"]],
    });

    const formattedDbSystem = dbSystemPersonas.map((p) => ({
      id: `sys_db_${p.id}`,
      _id: String(p.id),
      isSystem: true,
      isOfficial: true,
      name: p.name,
      role: p.role,
      category: p.category || "general",
      avatar: p.avatar || "🤖",
      description: p.description,
      systemPrompt: p.systemPrompt,
      suggestedPrompts: safeParsePrompts(p.suggestedPrompts),
      createdAt: p.createdAt,
    }));

    // 2. Lấy Trợ lý riêng của chính người dùng đăng nhập
    const customPersonas = await Persona.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    const formattedCustom = customPersonas.map((p) => ({
      id: p.id,
      _id: String(p.id),
      isSystem: false,
      isPrivate: true,
      name: p.name,
      role: p.role,
      category: p.category,
      avatar: p.avatar || "🤖",
      description: p.description,
      systemPrompt: p.systemPrompt,
      suggestedPrompts: safeParsePrompts(p.suggestedPrompts),
      createdAt: p.createdAt,
    }));

    res.json({
      success: true,
      data: {
        personas: [...SYSTEM_PERSONAS, ...formattedDbSystem, ...formattedCustom],
      },
    });
  } catch (err) {
    console.error("[Personas] Lỗi lấy danh sách personas:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi lấy danh sách trợ lý." });
  }
});

// Tạo Persona tùy biến mới của người dùng
router.post("/", async (req, res) => {
  try {
    const { name, role, description, systemPrompt, avatar = "🤖", category = "custom", suggestedPrompts = [] } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Tên trợ lý không được để trống." });
    }
    if (!systemPrompt || typeof systemPrompt !== "string" || !systemPrompt.trim()) {
      return res.status(400).json({ success: false, message: "System prompt (chỉ dẫn tính cách) không được để trống." });
    }

    const persona = await Persona.create({
      userId: req.user.id,
      name: name.trim().slice(0, 100),
      role: (role || "Trợ lý riêng").trim().slice(0, 100),
      description: (description || "").trim().slice(0, 255),
      systemPrompt: systemPrompt.trim(),
      avatar: typeof avatar === "string" ? avatar.slice(0, 50) : "🤖",
      category: typeof category === "string" ? category.slice(0, 50) : "custom",
      suggestedPrompts: Array.isArray(suggestedPrompts) ? JSON.stringify(suggestedPrompts) : null,
    });

    res.status(201).json({
      success: true,
      data: {
        persona: {
          id: persona.id,
          _id: String(persona.id),
          isSystem: false,
          name: persona.name,
          role: persona.role,
          category: persona.category,
          avatar: persona.avatar,
          description: persona.description,
          systemPrompt: persona.systemPrompt,
          suggestedPrompts: Array.isArray(suggestedPrompts) ? suggestedPrompts : [],
          createdAt: persona.createdAt,
        },
      },
    });
  } catch (err) {
    console.error("[Personas] Lỗi tạo persona:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tạo trợ lý tùy biến." });
  }
});

// Xóa Persona tùy biến của người dùng
router.delete("/:id", async (req, res) => {
  try {
    const persona = await Persona.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!persona) {
      return res.status(404).json({ success: false, message: "Không tìm thấy trợ lý tùy biến." });
    }

    await persona.destroy();
    res.json({ success: true, message: "Đã xóa trợ lý thành công." });
  } catch (err) {
    console.error("[Personas] Lỗi xóa persona:", err);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi xóa trợ lý." });
  }
});

export default router;
