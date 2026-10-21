"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold">Çalışma alanı açılamadı</h1>
      <p className="text-sm text-muted-foreground">
        Geçici bir sorun oluştu. Yeniden denediğinizde bu oturumdaki bilgiler
        sıfırlanabilir.
      </p>
      <Button onClick={reset}>Yeniden dene</Button>
    </main>
  );
}
