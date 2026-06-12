import { useState } from "react";

export function TaskFeed() {
  const [activeFilter, setActiveFilter] = useState("All");

  const messages = [
    {
      type: "ai",
      task: {
        title: "Update Customer Risk Classification Matrix",
        department: "KYC",
        priority: "High",
        deadline: "2026-05-25",
        description: "Review and update risk scoring parameters based on new RBI guidelines for enhanced due diligence.",
        checklist: [
          "Review RBI Circular RBI/2026/15",
          "Update risk scoring matrix in compliance system",
          "Document changes in MAP tracker",
        ],
      },
    },
    {
      type: "user",
      text: "Can you clarify the specific parameters that need updating?",
    },
    {
      type: "ai",
      task: {
        title: "Transaction Monitoring Threshold Review",
        department: "AML",
        priority: "Medium",
        deadline: "2026-05-28",
        description: "Adjust monitoring thresholds for suspicious transaction alerts based on recent false positive analysis.",
        checklist: [
          "Analyze last quarter false positive rate",
          "Propose new threshold values",
          "Submit for approval to compliance head",
        ],
      },
    },
    {
      type: "ai",
      task: {
        title: "Data Encryption Audit",
        department: "InfoSec",
        priority: "Critical",
        deadline: "2026-05-23",
        description: "Conduct comprehensive audit of data encryption protocols across all customer data storage systems.",
        checklist: [
          "Verify encryption standards compliance",
          "Test data access controls",
          "Generate audit report",
        ],
      },
    },
  ];

  const myTasks = [
    { title: "Policy Review - KYC", deadline: "2026-05-24" },
    { title: "Evidence Upload - AML-003", deadline: "2026-05-26" },
    { title: "Risk Assessment - InfoSec", deadline: "2026-05-29" },
  ];

  const evidenceRequired = [
    "Customer verification logs",
    "Transaction monitoring reports",
    "Policy acknowledgment forms",
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col border-r-2 border-black">
        <div className="p-6 border-b-2 border-black">
          <h1 className="text-3xl font-bold mb-4">TASK FEED</h1>
          <div className="flex gap-2">
            {["All", "KYC", "AML", "InfoSec"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 border-2 border-black ${
                  activeFilter === filter ? "bg-black text-white" : "bg-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.type === "ai" && msg.task && (
                <div className="border-2 border-black p-4 bg-white">
                  <div className="text-xs mb-2">AI COMPLIANCE AGENT</div>
                  <div className="border-2 border-black p-4">
                    <div className="font-bold text-lg mb-3">{msg.task.title}</div>
                    <div className="flex gap-2 mb-3">
                      <div className="border-2 border-black px-2 py-1 text-xs">
                        {msg.task.department}
                      </div>
                      <div className="border-2 border-black px-2 py-1 text-xs">
                        {msg.task.priority}
                      </div>
                      <div className="border-2 border-black px-2 py-1 text-xs">
                        Due: {msg.task.deadline}
                      </div>
                    </div>
                    <p className="text-sm mb-4">{msg.task.description}</p>
                    <div className="border-t-2 border-black pt-3 mb-4">
                      {msg.task.checklist.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 mb-2">
                          <div className="w-4 h-4 border-2 border-black mt-1"></div>
                          <div className="text-sm">{item}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="border-2 border-black px-4 py-2 bg-black text-white">
                        Acknowledge
                      </button>
                      <button className="border-2 border-black px-4 py-2 bg-white">
                        Ask AI
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {msg.type === "user" && (
                <div className="flex justify-end">
                  <div className="border-2 border-black p-3 bg-white max-w-md">
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t-2 border-black">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border-2 border-black p-2"
            />
            <button className="border-2 border-black px-6 py-2 bg-black text-white">
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="w-80 p-6 space-y-6">
        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-3 border-b-2 border-black pb-2">MY TASKS</h3>
          <div className="space-y-2">
            {myTasks.map((task, idx) => (
              <div key={idx} className="border-2 border-black p-2">
                <div className="text-sm font-bold">{task.title}</div>
                <div className="text-xs mt-1">{task.deadline}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-3 border-b-2 border-black pb-2">
            SOURCE CIRCULAR
          </h3>
          <div className="text-sm space-y-2">
            <div>
              <strong>ID:</strong> RBI/2026/15
            </div>
            <div>
              <strong>Date:</strong> 2026-05-15
            </div>
            <div>
              <strong>Type:</strong> KYC Amendment
            </div>
          </div>
        </div>

        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-3 border-b-2 border-black pb-2">
            EVIDENCE REQUIRED
          </h3>
          <div className="space-y-2">
            {evidenceRequired.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="text-sm">•</div>
                <div className="text-sm">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
