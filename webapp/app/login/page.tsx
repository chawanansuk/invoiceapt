import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">ระบบจัดการหอพัก</h1>
          <p className="text-slate-500 text-sm mt-1">อพาร์ทเม้นท์ มั่งมีทวีสุข</p>
        </div>
        <LoginForm />
        <p className="text-xs text-slate-400 text-center mt-6">
          ผู้ใช้เริ่มต้น: admin / admin1234
        </p>
      </div>
    </main>
  );
}
