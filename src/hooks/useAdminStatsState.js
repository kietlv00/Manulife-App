import { useState, useMemo } from "react";

export function useAdminStatsState({ subjectList }) {
  const [adminResults, setAdminResults] = useState([]);
  const [searchAgentFilter, setSearchAgentFilter] = useState("");
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [statsPage, setStatsPage] = useState(1);
  const [statsPageSize, setStatsPageSize] = useState(10);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const STATS_PAGE_SIZE_OPTIONS = [10, 50, 100];

  const periodAdminResults = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    if (statsPeriod === "last3months") start.setMonth(start.getMonth() - 2);
    else if (statsPeriod === "year") start.setMonth(0);
    else if (statsPeriod === "all") return adminResults;

    return adminResults.filter((row) => {
      if (!row.created_at) return false;
      const createdAt = new Date(row.created_at);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start;
    });
  }, [adminResults, statsPeriod]);

  const filteredAdminResults = useMemo(() => {
    const term = searchAgentFilter.trim().toLowerCase();
    return periodAdminResults.filter((row) =>
      [row.agent_code, row.student_name, row.exam_name]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(term)),
    );
  }, [periodAdminResults, searchAgentFilter]);

  const statsPageCount = Math.max(
    1,
    Math.ceil(filteredAdminResults.length / statsPageSize),
  );
  const paginatedAdminResults = filteredAdminResults.slice(
    (statsPage - 1) * statsPageSize,
    statsPage * statsPageSize,
  );

  const subjectStats = useMemo(() => {
    const counts = new Map();
    periodAdminResults.forEach((row) => {
      const subjectId = row.subject_id || "other";
      const subjectName =
        subjectList.find((item) => item.id === subjectId)?.name || subjectId;
      counts.set(subjectName, (counts.get(subjectName) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodAdminResults, subjectList]);

  const passedCount = periodAdminResults.filter((row) => row.passed).length;
  const passRate = periodAdminResults.length
    ? Math.round((passedCount / periodAdminResults.length) * 100)
    : 0;

  const weeklyStats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const weekdays = [
        "Chủ nhật",
        "Thứ 2",
        "Thứ 3",
        "Thứ 4",
        "Thứ 5",
        "Thứ 6",
        "Thứ 7",
      ];

      return {
        key,
        dateLabel: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
        weekdayLabel: weekdays[date.getDay()],
        isToday: index === 6,
        count: 0,
      };
    });

    const dayCounts = new Map(days.map((day) => [day.key, day]));
    periodAdminResults.forEach((row) => {
      if (!row.created_at) return;
      const date = new Date(row.created_at);
      if (Number.isNaN(date.getTime())) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const day = dayCounts.get(key);
      if (day) day.count += 1;
    });

    return days;
  }, [periodAdminResults]);

  return {
    adminResults,
    setAdminResults,
    searchAgentFilter,
    setSearchAgentFilter,
    isFetchingStats,
    setIsFetchingStats,
    statsPage,
    setStatsPage,
    statsPageSize,
    setStatsPageSize,
    statsPeriod,
    setStatsPeriod,
    STATS_PAGE_SIZE_OPTIONS,
    periodAdminResults,
    filteredAdminResults,
    statsPageCount,
    paginatedAdminResults,
    subjectStats,
    passedCount,
    passRate,
    weeklyStats,
  };
}
