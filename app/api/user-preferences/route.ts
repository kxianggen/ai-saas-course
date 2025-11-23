import { createClient } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest){
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if(!user) {
        return NextResponse.json(
            { error: "You must be logged in to save preferences."},
            { status: 401 }
        );
    }

    const body = await request.json();
    const { categories, frequency, email } = body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: "Categories array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!frequency || !["daily", "weekly", "biweekly"].includes(frequency)) {
      return NextResponse.json(
        { error: "Valid frequency is required (daily, weekly, biweekly)" },
        { status: 400 }
      );
    }

    const {error: upsertError} = await supabase.from("user_preferences").upsert(
        {
        user_id: user.id,
        categories: categories,
        frequency: frequency,
        email: email,
        is_active: true }, 
        {onConflict:"user_id"});

    if (upsertError) {
        console.error("Error saving preferences:", upsertError);
        return NextResponse.json(
            { error: "Failed to save preferences" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: "Preferences saved and added to table"
    })
}