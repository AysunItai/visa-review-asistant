import Link from "next/link";
import { FileSearch } from "lucide-react";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <FileSearch className="size-10 text-primary" />
      <p className="eyebrow">VİZELENS</p>
      <h1 className="text-2xl font-semibold">Bu sayfa bulunamadı</h1>
      <p className="text-sm text-muted-foreground">
        Başvuru inceleme çalışma alanına dönerek devam edebilirsiniz.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-5 py-3 text-sm text-white"
      >
        Çalışma alanına dön
      </Link>
    </main>
  );
}
