import { fetchArticles } from "@/lib/news";
import { inngest } from "../client";
import { marked } from "marked";
import { sendEmail } from "@/lib/email";

export const scheduledNewsletter = inngest.createFunction(
    { id: "newsletter/scheduled" },
    { event: "newsletter.schedule" },
    async ({ event, step, runId }) => {

        const categories = event.data.categories;
        const allArticles = await step.run("fetch-news", async () => {
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

        const newsletterContent = summary.choices[0].message.content;

        if(!newsletterContent) {
            throw new Error("Failed to generate newsletter content");
        }

        const htmlResult = await marked(newsletterContent);
        
        await step.run("send-email", async() => {
            await sendEmail(event.data.email, 
            event.data.categories.join(", "), 
            allArticles.length,
            htmlResult
        );
        })

        return {};
    }
);