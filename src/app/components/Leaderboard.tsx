import { useState } from "react";

export function Leaderboard() {
  const [activePeriod, setActivePeriod] = useState("This Month");

  const topThree = [
    { rank: 1, name: "Information Security", score: 95 },
    { rank: 2, name: "KYC & Onboarding", score: 89 },
    { rank: 3, name: "Anti-Money Laundering", score: 85 },
  ];

  const allDepartments = [
    {
      rank: 1,
      name: "Information Security",
      subtitle: "Data & Systems Protection",
      score: 95,
      tasksDone: "48/50",
      progress: 96,
      trend: "up",
    },
    {
      rank: 2,
      name: "KYC & Onboarding",
      subtitle: "Customer Verification",
      score: 89,
      tasksDone: "42/48",
      progress: 88,
      trend: "up",
    },
    {
      rank: 3,
      name: "Anti-Money Laundering",
      subtitle: "Transaction Monitoring",
      score: 85,
      tasksDone: "38/45",
      progress: 84,
      trend: "stable",
    },
    {
      rank: 4,
      name: "Risk Management",
      subtitle: "Enterprise Risk",
      score: 78,
      tasksDone: "35/46",
      progress: 76,
      trend: "down",
    },
    {
      rank: 5,
      name: "Operations",
      subtitle: "Process Compliance",
      score: 75,
      tasksDone: "30/42",
      progress: 71,
      trend: "up",
    },
    {
      rank: 6,
      name: "Legal & Regulatory",
      subtitle: "Policy Framework",
      score: 72,
      tasksDone: "28/40",
      progress: 70,
      trend: "stable",
    },
    {
      rank: 7,
      name: "Internal Audit",
      subtitle: "Audit & Review",
      score: 68,
      tasksDone: "25/38",
      progress: 66,
      trend: "down",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold mb-4">DEPARTMENT LEADERBOARD</h1>
        <div className="flex gap-2">
          {["This Week", "This Month", "Q2"].map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`px-4 py-2 border-2 border-black ${
                activePeriod === period ? "bg-black text-white" : "bg-white"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-12 flex items-end justify-center gap-8 h-80">
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold mb-2">{topThree[1].score}</div>
          <div className="w-40 h-48 border-2 border-black flex flex-col items-center justify-center bg-white">
            <div className="text-6xl font-bold mb-2">2</div>
            <div className="text-center px-2 font-bold">{topThree[1].name}</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold mb-2">{topThree[0].score}</div>
          <div className="w-40 h-64 border-2 border-black flex flex-col items-center justify-center bg-black text-white">
            <div className="text-6xl font-bold mb-2">1</div>
            <div className="text-center px-2 font-bold">{topThree[0].name}</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold mb-2">{topThree[2].score}</div>
          <div className="w-40 h-40 border-2 border-black flex flex-col items-center justify-center bg-white">
            <div className="text-6xl font-bold mb-2">3</div>
            <div className="text-center px-2 font-bold">{topThree[2].name}</div>
          </div>
        </div>
      </div>

      <div className="border-2 border-black">
        <div className="grid grid-cols-6 border-b-2 border-black bg-black text-white p-3 font-bold">
          <div>RANK</div>
          <div className="col-span-2">DEPARTMENT</div>
          <div>SCORE</div>
          <div>PROGRESS</div>
          <div>TREND</div>
        </div>

        {allDepartments.map((dept, idx) => (
          <div
            key={idx}
            className="grid grid-cols-6 border-b-2 border-black p-4 items-center"
          >
            <div className="text-2xl font-bold">{dept.rank}</div>
            <div className="col-span-2">
              <div className="font-bold">{dept.name}</div>
              <div className="text-sm">{dept.subtitle}</div>
            </div>
            <div className="text-xl font-bold">{dept.score}</div>
            <div>
              <div className="text-sm mb-1">{dept.tasksDone}</div>
              <div className="border-2 border-black h-4 w-full">
                <div
                  className="bg-black h-full"
                  style={{ width: `${dept.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="text-2xl">
              {dept.trend === "up" && "↑"}
              {dept.trend === "down" && "↓"}
              {dept.trend === "stable" && "→"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
