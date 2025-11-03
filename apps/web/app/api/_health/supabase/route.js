import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = getServerSupabase();
    // simple test query
    const { data, error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      sampleCount: data?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
