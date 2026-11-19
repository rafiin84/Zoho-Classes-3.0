import Link from "next/link";
export default function NotFound() {
  return <div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="text-display">Page not found</h1><p className="mt-2 text-text-2">That screen doesn't exist in the prototype.</p><Link className="mt-6 inline-block rounded-full bg-primary px-5 py-3 font-semibold text-primary-fg" href="/student/home">Back to the app</Link></div>;
}
