import type { LucideIcon } from "lucide-react";
import { getIcon } from "@/components/clube/ContentIcon";
export { getIcon };

export type CategoryRow = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order?: number;
  is_active?: boolean;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  icon: LucideIcon;
};

export function toCategory(row: CategoryRow): Category {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    iconName: row.icon,
    icon: getIcon(row.icon),
  };
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isNew(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < 1000 * 60 * 60 * 24 * 45;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
