import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPageContent = createServerFn({ method: "GET" })
  .inputValidator((d: { pageKey: string }) => z.object({ pageKey: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: row } = await sb
      .from("page_content")
      .select("content,colors")
      .eq("page_key", data.pageKey)
      .maybeSingle();
    return {
      content: (row?.content as Record<string, string>) ?? {},
      colors: (row?.colors as Record<string, string>) ?? {},
    };
  });

export const getAllPageContent = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.from("page_content").select("page_key,content,colors");
  return data ?? [];
});
