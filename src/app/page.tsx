"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("video", file);
    formData.append("name", name);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <h1 className="text-4xl font-bold mb-8">Godel Video Uploader</h1>

      <form onSubmit={handleUpload} className="flex flex-col gap-4 w-full max-w-md">
        <input 
          type="text" 
          placeholder="Target Label (e.g. Rich - Hunter Capital)" 
          className="p-3 bg-zinc-800 rounded border border-zinc-700"
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          type="file" 
          accept="video/mp4,video/quicktime" 
          onChange={(e) => setFile(e.target.files?.[0] || null)} 
          className="p-3 bg-zinc-800 rounded border border-zinc-700"
        />
        
        <button 
          type="submit" 
          disabled={loading || !file || !name}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 font-bold p-3 rounded transition"
        >
          {loading ? "Processing..." : "Generate Loom Killer"}
        </button>
      </form>

      {result && (
        <div className="mt-12 w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-green-400">Ready!</h2>
          <img src={result.gifUrl} alt="Preview" className="w-full rounded mb-4 shadow-lg border border-zinc-700" />
          
          <p className="text-sm text-zinc-400 mb-2">Drag this GIF into your email ^</p>
          
          <div className="w-full mt-4 p-4 bg-black rounded">
            <p className="text-xs text-zinc-500 mb-1">Watch Link:</p>
            <a href={result.watchUrl} target="_blank" className="text-blue-400 break-all text-sm hover:underline">
              {result.watchUrl}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}