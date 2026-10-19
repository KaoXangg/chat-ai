import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Sparkles,
  Crown,
  Zap,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Clock,
  Layers,
  Cpu,
  Bot,
  Flame,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import BrandMark from "../components/BrandMark.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Khám phá & trò chuyện AI cơ bản mỗi ngày",
    icon: Zap,
    color: "zinc",
    gradient: "from-zinc-500/10 to-zinc-500/5",
    border: "border-zinc-200 dark:border-zinc-800",
    badge: null,
    priceMonthly: 0,
    priceYearly: 0,
    tokenDaily: "50,000",
    tokenDesc: "~100 tin nhắn thông thường / ngày",
    models: ["Gemini 2.5 Flash", "Llama 3.3 70B", "DeepSeek R1 (free)"],
    features: [
      { text: "50,000 tokens miễn phí mỗi ngày", included: true },
      { text: "Truy cập mô hình AI chuẩn tốc độ cao", included: true },
      { text: "Lưu tối đa 50 cuộc hội thoại", included: true },
      { text: "Tốc độ xử lý tiêu chuẩn", included: true },
      { text: "Phân tích 1 ảnh mỗi tin nhắn", included: true },
      { text: "Tìm kiếm Web thời gian thực", included: false },
      { text: "Mô hình suy luận chuyên sâu (Pro / Reasoning)", included: false },
      { text: "Ưu tiên hàng đợi giờ cao điểm", included: false },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Cho lập trình viên, học tập & công việc chuyên sâu",
    icon: Sparkles,
    color: "brand",
    gradient: "from-brand-500/15 via-brand-500/5 to-transparent",
    border: "border-brand-500/40 dark:border-brand-500/40 shadow-glow-brand/20",
    badge: "Phổ biến nhất",
    priceMonthly: 99000,
    priceYearly: 990000, // 82.500đ / tháng
    tokenDaily: "250,000",
    tokenDesc: "Gấp 5 lần gói Free (~500 tin nhắn / ngày)",
    models: ["Gemini 2.5 Pro", "Claude 3.5 Sonnet", "GPT-4o mini", "DeepSeek V3 / R1"],
    features: [
      { text: "250,000 tokens mỗi ngày (gấp 5 lần Free)", included: true },
      { text: "Mở khóa toàn bộ mô hình AI hàng đầu", included: true },
      { text: "Ưu tiên hàng đợi, phản hồi siêu tốc", included: true },
      { text: "Phân tích đa phương thức (Vision) tới 4 ảnh", included: true },
      { text: "Tìm kiếm web thời gian thực không giới hạn", included: true },
      { text: "Không giới hạn lưu trữ hội thoại & thư mục", included: true },
      { text: "Tùy biến Persona & System Prompt", included: true },
      { text: "Băng thông riêng & hỗ trợ kỹ thuật 1-1", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Sức mạnh tối đa cho chuyên gia & doanh nghiệp",
    icon: Crown,
    color: "amber",
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    border: "border-amber-500/40 dark:border-amber-500/40 shadow-amber-500/10",
    badge: "Sức mạnh tối đa",
    priceMonthly: 249000,
    priceYearly: 2490000, // 207.500đ / tháng
    tokenDaily: "1,000,000",
    tokenDesc: "Hạn ngạch cực lớn, gần như không giới hạn",
    models: ["Tất cả mô hình đỉnh cao", "Claude 3.5 Opus", "GPT-4o", "o1 / o3 Reasoning"],
    features: [
      { text: "1,000,000 tokens mỗi ngày (gần như vô hạn)", included: true },
      { text: "Toàn quyền truy cập mọi mô hình mạnh nhất", included: true },
      { text: "Băng thông riêng, tốc độ phản hồi tối đa", included: true },
      { text: "Phân tích code & tệp dữ liệu dung lượng lớn", included: true },
      { text: "Tạo không giới hạn Trợ lý AI Chuyên biệt", included: true },
      { text: "Trải nghiệm sớm các mô hình AI mới ra mắt", included: true },
      { text: "Hỗ trợ kỹ thuật 24/7 trực tiếp 1-1", included: true },
      { text: "Cam kết SLA ổn định 99.9%", included: true },
    ],
  },
];

const FAQS = [
  {
    q: "Hạn ngạch token được làm mới vào thời điểm nào?",
    a: "Hạn ngạch token hàng ngày được tự động làm mới vào đúng 00:00 (múi giờ GMT+7, giờ Việt Nam) mỗi ngày. Lượng token không dùng hết trong ngày sẽ không cộng dồn sang ngày hôm sau.",
  },
  {
    q: "Tôi có thể chuyển đổi giữa các gói bất kỳ lúc nào không?",
    a: "Có, bạn hoàn toàn có thể nâng cấp hoặc hạ cấp gói bất kỳ lúc nào. Gói mới và định mức token mở rộng sẽ có hiệu lực ngay lập tức sau khi xác nhận.",
  },
  {
    q: "Nếu tôi dùng hết hạn ngạch trong ngày thì sao?",
    a: "Hệ thống sẽ tạm dừng gửi tin nhắn mới và hiển thị thông báo. Bạn có thể nâng cấp lên gói Plus hoặc Premium để tiếp tục chat ngay, hoặc đợi đến 00:00 để hạn ngạch được đặt lại tự động.",
  },
  {
    q: "Gói Plus và Premium có hỗ trợ xuất hoá đơn không?",
    a: "Hệ thống hỗ trợ xuất biên lai điện tử và hóa đơn VAT cho khách hàng cá nhân hoặc doanh nghiệp khi đăng ký gói theo năm.",
  },
];

export default function Pricing() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [yearly, setYearly] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTier, setCurrentTier] = useState("free");
  const [userQuota, setUserQuota] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  // Lấy quota hiện tại của user nếu đã đăng nhập
  useEffect(() => {
    if (user) {
      const t = (user.userTier || "free").toLowerCase();
      const norm = t === "pro" ? "plus" : t === "vip" ? "premium" : t;
      setCurrentTier(norm);

      api.get("/usage")
        .then((res) => {
          if (res.data.success && res.data.data.quota) {
            setUserQuota(res.data.data.quota);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSelectPlan = (planId) => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (planId === currentTier) {
      toast.info("Bạn hiện đang sử dụng gói này.");
      return;
    }
    setUpgradingTo(planId);
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradingTo) return;
    try {
      setIsSubmitting(true);
      const res = await api.post("/usage/upgrade", { tier: upgradingTo });
      if (res.data.success) {
        toast.success(`🎉 Chúc mừng! Bạn đã chuyển sang gói ${upgradingTo.toUpperCase()} thành công.`);
        setCurrentTier(upgradingTo);
        if (updateUser) {
          updateUser({ ...user, userTier: upgradingTo });
        }
        setUpgradingTo(null);
        setTimeout(() => {
          navigate("/chat");
        }, 1200);
      }
    } catch {
      toast.error("Có lỗi xảy ra khi cập nhật gói. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (num) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-brand-500/20">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/chat" className="flex items-center gap-2.5 group">
              <BrandMark size={32} />
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight group-hover:text-brand-500 transition-colors">
                  Chat AI
                </span>
                <span className="text-[10px] text-zinc-400 font-medium -mt-1">Dịch vụ & Bảng giá</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />

            {user ? (
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs shadow-brand-500/20 transition-all active:scale-95"
              >
                <span>Về trang Chat</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO HEADER */}
      <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          Chọn gói phù hợp với{" "}
          <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent">
            nhu cầu của bạn
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Trải nghiệm trí tuệ nhân tạo thế hệ mới với các mô hình thông minh nhất thế giới. Không cam kết ràng buộc, tự do đổi gói bất kỳ lúc nào.
        </p>

        {/* Billing Toggle – ARIA role=group */}
        <div
          role="group"
          aria-label="Chọn chu kỳ thanh toán"
          className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner"
        >
          <button
            onClick={() => setYearly(false)}
            aria-pressed={!yearly}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              !yearly
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Thanh toán theo tháng
          </button>
          <button
            onClick={() => setYearly(true)}
            aria-pressed={yearly}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              yearly
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <span>Thanh toán theo năm</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Tiết kiệm 17%
            </span>
          </button>
        </div>
      </section>

      {/* 3. 3 PRICING CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PLANS.map((plan) => {
            const isCurrent = user && currentTier === plan.id;
            const Icon = plan.icon;
            const isPopular = plan.id === "plus";

            const price = yearly ? plan.priceYearly : plan.priceMonthly;
            const displayPrice = price === 0 ? "0đ" : `${formatVND(price)}đ`;
            const billingPeriod = yearly ? "/ năm" : "/ tháng";

            return (
              <motion.article
                key={plan.id}
                aria-label={`Gói ${plan.name}: ${plan.tagline}`}
                aria-current={isCurrent ? "true" : undefined}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-3xl bg-white dark:bg-zinc-900 border ${plan.border} p-6 sm:p-8 flex flex-col justify-between shadow-lg overflow-hidden ${
                  isPopular ? "ring-2 ring-brand-500/50" : ""
                }`}
              >
                {/* Background Accent Gradient */}
                <div
                  className={`absolute top-0 right-0 -left-0 h-40 bg-gradient-to-b ${plan.gradient} pointer-events-none`}
                />

                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2.5 rounded-xl ${
                          plan.id === "free"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            : plan.id === "plus"
                            ? "bg-brand-500/15 text-brand-600 dark:text-brand-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                        aria-hidden="true"
                      >
                        <Icon size={22} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                    </div>

                    {plan.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-500 text-white shadow-xs">
                        {plan.badge}
                      </span>
                    )}

                    {isCurrent && (
                      <span
                        aria-label="Gói hiện tại của bạn"
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} aria-hidden="true" /> Gói hiện tại
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 min-h-[32px] leading-relaxed relative z-10">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mt-5 pb-5 border-b border-zinc-100 dark:border-zinc-800 relative z-10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">
                        {displayPrice}
                      </span>
                      {price > 0 && (
                        <span className="text-xs text-zinc-400 font-medium">{billingPeriod}</span>
                      )}
                    </div>
                    {yearly && price > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        Tương đương ~{formatVND(Math.round(price / 12))}đ / tháng
                      </p>
                    )}
                  </div>

                  {/* Token Highlight Box */}
                  <div className="my-5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Hạn ngạch token:</span>
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-sm">
                        {plan.tokenDaily} / ngày
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{plan.tokenDesc}</p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 text-xs mb-8">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider text-zinc-400">
                      Đặc quyền bao gồm:
                    </p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                            feat.included
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-40"
                          }`}
                        >
                          {feat.included ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                        </span>
                        <span
                          className={
                            feat.included
                              ? "text-zinc-700 dark:text-zinc-300 leading-snug"
                              : "text-zinc-400 dark:text-zinc-500 line-through leading-snug"
                          }
                        >
                          {feat.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="relative z-10 pt-2">
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all active:scale-98 flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                        : isPopular
                        ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
                        : plan.id === "premium"
                        ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/20"
                        : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 shadow-xs"
                    }`}
                  >
                    <span>
                      {isCurrent
                        ? "Gói hiện tại của bạn"
                        : !user
                        ? "Bắt đầu với gói này"
                        : plan.id === "free"
                        ? "Chuyển về gói Free"
                        : `Nâng cấp lên ${plan.name}`}
                    </span>
                    {!isCurrent && <ArrowRight size={14} />}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 4. COMPARISON MATRIX */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight">So sánh chi tiết tính năng</h2>
          <p className="text-xs text-zinc-400 mt-1">Đầy đủ các thông số kỹ thuật và năng lực hỗ trợ giữa các gói</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Tính năng & Tài nguyên</th>
                <th className="py-3 px-4 text-center">Free</th>
                <th className="py-3 px-4 text-center text-brand-600 dark:text-brand-400">Plus</th>
                <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-3 px-4 font-medium">Hạn ngạch Token mỗi ngày</td>
                <td className="py-3 px-4 text-center font-mono font-semibold">50,000</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-brand-600 dark:text-brand-400">250,000</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400">1,000,000</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Số lượng ảnh gửi cùng lúc</td>
                <td className="py-3 px-4 text-center">1 ảnh</td>
                <td className="py-3 px-4 text-center font-semibold">4 ảnh</td>
                <td className="py-3 px-4 text-center font-semibold">4 ảnh</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Tìm kiếm Web thời gian thực</td>
                <td className="py-3 px-4 text-center text-zinc-400"><X size={15} className="mx-auto" /></td>
                <td className="py-3 px-4 text-center text-emerald-500 font-semibold"><Check size={16} className="mx-auto" /></td>
                <td className="py-3 px-4 text-center text-emerald-500 font-semibold"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Mô hình suy luận sâu (Reasoning AI)</td>
                <td className="py-3 px-4 text-center text-zinc-400"><X size={15} className="mx-auto" /></td>
                <td className="py-3 px-4 text-center text-emerald-500 font-semibold"><Check size={16} className="mx-auto" /></td>
                <td className="py-3 px-4 text-center text-emerald-500 font-semibold"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Ưu tiên tốc độ xử lý giờ cao điểm</td>
                <td className="py-3 px-4 text-center">Tiêu chuẩn</td>
                <td className="py-3 px-4 text-center text-brand-600 dark:text-brand-400 font-semibold">Ưu tiên cao</td>
                <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-bold">Băng thông VIP</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Giới hạn lịch sử trò chuyện</td>
                <td className="py-3 px-4 text-center">50 cuộc hội thoại</td>
                <td className="py-3 px-4 text-center font-semibold">Không giới hạn</td>
                <td className="py-3 px-4 text-center font-semibold">Không giới hạn</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Hỗ trợ kỹ thuật</td>
                <td className="py-3 px-4 text-center">Cộng đồng</td>
                <td className="py-3 px-4 text-center">Ưu tiên qua Email</td>
                <td className="py-3 px-4 text-center font-semibold text-amber-600 dark:text-amber-400">Trực tiếp 1-1 24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. FAQS */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Câu hỏi thường gặp</h2>
          <p className="text-xs text-zinc-400 mt-1">Những điều bạn cần biết về gói dịch vụ và thanh toán</p>
        </div>

        <div className="space-y-3" role="list">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            const panelId = `faq-panel-${i}`;
            const btnId   = `faq-btn-${i}`;
            return (
              <div
                key={i}
                role="listitem"
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-colors"
              >
                <button
                  id={btnId}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full p-4 text-start flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm hover:text-brand-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-500" : "text-zinc-400"}`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className="px-4 pb-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. UPGRADE CONFIRMATION MODAL */}
      <AnimatePresence>
        {upgradingTo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Xác nhận đổi sang gói {upgradingTo.toUpperCase()}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hạn mức token mới sẽ được kích hoạt ngay lập tức
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Gói được chọn:</span>
                  <span className="font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    {upgradingTo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Định mức token mới:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    {PLANS.find((p) => p.id === upgradingTo)?.tokenDaily} tokens / ngày
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Hiệu lực:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Kích hoạt ngay • Reset lúc 00:00 hàng ngày
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setUpgradingTo(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpgrade}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs shadow-brand-500/25 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang kích hoạt...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận & Bắt đầu</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
