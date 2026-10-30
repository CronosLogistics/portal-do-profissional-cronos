import { criarIdCliente } from "@/lib/client-id";
import { attachmentUrl } from "@/lib/partners.functions";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/categories";

type Attachment = {
  id: string;
  name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function PartnerAttachments({ partnerId }: { partnerId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase
      .from("partner_attachments")
      .select("id, name, file_path, mime_type, size_bytes, sort_order")
      .eq("partner_id", partnerId)
      .order("sort_order")
      .order("created_at");
    setItems((data as Attachment[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  async function upload(files: FileList) {
    setUploading(true);
    let order = items.length;
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} passa de 10 MB.`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `attachments/${partnerId}/${criarIdCliente()}.${ext}`;
      const { error } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, file.type ? { contentType: file.type } : {});
      if (error) {
        toast.error(`Não foi possível enviar ${file.name}.`);
        continue;
      }
      const { error: insertError } = await supabase.from("partner_attachments").insert({
        partner_id: partnerId,
        name: file.name.replace(/\.[^.]+$/, ""),
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        sort_order: order++,
      });
      if (insertError) toast.error(`Não foi possível registrar ${file.name}.`);
    }
    setUploading(false);
    if (input.current) input.current.value = "";
    await load();
    toast.success("Anexos atualizados.");
  }

  async function rename(item: Attachment, name: string) {
    if (name.trim() === item.name) return;
    const { error } = await supabase
      .from("partner_attachments")
      .update({ name: name.trim() || item.name })
      .eq("id", item.id);
    if (error) toast.error("Não foi possível renomear.");
    else toast.success("Nome salvo.");
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setItems(next);
    await Promise.all(
      next.map((item, i) =>
        supabase.from("partner_attachments").update({ sort_order: i }).eq("id", item.id),
      ),
    );
  }

  async function remove(item: Attachment) {
    if (!confirm(`Remover o anexo "${item.name}"?`)) return;
    await supabase.storage.from("partner-logos").remove([item.file_path]);
    const { error } = await supabase.from("partner_attachments").delete().eq("id", item.id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  }

  return (
    <section className="glass-card mt-6 grid gap-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Anexos</h2>
          <p className="text-xs text-muted-foreground">
            PDFs, imagens ou documentos de até 10 MB. Aparecem na página do parceiro.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          <Paperclip className="mr-1.5 h-4 w-4" />
          {uploading ? "Enviando..." : "Anexar arquivos"}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2"
            >
              <FileText className="ml-1 h-4 w-4 shrink-0 text-primary" />
              <Input
                defaultValue={item.name}
                onBlur={(event) => void rename(item, event.target.value)}
                className="h-9 min-w-[10rem] flex-1"
                aria-label="Nome do anexo"
              />
              <span className="text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</span>
              <a
                href={attachmentUrl(item.file_path, item.name)}
                target="_blank"
                rel="noreferrer noopener"
                className="px-2 text-xs text-primary hover:underline"
              >
                Abrir
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={() => move(index, -1)} title="Subir">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => move(index, 1)} title="Descer">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} title="Remover">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
