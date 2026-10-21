import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/partner-logo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const path = params.get("path");
        const name = params.get("name");
        if (!path || path.includes("..")) {
          return new Response("Invalid path", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Anexos só são servidos se pertencem a um parceiro ativo.
        if (path.startsWith("attachments/")) {
          const { data: row } = await supabaseAdmin
            .from("partner_attachments")
            .select("id, partners!inner(is_active)")
            .eq("file_path", path)
            .eq("partners.is_active", true)
            .maybeSingle();
          if (!row) return new Response("Not found", { status: 404 });
        }

        const { data, error } = await supabaseAdmin.storage.from("partner-logos").download(path);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        const headers: Record<string, string> = {
          "Content-Type": data.type || "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        };
        if (name) {
          const ext = path.split(".").pop();
          const filename = name.includes(".") || !ext ? name : `${name}.${ext}`;
          headers["Content-Disposition"] =
            `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
        }
        return new Response(await data.arrayBuffer(), { headers });
      },
    },
  },
});
