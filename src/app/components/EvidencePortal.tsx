export function EvidencePortal() {
  const submissions = [
    {
      mapId: "MAP-2026-087",
      task: "Customer Risk Classification Update",
      verdict: "Pass",
      files: ["risk_matrix_v2.xlsx", "validation_report.pdf"],
      aiVerdict:
        "All requirements met. Risk scoring parameters align with RBI/2026/15 guidelines. Documentation is complete and properly formatted.",
      gaps: [],
    },
    {
      mapId: "MAP-2026-084",
      task: "Transaction Monitoring Threshold Review",
      verdict: "Warning",
      files: ["threshold_analysis.xlsx"],
      aiVerdict:
        "Partial compliance detected. Analysis covers required metrics but missing approval signatures from compliance head.",
      gaps: ["Missing approval signature", "Incomplete stakeholder review section"],
    },
    {
      mapId: "MAP-2026-079",
      task: "Data Encryption Audit Report",
      verdict: "Fail",
      files: ["encryption_audit.pdf"],
      aiVerdict:
        "Critical gaps identified. Audit does not cover all customer data storage systems. Missing testing results for access controls.",
      gaps: [
        "Incomplete system coverage (only 60% audited)",
        "No access control testing evidence",
        "Missing remediation timeline",
      ],
    },
  ];

  const chatLog = [
    { sender: "AI", message: "Please clarify the scope of systems audited in section 3.2" },
    {
      sender: "KYC Dept",
      message: "We audited primary customer database and document storage systems",
    },
    {
      sender: "AI",
      message: "What about the legacy archive system mentioned in your infrastructure diagram?",
    },
    {
      sender: "KYC Dept",
      message: "That system is scheduled for decommissioning next quarter",
    },
    {
      sender: "AI",
      message: "Noted. Please provide decommissioning timeline documentation as supplementary evidence.",
    },
  ];

  const stats = [
    { label: "Total Submissions", value: "156" },
    { label: "Approved", value: "89" },
    { label: "Pending Review", value: "23" },
    { label: "Rejected", value: "12" },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-bold mb-8 border-b-2 border-black pb-4">
          EVIDENCE UPLOAD PORTAL
        </h1>

        <div className="border-2 border-black p-12 mb-8 text-center border-dashed">
          <div className="text-xl mb-4">Drop files here or click to browse</div>
          <button className="border-2 border-black px-6 py-3 bg-black text-white">
            UPLOAD EVIDENCE
          </button>
        </div>

        <div className="space-y-6">
          {submissions.map((sub, idx) => (
            <div key={idx} className="border-2 border-black p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs mb-1 border-2 border-black px-2 py-1 inline-block">
                    {sub.mapId}
                  </div>
                  <div className="font-bold text-lg mt-2">{sub.task}</div>
                </div>
                <div
                  className={`border-2 border-black px-3 py-1 ${
                    sub.verdict === "Pass"
                      ? "bg-black text-white"
                      : sub.verdict === "Warning"
                      ? "bg-white"
                      : "bg-white"
                  }`}
                >
                  {sub.verdict}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {sub.files.map((file, i) => (
                  <div key={i} className="border-2 border-black px-3 py-1 text-sm">
                    {file}
                  </div>
                ))}
              </div>

              <div className="border-2 border-black p-4 mb-4 bg-white">
                <div className="text-xs font-bold mb-2">AI VERDICT</div>
                <div className="text-sm mb-3">{sub.aiVerdict}</div>
                {sub.gaps.length > 0 && (
                  <div className="border-t-2 border-black pt-3">
                    <div className="text-xs font-bold mb-2">GAPS IDENTIFIED</div>
                    <ul className="text-sm space-y-1">
                      {sub.gaps.map((gap, i) => (
                        <li key={i}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button className="border-2 border-black px-4 py-2 bg-black text-white">
                  Approve
                </button>
                <button className="border-2 border-black px-4 py-2 bg-white">
                  Request Revision
                </button>
                <button className="border-2 border-black px-4 py-2 bg-white">
                  Ask AI
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-96 border-l-2 border-black p-6 space-y-6">
        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-4 border-b-2 border-black pb-2">
            AI CROSS-QUESTIONING
          </h3>
          <div className="space-y-3 text-sm">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 border-2 border-black ${
                  msg.sender === "AI" ? "bg-white" : "bg-black text-white"
                }`}
              >
                <div className="text-xs font-bold mb-1">{msg.sender}</div>
                <div>{msg.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-4">
          <h3 className="font-bold mb-4 border-b-2 border-black pb-2">
            SUBMISSION STATS
          </h3>
          <div className="space-y-3">
            {stats.map((stat, idx) => (
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
