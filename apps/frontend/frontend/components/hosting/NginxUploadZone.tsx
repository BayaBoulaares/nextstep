// components/hosting/NginxUploadZone.tsx
"use client"

import * as React from "react"
import { Upload, File, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type FileStatus = "pending" | "uploading" | "done" | "error"
interface FileItem { file: File; status: FileStatus; error?: string }

export function NginxUploadZone() {
  const [files,    setFiles]    = React.useState<FileItem[]>([])
  const [dragging, setDragging] = React.useState(false)
  const inputRef                = React.useRef<HTMLInputElement>(null)

  const uploadFile = async (item: FileItem, index: number) => {
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: "uploading" } : f))

    try {
      const form = new FormData()
      form.append("file", item.file)
      form.append("path", "/")

      const res = await fetch("/api/auth/session")
      const sess = await res.json()

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hosting/nginx/files`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${sess.accessToken}` },
          body: form,
        }
      )

      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "done" } : f))
    } catch (e: any) {
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "error", error: e.message } : f))
    }
  }

  const addFiles = (newFiles: File[]) => {
    const items: FileItem[] = newFiles.map(f => ({ file: f, status: "pending" }))
    setFiles(prev => {
      const updated = [...prev, ...items]
      // Lancer uploads
      items.forEach((item, i) => {
        const idx = prev.length + i
        setTimeout(() => uploadFile(updated[idx], idx), 0)
      })
      return updated
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="space-y-3">
      {/* Zone drop */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragging
            ? "border-[#0a7fcf] bg-[#0a7fcf]/5"
            : "border-border hover:border-[#0a7fcf]/50 hover:bg-muted/30"
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-[13px] font-medium">
          Glissez vos fichiers ici ou cliquez pour sélectionner
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          HTML, CSS, JS, images — déposés dans <code>/opt/app-root/src</code>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* Liste fichiers */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2
              border border-border rounded-lg bg-card text-[12px]">
              <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{item.file.name}</span>
              <span className="text-muted-foreground">
                {(item.file.size / 1024).toFixed(1)} KB
              </span>
              {item.status === "uploading" &&
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0a7fcf]" />}
              {item.status === "done" &&
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {item.status === "error" &&
                <XCircle className="w-3.5 h-3.5 text-red-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}