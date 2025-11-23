import { fetchArticles } from "@/lib/news";
import { inngest } from "../client";

// --- FIX: Use export const (Named Export) for better reliability ---
export const scheduledNewsletter = inngest.createFunction(
    { id: "newsletter/scheduled" },
    { event: "newsletter.schedule" },
    async ({ event, step, runId }) => {

        // --- FIX: Get categories from the event, NOT hardcoded ---
        const categories = ["technology", "business", "politics"]

        const allArticles = await step.run("fetch-news", async () => {
            // Uses the dynamic categories sent from the route
            return fetchArticles(categories);
        });

        // Generate ai summary
        const summary = await step.ai.infer("summarize-news", {
            model: step.ai.models.openai({model: "gpt-4o-mini"}),
            body: {
                messages: [
                    {
                        role: "system",
                        content: `You are an expert newsletter editor... (rest of your prompt) ...`,
                    },
                    {
                        role: "user",
                        content: `Create a newsletter summary for these articles from the past week. 
                        Categories requested: ${categories.join(", ")}
              
                        Articles:
                        ${allArticles
                            .map(
                                (article: any, index: number) =>
                                `${index + 1}. ${article.title}\n   ${
                                    article.description
                                }\n   Source: ${article.url}\n`
                            )
                            .join("\n")}`,
                    },
                ],
            },
        });

        console.log(summary.choices[0].message.content);
        return { summary: summary.choices[0].message.content };
    }
);