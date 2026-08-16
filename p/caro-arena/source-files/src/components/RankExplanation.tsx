/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HelpCircle, Star, Target, Shield, Info, ShieldCheck, CheckCircle2, XCircle, Sparkles, Award, Zap } from "lucide-react";

interface RankExplanationProps {
  theme?: "light" | "dark";
}

export default function RankExplanation({ theme = "dark" }: RankExplanationProps) {
  const isDark = theme === "dark";

  const tiers = [
    {
      name: "Thần Vương Tối Cao (Apex Celestial Sovereign)",
      elo: "2800+",
      color: "text-rose-400",
      bgClass: isDark ? "bg-rose-500/15 border-rose-500/30" : "bg-rose-50 border-rose-300",
      desc: "Cảnh giới tối thượng của đấu trường Caro Arena. Khả năng nhìn thấu toàn cục trận địa, hóa giải mọi đòn tấn công và định đoạt thế cờ trong chớp mắt.",
    },
    {
      name: "Huyền Thoại Vô Cực (Infinite Zenith Legend)",
      elo: "2500 - 2799",
      color: "text-purple-400",
      bgClass: isDark ? "bg-purple-500/15 border-purple-500/30" : "bg-purple-50 border-purple-300",
      desc: "Bậc kỳ thủ huyền thoại với tư duy chiến thuật đỉnh cao, thành thạo chuỗi tấn công VCF 10+ nước và bẫy giao điểm đa chiều.",
    },
    {
      name: "Đại Sư Huyền Không (Astral Archon)",
      elo: "2200 - 2499",
      color: "text-cyan-300",
      bgClass: isDark ? "bg-cyan-500/10 border-cyan-500/25" : "bg-cyan-50 border-cyan-200",
      desc: "Kỳ thủ đẳng cấp cao, am hiểu tường tận các thế công đôi 4-3, 4-4, biết cách gài bẫy và bẻ gãy đòn phản công của đối phương.",
    },
    {
      name: "Tông Sư Ngũ Tử (Gomoku Grandmaster)",
      elo: "1900 - 2199",
      color: "text-emerald-400",
      bgClass: isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200",
      desc: "Chuyển đổi hoàn hảo giữa tấn công chủ động và phòng ngự chặt chẽ. Xây dựng cấu trúc bàn cờ an toàn và khó bị xuyên phá.",
    },
    {
      name: "Chủ Tướng Trận Địa (Battlefield Warlord)",
      elo: "1600 - 1899",
      color: "text-yellow-400",
      bgClass: isDark ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-50 border-yellow-200",
      desc: "Nắm vững các đòn phối hợp 3 quân mở, biết cách gài bẫy chữ V và chặn đứng các nước 4 nguy hiểm.",
    },
    {
      name: "Chiến Lược Gia Không Gian (Dimensional Strategist)",
      elo: "1300 - 1599",
      color: "text-sky-300",
      bgClass: isDark ? "bg-sky-500/10 border-sky-500/20" : "bg-sky-50 border-sky-200",
      desc: "Kỳ thủ có tư duy phân tích tốt, nhận diện nhạy bén các hướng cờ mở và bắt đầu làm chủ nhịp độ ván đấu.",
    },
    {
      name: "Hiệp Sĩ Ô Vuông (Grid Vanguard)",
      elo: "1000 - 1299",
      color: "text-amber-500",
      bgClass: isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-[#fffaf0] border-amber-200",
      desc: "Kỳ thủ đã nắm vững quy tắc chặn 2 đầu, biết cách bao quát các chuỗi quân mở và hạn chế sơ hở.",
    },
    {
      name: "Tân Thủ Bàn Cờ (Grid Initiate)",
      elo: "0 - 999",
      color: "text-zinc-400",
      bgClass: isDark ? "bg-zinc-500/10 border-zinc-500/20" : "bg-zinc-50 border-zinc-200",
      desc: "Bước đệm khởi đầu để làm quen với đấu trường bàn cờ mở rộng vô tận và quy chuẩn Caro Việt Nam.",
    },
  ];

  return (
    <div className={`p-6 rounded-2xl flex flex-col h-full transition-all duration-300 max-h-[80vh] ${
      isDark 
        ? "bg-slate-900 text-slate-100" 
        : "bg-white text-slate-800"
    }`}>
      {/* Header Panel */}
      <div className={`flex items-center gap-3 mb-5 border-b pb-4 shrink-0 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-cyan-100 text-cyan-600"}`}>
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-sans font-bold tracking-wide">Quy Chuẩn Luật Chơi & Hệ Thống Xếp Hạng Caro Arena</h2>
          <p className={`text-xs font-mono ${isDark ? "text-cyan-400/70" : "text-cyan-600/80"}`}>Luật Caro Việt Nam chính thức và thang điểm Elo Đấu Trường</p>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Section 1: Official Rule (Vietnamese Blocked-Ends Rule) */}
        <div className={`p-4 rounded-xl border ${
          isDark ? "bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.08)]" : "bg-emerald-50/70 border-emerald-200"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Luật Chuẩn Duy Nhất: Caro Việt Nam (Chặn 2 Đầu)
            </h3>
          </div>

          <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            Trong <strong>Caro Arena</strong>, mọi trận đấu (Đấu Máy Ranked, Ghép Trận Online, Đấu Đôi PVP, Chế Độ Thế Cờ) đều áp dụng duy nhất <strong>Luật Caro Việt Nam chuẩn truyền thống</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Valid Win */}
            <div className={`p-3 rounded-lg border ${
              isDark ? "bg-slate-950/60 border-emerald-500/20" : "bg-white border-emerald-200"
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1.5">
                <CheckCircle2 size={15} />
                <span>Thế Thắng Hợp Lệ (Win)</span>
              </div>
              <ul className="text-[11px] space-y-1.5 text-slate-300">
                <li>• <strong>5 quân liên tiếp mở 2 đầu</strong>: <code>. X X X X X .</code> &rarr; <span className="text-emerald-400 font-bold">Thắng tuyệt đối</span></li>
                <li>• <strong>5 quân chỉ bị chặn 1 đầu</strong>: <code>O X X X X X .</code> &rarr; <span className="text-emerald-400 font-bold">Thắng hợp lệ</span></li>
                <li>• <strong>Chuỗi từ 6 quân trở lên</strong>: <code>X X X X X X</code> &rarr; <span className="text-emerald-400 font-bold">Luôn thắng</span> (kể cả bị chặn 2 đầu)</li>
              </ul>
            </div>

            {/* Blocked Case */}
            <div className={`p-3 rounded-lg border ${
              isDark ? "bg-slate-950/60 border-rose-500/20" : "bg-white border-rose-200"
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1.5">
                <XCircle size={15} />
                <span>Bị Chặn 2 Đầu (Chưa Thắng)</span>
              </div>
              <ul className="text-[11px] space-y-1.5 text-slate-300">
                <li>• <strong>5 quân bị chặn cả 2 đầu</strong>: <code>O X X X X X O</code></li>
                <li>• <strong className="text-amber-300">Quy định</strong>: Trận đấu <em>không dừng lại</em>, không tính thắng và tiếp tục bình thường cho đến khi có kỳ thủ tạo được thế thắng mới.</li>
              </ul>
            </div>
          </div>

          <div className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2 border ${
            isDark ? "bg-slate-900/80 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-900"
          }`}>
            <Sparkles size={16} className="shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <strong className="font-bold">Ý nghĩa chiến thuật:</strong> Luật chặn 2 đầu triệt tiêu ưu thế đi trước của quân X, buộc người chơi phải tạo các đòn phối hợp đôi như <strong>Thế 4-3</strong>, <strong>Thế 4-4</strong> hoặc bẫy mở 2 đầu để dứt điểm trận đấu, tạo nên chiều sâu tư duy chiến thuật đỉnh cao.
            </div>
          </div>
        </div>

        {/* Section 2: Arena Elo Rating System */}
        <div className={`p-4 rounded-xl border ${
          isDark ? "bg-slate-950/70 border-cyan-500/15" : "bg-slate-50 border-slate-200"
        }`}>
          <h4 className={`text-xs font-bold mb-3 flex items-center gap-1.5 uppercase tracking-wider ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
            <Target className="w-4 h-4 text-amber-400" />
            Hệ Thống Tính Điểm Năng Lực Đấu Trường (Dynamic Arena Elo)
          </h4>

          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-2.5 px-4 bg-black/40 rounded-xl border border-white/5 font-mono text-xs">
              <div className="text-cyan-400 mb-1 font-bold">R_mới = R_cũ + K * (S - E) + Thưởng Chuỗi Thắng</div>
              <div className="text-amber-400">E = 1 / (1 + 10 ^ ((R_đối_thủ - R_bạn) / 400))</div>
            </div>

            <div className="text-[11px] space-y-1.5 text-slate-400 leading-relaxed">
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>R_mới / R_cũ:</strong> Điểm Elo cập nhật sau trận đấu so với điểm ban đầu của bạn.
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>S (Kết quả thực tế):</strong> Thắng = <strong>1.0</strong>, Hòa = <strong>0.5</strong>, Thua = <strong>0.0</strong>.
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>E (Xác suất kỳ vọng):</strong> Tỷ lệ thắng dự kiến dựa trên chênh lệch trình độ. Đánh bại đối thủ có mức Elo cao hơn sẽ mang lại lượng điểm cộng đột phá!
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>Hệ số K (K-Factor):</strong> K = 40 cho kỳ thủ mới (dưới 10 trận phân hạng), K = 24 cho thi đấu tiêu chuẩn, K = 18 cho cấp cao (&ge; 2000 Elo) và K = 12 cho cấp Đại sư (&ge; 2500 Elo).
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>Thưởng Chuỗi Thắng (Win Streak Bonus):</strong> Duy trì chuỗi thắng từ 3 trận liên tiếp trở lên sẽ được cộng thêm từ <strong>+2 đến +6 Elo thưởng</strong> mỗi ván.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Diversified 8 Rank Tiers */}
        <div className="space-y-3">
          <h3 className={`text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
            <Award className="w-4 h-4" />
            Hệ Thống 8 Bậc Danh Hiệu Đấu Trường
          </h3>

          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row gap-2.5 items-start sm:items-center transition-all ${tier.bgClass}`}
              >
                <div className="sm:w-64 shrink-0">
                  <div className={`text-xs font-bold tracking-tight ${tier.color}`}>
                    {tier.name}
                  </div>
                  <div className="text-[10px] font-mono opacity-75 mt-0.5">
                    Mức Elo: {tier.elo}
                  </div>
                </div>
                <div className={`text-[11px] leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {tier.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Ranked vs Training Mode Rules */}
        <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
          isDark ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-300" : "bg-blue-50 border-blue-200 text-blue-900"
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs">
            <Info className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Quy Định Chế Độ Đấu Hạng vs Luyện Tập</span>
          </div>
          <div className={`text-[11px] leading-relaxed space-y-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            <p>
              • <strong className="text-cyan-400">Đấu Hạng (Ranked AI & Online Ranked):</strong> Trận đấu cạnh tranh công bằng. Kết quả trực tiếp cập nhật điểm Elo và thứ hạng Đấu Trường. <strong>Nghiêm cấm và khóa hoàn toàn tính năng Lùi Nước (Undo) & Gợi Ý Nước Đi (AI Hint)</strong>.
            </p>
            <p>
              • <strong className="text-emerald-400">Luyện Tập (Training AI) & Đấu Đôi (PVP):</strong> Không gian rèn luyện chiến thuật tự do. Điểm Elo được bảo lưu tuyệt đối (0 Elo thay đổi). Kỳ thủ được <strong>toàn quyền sử dụng Lùi Nước và nhận Gợi Ý phân tích nước cờ tối ưu từ AI</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
