import { useState } from "react";

export function AuditTrail() {
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");

  const events = [
    {
      date: "2026-05-22",
      items: [
        {
          action: "Evidence Submitted",
          user: "Priya Sharma",
          department: "KYC",
          timestamp: "14:32:15",
          details: {
            mapId: "MAP-2026-087",
            files: ["risk_matrix_v2.xlsx", "validation_report.pdf"],
            hash: "a7f8e9d2c1b4...",
          },
        },
        {
          action: "Task Acknowledged",
          user: "Rajesh Kumar",
          department: "AML",
          timestamp: "11:15:42",
          details: {
            taskId: "TASK-2026-156",
            mapId: "MAP-2026-084",
            hash: "b3e5f7a9d2c8...",
          },
        },
      ],
    },
    {
      date: "2026-05-21",
      items: [
        {
          action: "Approval Granted",
          user: "System Admin",
          department: "InfoSec",
          timestamp: "16:48:23",
          details: {
            mapId: "MAP-2026-079",
            approver: "Sunita Mehta",
            hash: "c9f2e4a6b7d1...",
          },
        },
        {
          action: "MAP Created",
          user: "AI Agent",
          department: "Risk",
          timestamp: "09:22:11",
          details: {
            mapId: "MAP-2026-091",
            source: "RBI/2026/15",
            hash: "d4a7b9e3f1c5...",
          },
        },
        {
          action: "Evidence Rejected",
          user: "Compliance Head",
          department: "KYC",
          timestamp: "08:05:37",
          details: {
            mapId: "MAP-2026-083",
            reason: "Incomplete documentation",
            hash: "e6c8f2a4d9b3...",
          },
        },
      ],
    },
    {
      date: "2026-05-20",
      items: [
        {
          action: "Task Completed",
          user: "Amit Patel",
          department: "AML",
          timestamp: "17:14:55",
          details: {
            taskId: "TASK-2026-142",
            mapId: "MAP-2026-076",
            hash: "f1d7e5c3a8b2...",
          },
        },
      ],
    },
  ];

  const activityStats = [
    { label: "Total Events", value: "1,247" },
    { label: "Today", value: "23" },
    { label: "This Week", value: "156" },
    { label: "Chain Verified", value: "100%" },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 border-b-2 border-black pb-4">
          IMMUTABLE AUDIT TRAIL
        </h1>

        <div className="mb-6 flex gap-4">
          <div>
            <div className="text-xs mb-2 font-bold">DEPARTMENT</div>
            <div className="flex gap-2">
              {["All", "KYC", "AML", "InfoSec", "Risk"].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1 border-2 border-black text-sm ${
                    departmentFilter === dept ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs mb-2 font-bold">ACTION TYPE</div>
            <div className="flex gap-2">
              {["All", "Submit", "Approve", "Create", "Complete"].map((action) => (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={`px-3 py-1 border-2 border-black text-sm ${
                    actionFilter === action ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {events.map((dateGroup, idx) => (
            <div key={idx}>
              <div className="font-bold mb-4 border-2 border-black px-3 py-2 inline-block">
                {dateGroup.date}
              </div>

              <div className="relative pl-8 space-y-6">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-black"></div>

                {dateGroup.items.map((event, eventIdx) => (
                  <div key={eventIdx} className="relative">
                    <div className="absolute left-[-33px] w-4 h-4 border-2 border-black bg-white rounded-full"></div>

                    <div className="border-2 border-black p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-lg">{event.action}</div>
                        <div className="text-xs border-2 border-black px-2 py-1">
                          {event.timestamp}
                        </div>
                      </div>

                      <div className="text-sm mb-3">
                        <span className="font-bold">{event.user}</span>
                        {" • "}
                        <span className="border-2 border-black px-2 py-1 text-xs ml-1">
                          {event.department}
                        </span>
                      </div>

                      <details className="border-t-2 border-black pt-3">
                        <summary className="cursor-pointer text-sm font-bold mb-2">
                          View Technical Details
                        </summary>
                        <div className="bg-white border-2 border-black p-3 text-xs font-mono mt-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-bold">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-96 border-l-2 border-black p-6 space-y-6">
        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-4 border-b-2 border-black pb-2">
            HASH / INTEGRITY
          </h3>
          <div className="space-y-4 text-xs">
            <div>
              <div className="font-bold mb-1">Current Block Hash</div>
              <div className="font-mono border-2 border-black p-2 break-all">
                0x7f8e9d2c1b4a3f5e6d8c9b2a1f3e5d7c9b4a2f6e8d1c3b5a7f9e2d4c6b8a1f3e
              </div>
            </div>

            <div>
              <div className="font-bold mb-1">Previous Block Hash</div>
              <div className="font-mono border-2 border-black p-2 break-all">
                0x3e5f7a9d2c8b1f4e6d7c9a2b3f5e8d1c4a6b9f2e7d5c8a1b4f6e9d2c7b5a3f1e
              </div>
            </div>

            <div>
              <div className="font-bold mb-1">Merkle Root</div>
              <div className="font-mono border-2 border-black p-2 break-all">
                0x9f2e4a6b7d1c5a3f8e2d6c9b4a1f7e5d3c8b2a6f4e9d1c7b5a3f2e8d6c4a9b1f
              </div>
            </div>

            <div className="border-t-2 border-black pt-3">
              <div className="font-bold mb-2">Chain Verification Status</div>
              <div className="border-2 border-black p-2 text-center bg-black text-white">
                VERIFIED ✓
              </div>
            </div>

            <div className="text-xs">
              Last verification: 2026-05-22 14:35:42
            </div>
          </div>
        </div>

        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-4 border-b-2 border-black pb-2">
            ACTIVITY STATS
          </h3>
          <div className="space-y-3">
            {activityStats.map((stat, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="text-sm">{stat.label}</div>
                <div className="text-xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
