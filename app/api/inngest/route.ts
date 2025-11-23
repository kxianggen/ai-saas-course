import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { fetchArticles } from "@/lib/news"; // Keep your news import

// --- DEFINING THE FUNCTION RIGHT HERE ---
const scheduledNewsletter = inngest.createFunction(
    { id: "newsletter/scheduled" },
    { event: "newsletter.schedule" },
    async ({ event, step }) => {
        console.log("🔥 FUNCTION TRIGGERED SUCCESSFULLY!"); 
        console.log("Data received:", event.data);
        return { message: "It works!" };
    }
);
// ----------------------------------------

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scheduledNewsletter, // Use the variable we just created above
  ],
});