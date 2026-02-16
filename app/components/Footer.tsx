import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6">
        <p className="text-xs text-gray-500">© 2026 UK Profit Calculator</p>
        <p className="mt-2 text-xs text-gray-500">
          <Link href="/terms" className="hover:text-gray-700 hover:underline transition">
            Terms
          </Link>{" "}
          •{" "}
          <Link href="/privacy" className="hover:text-gray-700 hover:underline transition">
            Privacy
          </Link>{" "}
          •{" "}
          <Link href="/disclaimer" className="hover:text-gray-700 hover:underline transition">
            Disclaimer
          </Link>
        </p>
      </div>
    </footer>
  );
}
