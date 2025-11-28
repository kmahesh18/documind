"use client";

import { FileList } from "@/components/dashboard/file-list";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Link from "next/link";

export default function FilesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Files</h1>
          <p className="text-neutral-400 mt-2">
            Manage your uploaded documents and knowledge base
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            <Upload className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        </Link>
      </div>

      <FileList />
    </div>
  );
}
