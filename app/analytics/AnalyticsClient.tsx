"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Exported types (imported by server page) ─────────────────────────────────

export interface TimelinePoint {
  date: string;
  cumulative: number;
}

export interface QuizHistoryItem {
  date: string;
  score: number;
  passed: boolean;
  lessonTitle: string;
}

export interface TopicMasteryItem {
  topic: string;
  status: "mastered" | "developing" | "weak";
  occurrences: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface AnalyticsData {
  courseTitle: string;
  difficultyLevel: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  avgQuizScore: number | null;
  currentStreak: number;
  hoursInvested: number;
  progressTimeline: TimelinePoint[];
  quizHistory: QuizHistoryItem[];
  topicMastery: TopicMasteryItem[];
  mostActiveDay: string | null;
  bestStudyHour: number | null;
  lessonsLastWeek: number;
  achievements: Achievement[];
  insight: string;
  rollingScore: number | null;
  adaptiveDifficultyLevel: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#1D9E75";
  if (score >= 60) return "#EF9F27";
  return "#D85A30";
}

function formatHour(h: number): string {
  if (h === 0) return "midnight";
  if (h < 12) return `${h}am`;
  if (h === 12) return "noon";
  return `${h - 12}pm`;
}

// ─── Chart wrappers (SSR-safe via mounted flag) ───────────────────────────────

function ProgressChart({ data }: { data: TimelinePoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />;

  if (data.every((d) => d.cumulative === 0)) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-gray-400">Complete your first lesson to see progress here</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#7F77DD" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: "0.5px solid #E5E7EB", padding: "6px 10px" }}
          labelStyle={{ fontWeight: 600, color: "#374151" }}
          formatter={(v) => [v as number, "lessons"]}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#7F77DD"
          strokeWidth={2}
          fill="url(#areaGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#7F77DD", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function QuizChart({ data }: { data: QuizHistoryItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />;

  if (data.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-gray-400">Take a quiz to see your performance here</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: QuizHistoryItem }[] }) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 text-xs">
        <p className="font-semibold text-gray-800 mb-0.5 max-w-[140px] truncate">{item.lessonTitle}</p>
        <p className="text-gray-500">{item.date}</p>
        <p className="font-bold mt-1" style={{ color: scoreColor(item.score) }}>
          {item.score}% {item.passed ? "✓ Passed" : "✗ Failed"}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell key={i} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  children,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 flex flex-col gap-1" style={{ border: "0.5px solid #E5E7EB" }}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
      {children}
    </div>
  );
}

// ─── Topic mastery grid ───────────────────────────────────────────────────────

function TopicMasterySection({ topics }: { topics: TopicMasteryItem[] }) {
  const statusStyle = {
    mastered:   { bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]", dot: "#1D9E75", label: "Mastered" },
    developing: { bg: "bg-[#EF9F27]/10", text: "text-[#EF9F27]", dot: "#EF9F27", label: "Developing" },
    weak:       { bg: "bg-[#D85A30]/10", text: "text-[#D85A30]", dot: "#D85A30", label: "Needs Work" },
  };

  if (topics.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-gray-400">Topic data appears as you take quizzes</p>
      </div>
    );
  }

  const mastered   = topics.filter((t) => t.status === "mastered");
  const developing = topics.filter((t) => t.status === "developing");
  const weak       = topics.filter((t) => t.status === "weak");

  const groups = [
    { label: "Mastered", items: mastered, status: "mastered" as const },
    { label: "Developing", items: developing, status: "developing" as const },
    { label: "Needs Work", items: weak, status: "weak" as const },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const st = statusStyle[group.status];
        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.dot }} />
              <p className="text-xs font-semibold text-gray-500">{group.label}</p>
              <span className="text-[10px] text-gray-400">({group.items.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((topic, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.bg} ${st.text}`}
                >
                  {topic.topic.length > 50 ? topic.topic.slice(0, 50) + "…" : topic.topic}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────

function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl p-4 flex flex-col items-center text-center gap-1.5 transition-all ${
            a.earned
              ? "bg-white"
              : "bg-gray-50 opacity-50"
          }`}
          style={{ border: `0.5px solid ${a.earned ? "#E5E7EB" : "#F3F4F6"}` }}
        >
          <span className="text-2xl" style={{ filter: a.earned ? "none" : "grayscale(1)" }}>
            {a.icon}
          </span>
          <p className={`text-xs font-semibold ${a.earned ? "text-gray-900" : "text-gray-400"}`}>
            {a.title}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">{a.description}</p>
          {a.earned && (
            <span className="text-[9px] font-semibold text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-0.5 rounded-full">
              Earned
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const {
    courseTitle,
    lessonsCompleted,
    totalLessons,
    avgQuizScore,
    currentStreak,
    hoursInvested,
    progressTimeline,
    quizHistory,
    topicMastery,
    mostActiveDay,
    bestStudyHour,
    lessonsLastWeek,
    achievements,
    insight,
    rollingScore,
    adaptiveDifficultyLevel,
  } = data;

  const progressPct = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
  const earnedCount = achievements.filter((a) => a.earned).length;

  const adaptiveLevelLabel =
    adaptiveDifficultyLevel === "foundational"
      ? "Foundational"
      : adaptiveDifficultyLevel === "advanced"
      ? "Advanced"
      : "Standard";

  const adaptiveLevelColor =
    adaptiveDifficultyLevel === "foundational"
      ? "#1D9E75"
      : adaptiveDifficultyLevel === "advanced"
      ? "#D85A30"
      : "#7F77DD";

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Nav ── */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 z-50 h-14 flex items-center px-4">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">Analytics</span>
          <Link
            href="/tutor"
            className="ml-auto text-xs font-medium text-[#7F77DD] hover:text-[#3C3489] transition-colors"
          >
            Tutor
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Analytics</h1>
            <p className="text-sm text-gray-500 truncate max-w-xs">{courseTitle}</p>
          </div>
          {earnedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#EEEDFE] px-3 py-1.5 rounded-full flex-shrink-0">
              <span className="text-xs font-semibold text-[#3C3489]">{earnedCount} badge{earnedCount !== 1 ? "s" : ""} earned</span>
            </div>
          )}
        </div>

        {/* ── AI insight banner ── */}
        <div
          className="bg-white rounded-xl px-5 py-4 mb-6 flex items-start gap-3"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          <div className="w-8 h-8 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 3-1.6 5.5-4 6.7V18H9v-2.3C6.6 14.5 5 12 5 9a7 7 0 0 1 7-7z" />
              <line x1="9" y1="22" x2="15" y2="22" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#7F77DD] uppercase tracking-widest mb-1">
              Coach Insight
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="Lessons done"
            value={lessonsCompleted.toString()}
            sub={`of ${totalLessons} total · ${progressPct}%`}
          >
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: "#7F77DD" }}
              />
            </div>
          </StatCard>

          <StatCard
            label="Avg quiz score"
            value={avgQuizScore !== null ? `${avgQuizScore}%` : "—"}
            sub={avgQuizScore !== null
              ? avgQuizScore >= 80 ? "Strong performance"
              : avgQuizScore >= 60 ? "Good, keep going"
              : "Keep practising"
              : "No quizzes yet"}
            accent={avgQuizScore !== null ? scoreColor(avgQuizScore) : undefined}
          />

          <StatCard
            label="Current streak"
            value={currentStreak.toString()}
            sub={`day${currentStreak !== 1 ? "s" : ""} in a row${currentStreak === 0 ? " — start today!" : ""}`}
            accent={currentStreak >= 3 ? "#EF9F27" : undefined}
          />

          <StatCard
            label="Hours invested"
            value={hoursInvested > 0 ? `${hoursInvested}h` : "—"}
            sub={hoursInvested > 0 ? `${lessonsCompleted} lesson${lessonsCompleted !== 1 ? "s" : ""} completed` : "Start a lesson"}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Progress (30 days)
            </p>
            <ProgressChart data={progressTimeline} />
          </div>
          <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Quiz scores (last {quizHistory.length || "—"})
            </p>
            <QuizChart data={quizHistory} />
          </div>
        </div>

        {/* ── Topic mastery ── */}
        <div className="bg-white rounded-xl p-5 mb-6" style={{ border: "0.5px solid #E5E7EB" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Topic mastery
            </p>
            {topicMastery.length > 0 && (
              <span className="text-[10px] text-gray-400">
                {topicMastery.filter((t) => t.status === "mastered").length} mastered
                {" · "}
                {topicMastery.filter((t) => t.status === "weak").length} to reinforce
              </span>
            )}
          </div>
          <TopicMasterySection topics={topicMastery} />
        </div>

        {/* ── Learning patterns ── */}
        <div className="bg-white rounded-xl p-5 mb-6" style={{ border: "0.5px solid #E5E7EB" }}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Learning patterns
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl mb-1">📅</p>
              <p className="text-sm font-semibold text-gray-800">{mostActiveDay ?? "—"}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Most active day</p>
            </div>
            <div className="text-center">
              <p className="text-xl mb-1">⏰</p>
              <p className="text-sm font-semibold text-gray-800">
                {bestStudyHour !== null ? formatHour(bestStudyHour) : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Best study time</p>
            </div>
            <div className="text-center">
              <p className="text-xl mb-1">📈</p>
              <p className="text-sm font-semibold text-gray-800">
                {lessonsLastWeek} lesson{lessonsLastWeek !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">This week</p>
            </div>
          </div>
        </div>

        {/* ── Adaptive level (if available) ── */}
        {adaptiveDifficultyLevel && (
          <div className="bg-white rounded-xl p-5 mb-6 flex items-center justify-between" style={{ border: "0.5px solid #E5E7EB" }}>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Adaptive level
              </p>
              <p className="text-sm text-gray-600">
                Content difficulty is personalized to your performance.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0"
                style={{
                  background: adaptiveLevelColor + "1A",
                  color: adaptiveLevelColor,
                }}
              >
                {adaptiveLevelLabel}
              </span>
              {rollingScore !== null && (
                <p className="text-[10px] text-gray-400">{rollingScore}% rolling avg</p>
              )}
            </div>
          </div>
        )}

        {/* ── Achievements ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Milestones
            </p>
            <p className="text-[10px] text-gray-400">
              {earnedCount} of {achievements.length} earned
            </p>
          </div>
          <AchievementsGrid achievements={achievements} />
        </div>
      </div>
    </div>
  );
}
