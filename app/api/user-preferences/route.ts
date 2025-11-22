import { createClient } from "@/lib/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest){
    const supabase = await createClient()
}