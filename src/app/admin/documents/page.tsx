"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import type { ArchiveDocument, ArchivalStatus } from "@/lib/types";
import { fetchDocuments } from "@/lib/documents";
import { CATEGORY_LABELS } from "@/lib/utils";
import { ArchiveTable } from "@/components/archive-table";
import { SectionHeading } from "@/components/stats-card";
import { ErrorState, LoadingState } from "@/components/states";

type Toast = { tone: "success" | "error" | "info"; text: string } | null;

function AdminDocumentsInner() {
  const params = useSearchParams();
  const [records, setRecords] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArchivalStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);

  const showToast = (tone: "success" | "error" | "info", text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadDocs = async () => {
    setLoading(true);
    setError(null);
    const { docs, error: loadError } = await fetchDocuments();
    setRecords(docs);
    setError(loadError);
    setLoading(false);
  };

  useEffect(() => {
    const id = window.setTimeout(() => void loadDocs(), 0);
    return () => window.clearTimeout(id);
  }, []);

  const filtered = useMemo(() => {
    let docs = [...records];
    if (statusFilter !== "all") {
      docs = docs.filter((d) =>
        statusFilter === "published" ? d.status === "published" : d.status === statusFilter
      );
    }
    if (categoryFilter !== "all") docs = docs.filter((d) => d.category === categoryFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return docs;
  }, [records, query, statusFilter, categoryFilter]);

  const updateRecord = async (doc: ArchiveDocument, updates: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, ...updates }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok) {
        showToast("success", `Updated “${doc.title}”.`);
        await loadDocs();
      } else {
        showToast(
          "error",
          json.error === "Unauthorized."
            ? "Admin writes are not configured on this server (missing ADMIN_SECRET)."
            : (json.error ?? "Update failed.")
        );
      }
    } catch {
      showToast("error", "The admin service could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = async (doc: ArchiveDocument) => {
    if (
      !window.confirm(
        `Delete “${doc.title}” and its indexed passages? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok) {
        setRecords((prev) => prev.filter((d) => d.id !== doc.id));
        showToast("success", `Deleted “${doc.title}”.`);
      } else {
        showToast(
          "error",
          json.error === "Unauthorized."
            ? "Admin writes are not configured on this server (missing ADMIN_SECRET)."
            : (json.error ?? "Delete failed.")
        );
      }
    } catch {
      showToast("error", "The admin service could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  const pendingAction = params.get("edit") ?? (params.get("new") ? "new" : null);

  const statusOptions: { value: ArchivalStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "published", label: "Public" },
    { value: "draft", label: "Restricted" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Archive Management"
          title="Documents"
          description="Catalogue records with metadata, ingestion status and source information. Edits run through secured server routes."
        />
        <button
          type="button"
          onClick={() =>
            showToast(
              "info",
              "Add the record's metadata to a new document via the admin API (see project README)."
            )
          }
          className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-terracotta px-6 font-semibold text-ivory shadow-card transition-colors hover:bg-terracotta/90"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Add document
        </button>
      </div>

      {pendingAction ? (
        <p className="mt-6 rounded-md border border-gold/60 bg-gold/10 px-4 py-3 text-sm text-navy-soft">
          Prototype note: inline editing forms open here; metadata updates run
          through the secured admin route.
        </p>
      ) : null}

      {/* Filters */}
      <div className="mt-8 grid gap-4 rounded-md border border-border-warm bg-paper p-5 shadow-card sm:grid-cols-[1fr_auto_auto]">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Search records
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, author or tag…"
            className="h-12 rounded-sm border border-border-strong bg-ivory px-4 text-base placeholder:text-slate-muted/70"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ArchivalStatus | "all")}
            className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-12 rounded-sm border border-border-strong bg-ivory px-3 text-sm font-medium text-navy-deep"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-6 text-sm text-slate-muted">
        <span className="font-semibold text-navy-deep">{filtered.length}</span> of{" "}
        {records.length} records shown
      </p>

      <div className="mt-4">
        {loading ? (
          <LoadingState label="Loading catalogue records…" />
        ) : error ? (
          <ErrorState title="Unable to load records" description={error} onRetry={loadDocs} />
        ) : (
          <ArchiveTable
            documents={filtered}
            actions={[
              {
                label: "Mark text ingested",
                onClick: (doc) => void updateRecord(doc, { ocr_status: "processed" }),
              },
              {
                label: "Restrict access",
                onClick: (doc) => void updateRecord(doc, { access: "restricted" }),
              },
              {
                label: busy ? "…" : "Delete",
                danger: true,
                onClick: (doc) => void deleteRecord(doc),
              },
            ]}
          />
        )}
      </div>

      {toast ? (
        <output
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md border px-5 py-3.5 text-sm font-semibold shadow-lift ${
            toast.tone === "success"
              ? "border-moss/40 bg-paper text-olive"
              : toast.tone === "error"
                ? "border-terracotta/40 bg-paper text-terracotta"
                : "border-border-strong bg-paper text-navy"
          }`}
        >
          {toast.text}
        </output>
      ) : null}
    </div>
  );
}

export default function AdminDocumentsPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-muted">Loading records…</div>}>
      <AdminDocumentsInner />
    </Suspense>
  );
}
