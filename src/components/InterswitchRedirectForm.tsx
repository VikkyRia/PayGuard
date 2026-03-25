import { useEffect, useRef } from "react";

export function InterswitchRedirectForm({ params }: { params: any }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (params && formRef.current) {
      formRef.current.submit();
    }
  }, [params]);

  if (!params) return null;

  return (
    <form
      ref={formRef}
      method="POST"
      action={params.payment_url}
      className="hidden"
    >
      {Object.entries(params).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value as string} />
      ))}
    </form>
  );
}
