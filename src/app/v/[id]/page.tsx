import { notFound } from "next/navigation";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

export default async function ViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let videoUrl = "";

    let fileExists = false;
    try {
      videoUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: "godel-video", Key: `${id}.mp4` }), { expiresIn: 3600 });
      // To strictly check if it exists in S3 without just blindly generating a URL
      await s3Client.send(new HeadObjectCommand({ Bucket: "godel-video", Key: `${id}.mp4` }));
      fileExists = true;
    } catch {
      try {
        videoUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: "godel-video", Key: `${id}.mov` }), { expiresIn: 3600 });
        await s3Client.send(new HeadObjectCommand({ Bucket: "godel-video", Key: `${id}.mov` }));
        fileExists = true;
      } catch {
        try {
          // One final check just for the raw initial ID file format since your browser prints that exact filename without extension
          videoUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: "godel-video", Key: `${id}` }), { expiresIn: 3600 });
          await s3Client.send(new HeadObjectCommand({ Bucket: "godel-video", Key: `${id}` }));
          fileExists = true;
        } catch {
        // Doesn't exist
        }
      }
    }

    if (!fileExists) {
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
        <h2 className="text-2xl font-bold mb-3 text-white">Let’s talk.</h2>
        <p className="text-zinc-400 mb-8 text-lg">If the video caught your attention, grab a quick 10 minutes below. We can map out your current setup and see if Godel makes sense to swap in.</p>
        
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