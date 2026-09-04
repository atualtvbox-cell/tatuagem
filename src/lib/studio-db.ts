import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Photo = {
  id: string;
  url: string;
  caption: string | null;
  kind: string;
  sort_order: number;
};

export type StudioInfo = {
  id: string;
  name: string;
  phone: string;
  address: string;
  hours: string;
  about: string;
};

export type FinanceEntry = {
  id: string;
  description: string;
  entry_type: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  payment_method: string;
  account_name: string;
};

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "Boleto"];

export function useStudioInfo() {
  return useQuery({
    queryKey: ["studio_info"],
    queryFn: async (): Promise<StudioInfo | null> => {
      const { data, error } = await supabase
        .from("studio_info")
        .select("id, name, phone, address, hours, about")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePhotos() {
  return useQuery({
    queryKey: ["photos"],
    queryFn: async (): Promise<Photo[]> => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, url, caption, kind, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinanceEntries() {
  return useQuery({
    queryKey: ["finance_entries"],
    queryFn: async (): Promise<FinanceEntry[]> => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("id, description, entry_type, amount, due_date, paid, payment_method, account_name")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return (key: string) => qc.invalidateQueries({ queryKey: [key] });
}

export function whatsappLink(number: string, message: string) {
  const digits = (number || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
