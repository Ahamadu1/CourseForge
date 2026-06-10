export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Nav */}
      <div className="h-14 bg-white border-b border-gray-100" />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 px-4 pt-8 pb-6 animate-pulse">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="h-7 bg-gray-200 rounded-lg w-2/3" />
            <div className="h-6 bg-gray-100 rounded-full w-24 flex-shrink-0" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-7" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="h-12 bg-white border-b border-gray-100" />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3 animate-pulse">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white rounded-xl"
            style={{ border: "0.5px solid #E5E7EB" }}
          />
        ))}
      </div>
    </div>
  );
}
