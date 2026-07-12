import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const REPLICATE_KEY = process.env.REPLICATE_API_KEY || ""
const MODEL_VERSION = "2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789"

// Rate limiting: 3 Generierungen pro User pro Stunde
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
function rateLimited(key: string): boolean {
  const now = Date.now()
  const b = rateBuckets.get(key)
  if (!b || now > b.resetAt) { rateBuckets.set(key, { count: 1, resetAt: now + 3_600_000 }); return false }
  b.count++; return b.count > 3
}

const STYLE_PROMPTS: Record<string, { prompt: string; negative: string }> = {
  graffiti: {
    prompt: "full body comic graffiti style avatar, street art illustration, bold black outlines, urban cartoon character, athletic ping pong player holding red paddle, dynamic action stance, spray paint splats, bold vivid colors, hot pink and black color scheme, dark background, banksy-inspired, exaggerated comic proportions, wearing anthracite black sports shirt with P logo and PLAYER text, black shorts, pink sneakers",
    negative: "photorealistic, blurry, neon glow, ugly, deformed, extra limbs, low quality, watermark, text overlay"
  },
  comic: {
    prompt: "full body classic comic book style avatar, bold cel-shading, thick black outlines, superhero proportions, athletic ping pong player in action pose with red paddle, halftone dots, bold primary colors with pink accent, dark background, wearing anthracite sports shirt with P logo and PLAYER text, dynamic movement lines",
    negative: "photorealistic, blurry, neon, ugly, deformed, extra limbs, low quality, watermark"
  },
  anime: {
    prompt: "full body anime style avatar, clean line art, flat colors, athletic male ping pong player, determined expression, holding red ping pong paddle, dynamic action pose, dark background, wearing anthracite sports shirt with P logo and PLAYER text, pink accent colors, manga style",
    negative: "photorealistic, blurry, neon, ugly, deformed, extra limbs, low quality, watermark, western cartoon"
  },
  pixel: {
    prompt: "full body pixel art avatar, 16-bit retro game style, athletic ping pong player character sprite, holding paddle, action pose, dark background, pixel perfect outlines, pink and black color palette, wearing sports uniform with P logo",
    negative: "photorealistic, blurry, anti-aliased, smooth, neon, ugly, deformed, low quality"
  },
  noir: {
    prompt: "full body noir comic style avatar, black and white with pink accent, high contrast ink illustration, gritty urban style, athletic ping pong player, dramatic lighting, bold outlines, dark cinematic background, wearing sports shirt with P logo",
    negative: "photorealistic, colorful, neon, blurry, ugly, deformed, extra limbs, low quality, watermark"
  },
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_KEY) return NextResponse.json({ error: "REPLICATE_API_KEY nicht gesetzt" }, { status: 500 })

  // Diese Route hatte KEINE Anmeldepflicht, und das Rate-Limit hing an einer
  // userId, die der Client selbst mitschickte — wer sie rotierte, konnte
  // unbegrenzt Replicate-Credits verbrennen. Auf fremde Kosten.
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { imageDataUrl, style = "graffiti" } = await req.json()
  if (!imageDataUrl) return NextResponse.json({ error: "imageDataUrl fehlt" }, { status: 400 })

  // Rate-Limit an der ECHTEN Nutzer-ID aus der Session, nicht an einer vom Client
  // gelieferten Zahl.
  if (rateLimited(user.id)) return NextResponse.json({ error: "Limit erreicht (3/Stunde). Bitte später nochmals." }, { status: 429 })

  const sp = STYLE_PROMPTS[style] || STYLE_PROMPTS.graffiti

  try {
    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Token ${REPLICATE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          image: imageDataUrl,
          prompt: sp.prompt,
          negative_prompt: sp.negative,
          num_inference_steps: 30,
          guidance_scale: 5.0,
          ip_adapter_scale: 0.8,
          controlnet_conditioning_scale: 0.8,
        }
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!startRes.ok) {
      const err = await startRes.json()
      return NextResponse.json({ error: err.detail || "Replicate Fehler" }, { status: startRes.status })
    }

    let prediction = await startRes.json()
    const pollUrl = prediction.urls?.get

    // Polling (max 90s)
    for (let i = 0; i < 30; i++) {
      if (prediction.status === "succeeded") break
      if (prediction.status === "failed" || prediction.status === "canceled") {
        return NextResponse.json({ error: prediction.error || "Generierung fehlgeschlagen" }, { status: 500 })
      }
      await new Promise(r => setTimeout(r, 3000))
      const pollRes = await fetch(pollUrl, { headers: { "Authorization": `Token ${REPLICATE_KEY}` } })
      prediction = await pollRes.json()
    }

    if (prediction.status !== "succeeded") return NextResponse.json({ error: "Timeout" }, { status: 504 })

    const output = prediction.output
    const imageUrl = Array.isArray(output) ? output[0] : output

    return NextResponse.json({ imageUrl })
  } catch (e) {
    console.error("Avatar generate error:", e)
    return NextResponse.json({ error: "Generierungsfehler" }, { status: 500 })
  }
}
