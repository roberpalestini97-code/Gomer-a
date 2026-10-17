"use client";

import { useRef } from "react";
import { switchWorkshop } from "@/app/actions/workshop";

export function WorkshopSwitcher({ activeId, options }: { activeId: string; options: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={switchWorkshop} className="min-w-0 flex-1">
      <select
        name="workshopId"
        defaultValue={activeId}
        aria-label="Taller activo"
        className="input py-1.5 text-sm font-semibold"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}
