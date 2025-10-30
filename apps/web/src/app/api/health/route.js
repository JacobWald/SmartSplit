export async function GET() {
  return new Response(JSON.stringify({ ok: true, service: "SmartSplit API", ts: Date.now() }), {
    headers: { "content-type": "application/json" }
  });
}
