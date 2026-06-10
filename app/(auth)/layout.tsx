export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#7F77DD] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">CourseForge</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">AI-powered adaptive learning</p>
        </div>
        {children}
      </div>
    </div>
  );
}
