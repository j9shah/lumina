import { SignUpForm } from "@/components/auth/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#0d0d0d] relative">
      <Link 
        href="/" 
        className="absolute top-6 left-6 text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
