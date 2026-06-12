export function Dashboard() {
  const metrics = [
    { label: "Health Score", value: "87%" },
    { label: "Active MAPs", value: "23" },
    { label: "Overdue Tasks", value: "5" },
    { label: "Fine Exposure", value: "$2.4M" },
  ];

  const regulations = [
    { source: "RBI", name: "KYC Amendment 2026", date: "2026-05-15", status: "Active" },
    { source: "SEBI", name: "AML Guideline Update", date: "2026-05-10", status: "Pending" },
    { source: "IRDAI", name: "Data Protection Circular", date: "2026-05-05", status: "Active" },
    { source: "RBI", name: "Risk Management Framework", date: "2026-04-28", status: "Overdue" },
  ];

  const departments = [
    { name: "KYC", progress: 85 },
    { name: "AML", progress: 72 },
    { name: "InfoSec", progress: 90 },
    { name: "Risk", progress: 65 },
    { name: "Ops", progress: 78 },
  ];

  const fineExposure = [
    { domain: "KYC Violations", amount: "$980K" },
    { domain: "AML Gaps", amount: "$720K" },
    { domain: "Data Privacy", amount: "$500K" },
    { domain: "Reporting Delays", amount: "$200K" },
  ];

  const overdueAlerts = [
    { task: "Customer Due Diligence Review", days: "12 days" },
    { task: "Transaction Monitoring Report", days: "8 days" },
    { task: "Policy Update Approval", days: "5 days" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold">DASHBOARD</h1>
        <div className="border-2 border-black px-4 py-2">2026-05-22</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="border-2 border-black p-6">
            <div className="text-sm mb-2">{metric.label}</div>
            <div className="text-3xl font-bold">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border-2 border-black p-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            RECENT REGULATIONS
          </h2>
          <div className="space-y-3">
            {regulations.map((reg, idx) => (
              <div key={idx} className="border-2 border-black p-3">
                <div className="flex items-start gap-3">
                  <div className="border-2 border-black px-2 py-1 text-xs">
                    {reg.source}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{reg.name}</div>
                    <div className="text-sm mt-1">{reg.date}</div>
                  </div>
                  <div className="border-2 border-black px-2 py-1 text-xs">
                    {reg.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            DEPARTMENT PROGRESS
          </h2>
          <div className="flex items-end justify-around h-64 border-b-2 border-black">
            {departments.map((dept, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="text-sm font-bold">{dept.progress}%</div>
                <div
                  className="w-16 bg-black"
                  style={{ height: `${dept.progress}%` }}
                ></div>
                <div className="text-sm mt-2">{dept.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="border-2 border-black p-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            FINE EXPOSURE BY DOMAIN
          </h2>
          <div className="space-y-2">
            {fineExposure.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-black pb-2">
                <div className="text-sm">{item.domain}</div>
                <div className="font-bold">{item.amount}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            OVERDUE ALERTS
          </h2>
          <div className="space-y-3">
            {overdueAlerts.map((alert, idx) => (
              <div key={idx} className="border-2 border-black p-2">
                <div className="text-sm font-bold">{alert.task}</div>
                <div className="text-xs mt-1">{alert.days}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-6">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
            OVERALL HEALTH SCORE
          </h2>
          <div className="flex items-center justify-center h-32">
            <div className="text-6xl font-bold">87%</div>
          </div>
          <div className="text-center text-sm mt-4 border-t-2 border-black pt-4">
            Based on 23 active compliance metrics
          </div>
        </div>
      </div>
    </div>
  );
}
