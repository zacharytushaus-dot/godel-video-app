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
        <a href="https://www.linkedin.com/in/zach-tushaus/" target="_blank" className="flex items-center justify-center gap-4 mb-4 hover:opacity-80 transition-opacity cursor-pointer">
          <img 
            src="/headshot.jpeg" 
            alt="Zachary Tushaus" 
            className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-lg"
          />
          <div className="flex flex-col text-left">
            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight flex items-center gap-2">
              Zach
              <svg xmlns="http://www.w3.org/ খুঁ00/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
                <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a4 4 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path>
              </svg>
            </h1>
            <p className="text-zinc-400 text-sm">Godel Terminal</p>
          </div>
        </a>
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
        <h2 className="text-2xl font-bold mb-3 text-white">Let’s talk!</h2>
        <p className="text-zinc-400 mb-8 text-sm md:text-base">If the video caught your attention, grab a quick 10 minutes below to see if Godel makes sense to swap in.</p>
        
        {/* Calendly inline widget begin */}
        <div 
          className="calendly-inline-widget rounded-xl border border-zinc-800 overflow-hidden shadow-2xl" 
          data-url="https://calendly.com/zach-dl/30min?hide_event_type_details=1&hide_gdpr_banner=1&background_color=ececec" 
          style={{ minWidth: '320px', height: '600px' }}
        ></div>
        <script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async dangerouslySetInnerHTML={{ __html: '' }}></script>
        {/* Calendly inline widget end */}
      </div>
      
    </div>
  );
}