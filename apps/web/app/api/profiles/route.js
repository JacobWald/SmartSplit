import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, full_name, username")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load profiles" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || [], { status: 200 });
}
