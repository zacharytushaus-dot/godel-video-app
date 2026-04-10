import { notFound } from "next/navigation";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

export default async function ViewerPage({ params }: { params: Promise<{ file: string }> }) {
  const resolvedParams = await params;
  const { file } = resolvedParams;

  let videoUrl = "";

  try {
    const command = new GetObjectCommand({
      Bucket: "godel-video",
      Key: file,
    });
    videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center pt-12 font-sans">
      
      {/* Header Profile */}
      <div className="w-full max-w-4xl px-4 flex flex-col items-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold border-2 border-blue-400">
            Z
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
              Zach
            </h1>
            <p className="text-zinc-400 text-sm">Godel Terminal</p>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="w-full max-w-4xl px-4 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <video 
          controls 
          autoPlay 
          className="w-full h-auto aspect-video bg-black object-contain"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Calendly / CTA */}
      <div className="mt-12 w-full max-w-xl px-4 text-center pb-24">
        <h2 className="text-2xl font-bold mb-3 text-white">Let's cut the bloat.</h2>
        <p className="text-zinc-400 mb-8 text-sm">Find time on my calendar below for a brief tear-down of your current terminal setup.</p>
        
        <div className="h-[500px] w-full bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-800">
          <div className="text-center p-6">
            <p className="text-zinc-500 italic mb-4">[Calendly Embed Code Goes Here]</p>
            <a href="https://calendly.com" target="_blank" className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-500 font-semibold transition">
              Book a Demo
            </a>
          </div>
        </div>
      </div>
      
    </div>
  );
}