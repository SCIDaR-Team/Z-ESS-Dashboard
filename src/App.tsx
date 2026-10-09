import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useData } from '@/state/dataContext';
import { HomePage } from '@/dashboard/HomePage';
import { LineListPage } from '@/dashboard/LineListPage';
import { SupervisoryPage } from '@/dashboard/SupervisoryPage';

export default function App() {
  const data = useData();

  if (data.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[#F6F7F9] text-[#4A5872]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading data…
      </div>
    );
  }
  if (data.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7F9] px-6 text-center">
        <p className="font-semibold text-[#0F1B2D]">The data could not be loaded.</p>
        <p className="mt-1 text-sm text-[#4A5872]">{data.message}</p>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage ds={data.data} />} />
      <Route path="/line-list" element={<LineListPage ds={data.data} />} />
      <Route path="/supervisory" element={<SupervisoryPage ds={data.data} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
